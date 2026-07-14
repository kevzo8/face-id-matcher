# CPS-220: SPIKE — Auto-Detect ID Type and OCR Extraction

**Parent:** CPS-91 — Core Platform Shared

**Goal:** Research, benchmark, and prototype document AI tools for Philippine government ID classification and automatic PII extraction (Passport, PhilID, UMID, Driver's License, Postal ID, SSS/GSIS ID, PRC ID, etc.). Compare current AWS Bedrock setup with alternative OCR tools for real-world Philippine ID conditions (low-light, low-quality).

---

## Executive Summary

| Priority | Option | Why | Est. Monthly (10K) |
|----------|--------|-----|-------------------:|
| **🥇 Best PH ID support** | **Verihubs OCR** | 9+ PH ID types, auto-detect, real-time capture SDK, 99% accuracy claim | ~$500–$1,500 |
| **🥈 Best cloud LLM** | **Amazon Bedrock Claude** | Most flexible — any PH ID via prompt, excellent low-quality handling, context-aware extraction | ~$18 |
| **🥉 Cheapest cloud** | **Tencent Cloud** | $0.001–$0.01/doc, separate APIs for each PH ID type, low latency (1-3s) | ~$10–$100 |
| **🆓 Best OSS** | **PaddleOCR** | Zero per-doc cost, best Asian language support, GPU-capable, no vendor lock-in | ~$20–$100 (server) |
| **🏆 Best all-in-one** | **OpenBiometrics** | Covers CPS-220 (OCR) + CPS-221 (face) + CPS-222 (liveness) in one open-source platform | ~$20–$100 (server) |
| **✅ Current Implementation** | **AWS Rekognition + GROQ/OpenAI** | Raw OCR via AWS Rekognition, structured extraction via GROQ (llama-3.3-70b) or OpenAI (gpt-4o-mini). Multi-ID cross-referencing, PH ID type registry 0-13. | ~$1–$5 (Rekognition) + ~$0.50 (GROQ) |

---

## Table of Contents

1. [Overview](#1-overview)
2. [Option A: Amazon Bedrock (Multimodal AI)](#2-option-a-amazon-bedrock-multimodal-ai)
3. [Option B: AWS Textract](#3-option-b-aws-textract)
4. [Option C: Philippine-Focused OCR Alternatives](#4-option-c-philippine-focused-ocr-alternatives)
5. [Comparison Matrix](#5-comparison-matrix)
6. [Strict JSON Prompt Template for Bedrock](#6-strict-json-prompt-template-for-bedrock)
7. [Integration into Existing App](#7-integration-into-existing-app)
8. [POC Plan](#8-poc-plan)
9. [References](#9-references)

---

## 1. Overview

The goal is to automatically detect the ID type and extract structured PII (full name, date of birth, address, ID number, etc.) from an uploaded or camera-captured image of a Philippine government ID.

### Supported Philippine IDs

| ID Type | Abbreviation | Issuer |
|---------|-------------|--------|
| Philippine National ID | PhilID / PhilSys | PSA |
| Unified Multi-Purpose ID | UMID | SSS/GSIS |
| Passport | — | DFA |
| Driver's License | — | LTO |
| Postal ID | — | PHLPost |
| SSS ID | SSS | SSS |
| GSIS ID | GSIS | GSIS |
| TIN ID | TIN | BIR |
| PRC ID | PRC | PRC |
| Senior Citizen ID | — | OSCA |
| Voter's ID | — | COMELEC |

### Extraction Challenges

| Challenge | Impact |
|-----------|--------|
| Bilingual content (Filipino + English) | Field mapping complexity |
| Variable layouts (same ID type, different versions) | Region-specific formats |
| Holographic overlays / reflective coatings | OCR artifacts |
| Low print quality / small font sizes | Missing or incorrect fields |
| Damage / wear on physical cards | Data loss |
| Non-standardized field names across ID types | Mapping to unified schema |

---

## 2. Option A: Amazon Bedrock (Multimodal AI)

**Status:** Current setup — evaluate as primary engine

### Approach

Use a multimodal foundation model (e.g., Anthropic Claude Sonnet 4, Amazon Nova Lite/Pro) hosted on Amazon Bedrock to:
1. **Classify** the ID type from the image
2. **Extract** structured PII fields into a strict JSON schema

### Models Available

| Model | Strengths | Cost (per 1K input tokens) | Cost (per 1K output tokens) |
|-------|-----------|---------------------------|----------------------------|
| Claude Sonnet 4 | Best balance of speed/accuracy | ~$0.003 | ~$0.015 |
| Claude Sonnet 4.5 | 1M context window | ~$0.01 | ~$0.05 |
| Claude Opus 4 | Highest accuracy, slower | ~$0.015 | ~$0.075 |
| Amazon Nova Lite | Fast, cheap, good for OCR | ~$0.00006 | ~$0.00024 |
| Amazon Nova Pro | Better than Lite for documents | ~$0.0008 | ~$0.0032 |

**Recommended:** Claude Sonnet 4 for best accuracy/cost balance. Nova Lite for high-volume, cost-sensitive workloads.

### Pricing

| Volume | Claude Sonnet 4 (est.) | Nova Lite (est.) |
|--------|----------------------|------------------|
| Per document | ~$0.0018 | ~$0.00006 |
| 10K/month | ~$18 | ~$0.60 |
| 100K/month | ~$180 | ~$6 |

### Pros & Cons

| ✅ Pros | ❌ Cons |
|---------|---------|
| Handles any ID type — no per-type training needed | Higher cost per document than specialized OCR |
| Multimodal — reads both text and visual layout | Model variability — prompts need careful engineering |
| No per-ID-type training or configuration | Image token costs are higher than text |
| Easy to add new ID types (just update prompt) | Requires AWS Bedrock access + IAM |
| Can correct OCR errors using context understanding | Slower than specialized OCR (~3-8s per doc) |
| Returns confidence scores per field | Output format can drift without strict prompting |

---

## 3. Option B: AWS Textract

**Status:** Standard OCR baseline — evaluate for Philippine ID support

### Capabilities

| API | Purpose | Philippine ID Support |
|-----|---------|----------------------|
| `AnalyzeID` | Identity document extraction | ❌ US-only (driver licenses + passports) |
| `AnalyzeDocument` (with Queries) | General document extraction via natural language queries | ✅ Can extract any field with custom queries |
| `DetectDocumentText` | Raw OCR text detection | ✅ Works on any document, no structured output |

### Critical Limitation

**`AnalyzeID` does NOT support Philippine IDs.** It only supports US driver's licenses and US passports. For Philippine IDs, you would need:
- `AnalyzeDocument` with Queries — slower, requires crafting queries per field per ID type
- Or use it as a raw OCR layer then pass text to Bedrock for structured extraction

### Hybrid Approach: Textract + Bedrock

```
ID Image → Textract (raw OCR + layout) → Text/Markdown → Bedrock (Claude) → Structured JSON
```

### Pricing

| Operation | Cost |
|-----------|------|
| `AnalyzeDocument` (with Layout) | $0.015/page |
| `AnalyzeID` | $0.015/page (US IDs only) |
| `DetectDocumentText` | $0.0015/page |

### Pros & Cons

| ✅ Pros | ❌ Cons |
|---------|---------|
| Accurate raw OCR on standard documents | No native Philippine ID support |
| Detects tables, forms, signatures | Queries must be hand-crafted per ID type |
| Confidence scores per detected element | No ID type classification — need separate step |
| Lower cost than Bedrock for raw OCR (~$0.0015/page) | Layout variability in Philippine IDs reduces accuracy |
| Mature AWS service with broad regional availability | Two-step (Textract → Bedrock) adds latency and cost |

---

## 4. Option C: Philippine-Focused OCR Alternatives

### Recommended Primary: Verihubs OCR

**Why:** Purpose-built for Philippine IDs, 99% accuracy claimed, supports all major PH ID types, has capture SDK.

| Spec | Value |
|------|-------|
| **Type** | REST API + Mobile SDK (Android/iOS/Web fallback) |
| **Supported IDs** | PhilSys, UMID, SSS, TIN, Driver's License, Passport, PRC, Postal, Voter's ID |
| **Accuracy** | 99% claimed (tested on Philippine IDs specifically) |
| **Capture SDK** | Real-time guidance (edge detect, glare check, auto-capture), on-device |
| **Low-quality handling** | Blurry, low-resolution, low-contrast — purpose-built for PH conditions |
| **Pricing** | Contact vendor (est. ~$0.05–$0.15/check based on market rates) |
| **Integration** | Simple REST API (curl/axios), also native SDKs |

**Key differentiator:** The capture SDK provides real-time visual guidance (edge detection, glare/lighting check, auto-trigger) — this addresses the #1 cause of OCR failure: poor image quality.

### Alternative A: ZOLOZ eKYC SaaS

**Why:** Full eKYC stack with OCR + liveness + face matching. Already supports Philippine IDs.

| Spec | Value |
|------|-------|
| **Type** | SaaS API + Mobile SDK (Android/iOS/HarmonyOS) |
| **Supported IDs** | PhilSys, UMID, Driver's License, Passport, TIN, SSS, GSIS, Postal, PRC, Senior Citizen |
| **OCR + Liveness** | Integrated platform — OCR, liveness, and face matching in one SDK |
| **Updates** | Actively maintained — recent Middle Name field optimization for PH IDs (Feb 2026) |
| **Pricing** | Contact ZOLOZ (est. ~$0.10–$0.30/check for full eKYC) |

**Key differentiator:** Combined OCR + liveness + face match in one vendor — simplifies architecture if ZOLOZ is used for CPS-222 (liveness) too.

### Alternative B: Tencent Cloud OCR

**Why:** Individual dedicated APIs for each Philippine ID type — potentially high accuracy per type.

| Spec | Value |
|------|-------|
| **Type** | REST API (per-ID-type endpoints) |
| **Supported IDs** | `RecognizePhilippinesTinIDOCR`, `RecognizePhilippinesSssIDOCR`, and similar |
| **Strengths** | Purpose-trained per ID type, Tencent's ML infrastructure |
| **Limitations** | Requires separate API for each ID type; must determine type first |
| **Pricing** | ~$0.001–$0.01/request per Tencent standard OCR rates |

**Key differentiator:** If SVI already uses Tencent Cloud or Alibaba Cloud infrastructure, this integrates easily. Individual models per ID type likely yield higher accuracy than a single general model.

### Alternative C: AccuAuth (Philippine ID OCR)

**Spec:** REST API supporting ID, UMID, Passport, DL, SSS, TIN, Voter, Health Card, Postal. Simple JSON response with card type detection + extracted fields.

### Alternative D: Google Document AI

**Why:** Best pre-trained document processors in the market — but Philippine ID support requires the Custom Extractor, not pre-built identity parsers.

| Spec | Value |
|------|-------|
| **Type** | Cloud REST API (processor library) |
| **Pre-built ID parsers** | US Driver License, US Passport, French DL/National ID only — **no PH ID support** |
| **Custom Extractor** | Train your own model for PH IDs — uses foundation model v1.5, no ML expertise needed |
| **Pricing (custom)** | $0.065/page (prediction), $0.004/page (training) |
| **OCR base** | $1.50/1K pages (Document OCR processor) |
| **Strengths** | Gemini-powered layout parsing, excellent on complex documents, 200+ language OCR |
| **Best for** | Teams already in GCP ecosystem; custom extractor can be trained on PH ID samples |

### Alternative E: Mindee International ID OCR

**Why:** Pre-trained international ID OCR with simple REST API. SOC 2 Type II certified. SDKs for Python, Node.js, Java, Ruby, PHP.

| Spec | Value |
|------|-------|
| **Type** | Cloud REST API |
| **Supported IDs** | International ID cards, driver's licenses, passports — custom models possible |
| **PH ID support** | Not specifically advertised, but supports international ID formats |
| **Pricing** | €44–€584/month depending on tier (6K–120K credits/year) |
| **Per-doc cost** | ~€0.05–€0.088/credit (1 credit = 1 page) |
| **Free trial** | 14 days, no credit card |
| **SDKs** | Python, Node.js, Java, Ruby, PHP |
| **Certification** | SOC 2 Type II, GDPR compliant |

### Alternative F: Azure Document Intelligence

**Why:** Competitive pricing ($0.01/page for pre-built models), fast custom model training (~30 min), good ID support. But PH-specific IDs not natively supported.

| Spec | Value |
|------|-------|
| **Type** | Cloud REST API |
| **Pre-built** | Invoices, receipts, IDs (US/European focus), W-2s |
| **Custom models** | Train in ~30 minutes with as few as 5 samples |
| **Pricing (Read)** | $0.001/page |
| **Pricing (Pre-built)** | $0.01/page |
| **Pricing (Custom)** | $0.01/page + training |
| **Best for** | Teams in Azure ecosystem; fast custom model training for PH IDs |

### Alternative G: Open Source OCR Stack (Self-Hosted)

**Why:** Zero marginal cost, runs on your infrastructure, no vendor lock-in. Multiple engines for different strengths.

| Engine | Strengths | Weaknesses |
|--------|-----------|------------|
| **PaddleOCR** | Best for Asian languages, 80+ languages, GPU support, layout analysis (PPStructure) | ~2GB (PyTorch dependency) |
| **PaddleOCR-VL** | Latest vision-language model, 0.9B params, best-in-class OCR accuracy | Requires GPU for reasonable speed |
| **EasyOCR** | 80+ languages, easy API, good accuracy | Slower than PaddleOCR |
| **Tesseract** | 100+ languages, lightweight (~500MB) | Lower accuracy on complex layouts |
| **Docling** | PDF layout analysis, table extraction, structured Markdown/JSON output | Python-only |

**Recommended Stack:** PaddleOCR (primary) + Tesseract (fallback) + Bedrock Claude (structured extraction from OCR text)

**Cost:** $0/txn + server compute (~$20–100/month for a VM with GPU)

| ✅ Pros | ❌ Cons |
|---------|---------|
| Zero per-transaction cost | Requires GPU server for reasonable speed |
| Full control over data — no external API calls | Setup and maintenance effort |
| No vendor lock-in | Lower accuracy than cloud APIs on complex documents |
| Offline capable | No capture SDK — need custom camera UI |

### Alternative H: OCRBase (Self-Hosted PaddleOCR-VL)

**Why:** modern self-hosted platform with PaddleOCR-VL + structured JSON extraction via LLM. Queue-based processing with WebSocket updates.

| Spec | Value |
|------|-------|
| **Type** | Self-hosted (Docker + Bun + PostgreSQL + Redis + MinIO) |
| **OCR engine** | PaddleOCR-VL 1.5 (0.9B params) |
| **Extraction** | Define JSON schema → OCR → LLM extracts structured data |
| **Scalability** | Queue-based (BullMQ), WebSocket progress, S3 storage |
| **Cost** | Free (open source, MIT license) + hosting |
| **GitHub stars** | 990+ |

### Alternative I: OpenBiometrics (Open Source All-in-One)

**Why:** Combines face recognition (SFace, 99.4% LFW), passive/active liveness (MiniFASNet), AND document processing (MRZ parsing, OCR) in a single open-source platform. MIT/Apache 2.0 licensed.

| Spec | Value |
|------|-------|
| **Type** | Self-hosted (Docker, FastAPI + TypeScript frontend) |
| **Document processing** | MRZ parsing (ICAO 9303), OCR, document detection for passports/IDs |
| **Face recognition** | SFace embeddings (37MB), 99.4% LFW accuracy |
| **Liveness** | MiniFASNet passive + 6 active presets (blink, smile, head-turn, etc.) |
| **Edge ready** | Docker, Jetson, ARM via ONNX Runtime/TensorRT |
| **License** | MIT / Apache 2.0 — no commercial restrictions |
| **Cost** | Free + hosting |

**Key differentiator:** One platform covers CPS-220 (document OCR + MRZ), CPS-221 (face recognition), and CPS-222 (liveness) — dramatically simplifying the architecture. However, accuracy on Philippine IDs specifically would need testing.

---

## 5. Comparison Matrix

| Criterion | Bedrock Claude | Textract | Verihubs | ZOLOZ | Tencent | Google Doc AI | Mindee | Azure DI | Open Source (Paddle) | OpenBiometrics |
|-----------|:----------:|:-------:|:--------:|:-----:|:-------:|:------------:|:------:|:--------:|:-------------------:|:--------------:|
| **Type** | Multimodal LLM | OCR service | PH-focused OCR | Full eKYC | Per-ID OCR | Doc AI platform | ID OCR API | Doc AI platform | Self-hosted OCR | Open source all-in-one |
| **PH ID support** | ✅ Any (prompt) | ❌ Limited | ✅ 9+ types | ✅ 11+ types | ✅ Separate APIs | ❌ (custom only) | ⚠️ Generic | ❌ (custom only) | ✅ Trainable | ⚠️ MRZ only |
| **ID classification** | ✅ Built-in | ❌ Separate | ✅ Auto | ✅ Auto | ❌ Specify | ⚠️ Custom | ✅ Auto | ⚠️ Custom | ❌ Separate | ✅ Document detect |
| **Low-quality handling** | ✅ Excellent | ⚠️ Moderate | ✅ 99% | ✅ Good | ⚠️ Moderate | ✅ Good | ⚠️ Moderate | ⚠️ Moderate | ⚠️ Variable | ⚠️ Unknown |
| **Capture SDK** | ❌ None | ❌ None | ✅ Real-time | ✅ Native | ❌ None | ❌ None | ❌ None | ❌ None | ❌ None | ❌ None |
| **Setup time** | 1-2 days | 1-2 days | 1-2 days | 3-5 days | 1-2 days | 2-3 days | 1-2 days | 2-3 days | 3-5 days | 1-2 days |
| **Per-doc cost** | ~$0.0018 | ~$0.015 | ~$0.05-0.15 | ~$0.10-0.30 | ~$0.001-0.01 | ~$0.065 | ~€0.05 | ~$0.01 | ~$0 + server | ~$0 + server |
| **Monthly (10K)** | ~$18 | ~$150 | ~$500-1.5K | ~$1K-3K | ~$10-100 | ~$650 | ~€500+ | ~$100 | ~$20-100 | ~$20-100 |
| **Latency** | 3-8s | 5-10s | 1-3s | 2-5s | 1-3s | 3-8s | 1-3s | 2-5s | 1-5s | 1-5s |
| **Vendor lock-in** | Medium | Medium | High | High | Medium | High | Medium | High | None | None |
| **Covers CPS-221** | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Face recog |
| **Covers CPS-222** | ❌ | ❌ | ❌ | ✅ Liveness | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Liveness |

---

## 6. Strict JSON Prompt Template for Bedrock

```typescript
const ID_EXTRACTION_PROMPT = `You are an expert document analyzer for Philippine government IDs.
Analyze the image and extract information into a strict JSON structure.

First, classify the ID type from this list:
- philsys_national_id (PhilID / Philippine National ID)
- umid (Unified Multi-Purpose ID)
- passport (Philippine Passport)
- drivers_license (LTO Driver's License)
- sss_id (SSS ID)
- gsis_id (GSIS ID)
- tin_id (BIR TIN ID)
- prc_id (PRC ID)
- postal_id (Philippine Postal ID)
- senior_citizen_id (OSCA ID)
- voters_id (COMELEC Voter's ID)
- other
- unknown

Then extract all visible fields. Return ONLY valid JSON with NO additional text.
If a field is not visible or illegible, set it to null.

{
  "id_type": "<classified ID type>",
  "id_type_confidence": <0.0 to 1.0>,
  "extracted_fields": {
    "full_name": "<full name as printed on ID>",
    "first_name": "<first / given name>",
    "middle_name": "<middle name or null>",
    "last_name": "<last / family name>",
    "suffix": "<Jr., Sr., III or null>",
    "date_of_birth": "<YYYY-MM-DD or null>",
    "place_of_birth": "<place or null>",
    "gender": "<MALE / FEMALE / null>",
    "nationality": "<nationality or null>",
    "address": "<full address as printed>",
    "id_number": "<primary ID / reference number>",
    "date_of_issue": "<YYYY-MM-DD or null>",
    "date_of_expiry": "<YYYY-MM-DD or null>",
    "blood_type": "<blood type or null>",
    "restrictions": "<restrictions or null>",
    "height": "<height in cm or null>",
    "weight": "<weight in kg or null>",
    "mothers_maiden_name": "<or null>",
    "civil_status": "<SINGLE / MARRIED / null>",
    "profession": "<profession or null>"
  },
  "raw_text_found": "<any additional text visible on the ID>",
  "warnings": [
    "<list any issues: blurry, glare, cropped, low resolution, etc.>"
  ]
}`;
```

### Backend Implementation (Python/FastAPI)

```python
import boto3
import json
import base64

bedrock = boto3.client("bedrock-runtime", region_name="ap-southeast-1")

def extract_id_data(image_base64: str) -> dict:
    response = bedrock.invoke_model(
        modelId="us.anthropic.claude-sonnet-4-20250514-v1:0",
        contentType="application/json",
        body=json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 4096,
            "messages": [{
                "role": "user",
                "content": [
                    {"type": "text", "text": ID_EXTRACTION_PROMPT},
                    {"type": "image", "source": {
                        "type": "base64",
                        "media_type": "image/jpeg",
                        "data": image_base64
                    }}
                ]
            }]
        })
    )
    result = json.loads(response["body"].read())
    content = result["content"][0]["text"]
    return json.loads(content)
```

---

## 7. Integration into Existing App

### Actual Implementation: Face ID Matcher POC

The spike resulted in a working POC at `face-id-matcher` with the following architecture:

#### OCR Pipeline

```
ID Images (single or multiple entries) → AWS Rekognition (/ocr/detect) → raw text_lines
Raw text → GROQ or OpenAI (/ocr/parse) → structured JSON with PH ID type registry
```

- **Raw OCR:** AWS Rekognition `DetectText` API (`/ocr/detect` endpoint)
- **AI Parsing:** GROQ (llama-3.3-70b-versatile) or OpenAI (gpt-4o-mini) via `/ocr/parse`
- **Multi-ID Support:** "OCR All" captures each image individually (not stitched), results merged per entry
- **PH ID Type Registry:** 14 types (0-13) from Other → Philippines Driver's License
- **Field Validation:** AI prompt enforces valid blood_type (A/B/AB/O ±), gender (M/F), civil_status (S/M/D/W), birth_date (yyyy-mm-dd)
- **Cross-Referencing:** When multiple IDs uploaded, AI reconciles discrepancies across entries

#### Frontend (React/TypeScript)

| Component | Purpose |
|-----------|---------|
| `ImageCapture.tsx` | Camera capture with ID mockups (front: photo box + lines; back: signature line; selfie: head silhouette) |
| `App.tsx` (OCR tab) | Multi-ID entry management, per-entry OCR buttons, OCR All / Parse All, 2-column raw+AI result display |
| `App.tsx` (Liveness tab) | Selfie mockup with 3 side-by-side test type buttons (Active, Passive, Upload), Back navigation |

#### Backend (Python/FastAPI)

| Endpoint | Purpose |
|----------|---------|
| `POST /ocr/detect` | Takes base64 image + provider, returns raw text lines from AWS Rekognition |
| `POST /ocr/parse` | Takes texts array + provider + optional api_key, returns structured JSON via GROQ/OpenAI |

#### Sidebar Configuration

- OCR provider selector (AWS Rekognition, Google Doc AI, Azure DI, Tencent, Mindee, etc.)
- AI parser selector (GROQ or OpenAI) — API keys set via `GROQ_API_KEY` / `OPENAI_API_KEY` env vars

#### Key Design Decisions

1. **Per-image OCR instead of stitching** — Each ID image is OCR'd individually to avoid composite image quality loss
2. **Deduplication** — OCR results are deduplicated before sending to AI to prevent redundant parsing
3. **Field validation in prompt** — AI is instructed to only extract values that literally appear in OCR text, never invent
4. **Separate raw + AI display** — User sees both the raw OCR text (unedited) and the AI-parsed result side by side

---

## 8. POC Plan

### ✅ Phase 1: AWS Rekognition Baseline (COMPLETED)

1. ✅ Implement `POST /ocr/detect` with AWS Rekognition `DetectText`
2. ✅ Test with Philippine National ID (ePhilID), Driver's License, Passport, Postal ID
3. ✅ Frontend: ID capture with mockups (front/back), per-entry OCR buttons, "OCR All" bulk processing
4. ✅ Raw OCR text displayed in full (no truncation) alongside AI result

### ✅ Phase 2: AI Structured Extraction (COMPLETED)

1. ✅ Implement `POST /ocr/parse` with GROQ (llama-3.3-70b-versatile) as primary, OpenAI (gpt-4o-mini) as fallback
2. ✅ PH ID Type Registry (0-13) hardcoded in prompt for accurate classification
3. ✅ Strict JSON schema output with personal_data, other_fields, id_information categories
4. ✅ Field validation: blood_type (A/B/AB/O ±), gender (M/F), civil_status (S/M/D/W), birth_date (yyyy-mm-dd)
5. ✅ Cross-referencing: multiple IDs reconciled, discrepancies flagged
6. ✅ Anti-hallucination: AI instructed to only extract values literally present in OCR text

### ✅ Phase 3: Multi-ID & UI (COMPLETED)

1. ✅ Multi-ID entry with dynamic add/remove
2. ✅ Each ID has front + back capture with SVG mockups
3. ✅ "OCR All" processes each image individually, results merged per entry
4. ✅ "Parse All" deduplicates OCR text, sends to AI for structured extraction
5. ✅ 2-column layout: raw OCR result (left) + AI parsed result (right) below buttons
6. ✅ OCR provider selector in sidebar (AWS Rekognition, Google Doc AI, Azure DI, Tencent, Mindee)
7. ✅ AI parser selector (GROQ / OpenAI) with env var API keys

### 🔲 Phase 4: Production Hardening (PENDING)

1. Improve low-quality image handling (preprocessing before OCR)
2. Add confidence scores per extracted field
3. Add retake prompts when OCR confidence is low
4. Implement auto-fill form from OCR results
5. Add more PH ID types to test dataset
6. Evaluate Verihubs / ZOLOZ for production-grade PH ID OCR

---

## 9. References

- [Amazon Bedrock Multimodal Prompts](https://docs.aws.amazon.com/bedrock/latest/userguide/prompts-multimodal.html)
- [AWS Textract AnalyzeID](https://docs.aws.amazon.com/textract/latest/dg/how-it-works-identity.html)
- [AWS Textract Queries](https://docs.aws.amazon.com/textract/latest/dg/API_Query.html)
- [Verihubs Philippine OCR](https://verihubs.com/ph/ocr-extraction/)
- [ZOLOZ eKYC Docs — Philippine ID Support](https://docs.zoloz.com/zoloz/saas/apireference/doctype_ocrresult)
- [Tencent Cloud PH ID OCR](https://www.tencentcloud.com/document/product/1005/54651)
- [AccuAuth Philippine ID OCR](http://devcenter.cloud.accuauth.com/philippine/ocr/ocr_idcard.html)
- [Anthropic Claude on Bedrock — IDP Blog](https://aws.amazon.com/blogs/machine-learning/intelligent-document-processing-using-amazon-bedrock-and-anthropic-claude/)

---

*See also: `CPS-221-spike-report.md` (face matching), `CPS-222-spike-report.md` (liveness detection). The three spikes form a complete KYC solution.*
