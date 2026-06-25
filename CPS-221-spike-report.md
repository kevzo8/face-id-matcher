# CPS-221: Spike — Biometric Face Matching (UX vs. Async Backend)

## 1. Objective

Research, benchmark, and integrate a 1:1 face matching solution that compares a user's selfie with their ID photo for identity verification. The solution must support two use cases:

- **Real-time (OWA Flow):** Face matching during onboarding with instant feedback in the web app
- **Background Processing (Batch):** A batch program that processes KYC applications in bulk, calls the face match API, and routes results (auto-approve or manual review)

---

## 2. Vendor Evaluation

### 2.1 Comparison Table

**Cloud API Providers (pay-per-use):**

| Vendor | API | Upfront Cost | Cost per Transaction | Free Tier | Accuracy | Setup | Latency |
|--------|-----|-------------|---------------------|-----------|----------|-------|---------|
| **Amazon Rekognition** | `CompareFaces` | $0 | $0.001 (first 1M/month) | 1K/month, 12 months | High (~99.5%) | Easy (AWS SDK) | ~200-500ms |
| **Azure Face API** | `Verify` | $0 | $0.00050 (0-1M txns) | 30K/month free | High (~99.5%) | Easy (Azure SDK) | ~200-400ms |
| **Face++ (Megvii)** | `/compare` | $0 | $0.00019 (pay-as-you-go) | 1 QPS free forever | High | Medium (REST API) | ~100-300ms |
| **Kairos** | `/verify` | $0 | ~$0.10-0.49/call (volume-based) | 100 free calls | Moderate-High | Easy (REST API) | ~300-800ms |
| **Luxand Cloud API** | `/verify` | $0 | ~$0.01-0.05/call | Limited trial | High | Easy (REST API) | ~200-500ms |

**Self-hosted SDKs (one-time license):**

| Vendor | Platform | Upfront Cost | Cost per Transaction | Free Tier | Accuracy | Setup |
|--------|----------|-------------|---------------------|-----------|----------|-------|
| **Megamatcher (Neurotechnology)** | Windows/Linux/macOS/iOS/Android | €2,590 Std / €4,990 Ext (~$2,800/$5,400) | $0 (after license) | 30-day trial | High (~99%) | Medium (SDK) |
| **Luxand FaceSDK** | Windows/Linux/macOS/iOS/Android | ~$2,995 (quote-based) | $0 (after license) | 30-day trial | High (~99%) | Medium (SDK) |

**Open Source / Free:**

| Vendor | Platform | Cost per Transaction | Accuracy | Setup |
|--------|----------|---------------------|----------|-------|
| **InsightFace** | Python (ONNX, CPU/GPU) | $0 | Moderate (~95-98%) | Easy (pip) |
| **face-api.js** | Browser (JavaScript) | $0 | Moderate (~95-98%) | Easy (npm) |
| **DeepFace** | Python (VGG-Face, FaceNet, etc.) | $0 | Moderate-High (varies by model) | Easy (pip) |

**Full KYC Platforms (face matching + document verification + liveness bundled):**

| Vendor | Cost per Verification | Includes | Notes |
|--------|----------------------|----------|-------|
| **Veriff** | $0.80-$1.89/verification | Document check, face match, liveness, AML | Full identity verification platform |
| **Onfido** | ~$0.50+/verification | Document check, face match, liveness | Enterprise-focused, contact sales |
| **SumSub** | ~$0.40+/verification | Document check, face match, liveness, AML | All-in-one KYC/KYB platform |
| **Jumio** | Contact sales | Document check, face match, liveness | Enterprise, contact sales |

> **Note on full KYC platforms:** Veriff, Onfido, SumSub, and Jumio are not just face matching APIs — they are complete identity verification platforms that include document verification, face matching, liveness detection, and AML screening as a bundle. They are significantly more expensive per transaction but require zero development effort for the full KYC flow. If the requirement is only 1:1 face comparison (selfie vs ID), the cloud APIs or self-hosted SDKs above are more cost-effective.

> **Note on Google Cloud Vision API:** Google discontinued face comparison/verification capabilities in 2020. The Face Detection API only detects faces and extracts landmarks — it does not compare faces. Google is intentionally not included in this comparison.

> **Note on Megamatcher:** SVI already owns a Megamatcher license and has it integrated in the OWA via the `/biometric` endpoint (Payara backend). It is currently used for face enrollment (1:N), but the SDK also supports 1:1 face verification. Since the license is already paid for and the infrastructure is in place, Megamatcher should be evaluated first for production — the marginal cost is $0.

### 2.2 Cost per Transaction

| Vendor | Cost per 1 Transaction | Notes |
|--------|----------------------|-------|
| **Amazon Rekognition** | **$0.001** (first 1M/month) | $0.0008 for 1M-5M, $0.0006 for 5M-30M |
| **Azure Face API** | **$0.00050** (0-1M transactions) | $0.00035 for 1M-5M, $0.00025 for 5M-100M |
| **Face++ (Megvii)** | **$0.00019** (pay-as-you-go) | Cheapest cloud option per transaction |
| **Luxand Cloud API** | **~$0.01-0.05** | Quote-based pricing |
| **Kairos** | **~$0.10-0.49** (volume-based) | $49/month base + per-call, decreases with volume |
| **Megamatcher (Neurotechnology)** | **$0.00** (after license) | One-time SDK: €2,590 Standard / €4,990 Extended, then $0/transaction forever |
| **Luxand FaceSDK** | **$0.00** (after license) | One-time SDK: ~$2,995 (quote-based), then $0/transaction |
| **InsightFace (self-hosted)** | **$0.00** | Free — runs on own server (CPU) |
| **face-api.js (browser)** | **$0.00** | Free — runs in user's browser |
| **DeepFace (Python)** | **$0.00** | Free — open source (VGG-Face, FaceNet, OpenFace, etc.) |
| **Veriff** | **$0.80-$1.89** | Full KYC platform (document + face + liveness + AML) |
| **Onfido** | **~$0.50+** | Full KYC platform, contact sales |
| **SumSub** | **~$0.40+** | Full KYC platform, contact sales |

> **Example:** For 10,000 face comparisons/month (face match only):
> - Face++: **$1.90/month** ($0.00019 x 10,000)
> - Azure Face API: **$5.00/month** ($0.00050 x 10,000)
> - AWS Rekognition: **$10.00/month** ($0.001 x 10,000)
> - Megamatcher/Luxand: **$0/month** (after one-time license)
> - InsightFace/face-api.js/DeepFace: **$0/month** (free)
>
> For full KYC verification (document + face + liveness):
> - SumSub: **~$4,000/month** ($0.40 x 10,000)
> - Veriff: **~$8,000/month** ($0.80 x 10,000)

### 2.3 Pricing at Scale

**Face matching only (1:1 comparison):**

| Volume / Month | Face++ | Azure Face API | AWS Rekognition | Megamatcher (after license) | InsightFace (self-hosted) |
|----------------|--------|----------------|-----------------|----------------------------|---------------------------|
| 1,000 | $0.19 (free tier) | $0.50 (free tier) | $1.00 (free tier) | $0 | $0 |
| 10,000 | $1.90 | $5.00 | $10.00 | $0 | $0 |
| 100,000 | $19.00 | $50.00 | $100.00 | $0 | $0 |
| 1,000,000 | $190.00 | $500.00 | $1,000.00 | $0 | $0 (add servers) |

**Full KYC platform (document + face + liveness):**

| Volume / Month | SumSub | Veriff (Essential) | Veriff (Premium) |
|----------------|--------|-------------------|-----------------|
| 1,000 | ~$400 | ~$800 | ~$1,890 |
| 10,000 | ~$4,000 | ~$8,000 | ~$18,900 |
| 100,000 | Contact sales | Contact sales | Contact sales |

**Note:** If the requirement is only 1:1 face comparison (selfie vs ID photo), using a dedicated face matching API is 10-100x cheaper than a full KYC platform. Full KYC platforms are only worth the cost if document verification, liveness detection, and AML screening are also needed.

### 2.4 API Limits & Rate Limits

| Vendor | Rate Limit | Max Image Size | Concurrent Requests |
|--------|-----------|----------------|-------------------|
| AWS Rekognition | 50 TPS default (raisable) | 15MB (JPEG/PNG) | No hard limit |
| Azure Face API | 10 TPS (Standard tier) | 6MB (JPEG) | 10 concurrent |
| Face++ | 1 QPS (free), 100 QPS (paid) | 2MB (free), 10MB (paid) | Varies by plan |
| Kairos | Varies by plan | 5MB | Limited |
| Luxand Cloud API | Varies by plan | 5MB | Limited |
| Megamatcher | License-based (no API limit) | Configurable | Thread pool |
| Luxand FaceSDK | License-based (no API limit) | Configurable | Thread pool |
| InsightFace | CPU-bound (~2-5/sec on 4-core) | No limit | Thread pool |
| face-api.js | Browser-bound | No limit | One at a time |
| DeepFace | CPU/GPU-bound | No limit | Thread pool |
| Veriff/Onfido/SumSub | Varies by plan | 10MB | Varies |

### 2.5 Accuracy Notes for Philippine ID Images

Philippine government IDs (SSS, UMID, PhilID, Driver's License) present specific challenges:

1. **Low print quality** — Many IDs have pixelated or blurry photos
2. **Holographic overlays** — Can interfere with face detection
3. **Variable lighting** — Camera flash reflections on glossy ID surfaces
4. **Small photo size** — ID photos are typically 1x1 inch, limiting face resolution

**Recommendation:** Cloud APIs (especially Face++) handle these better than open-source libraries due to larger training datasets. If budget allows, test with real Philippine ID samples and measure false accept/false reject rates empirically.

---

## 3. Recommendation

### Primary: Amazon Rekognition (for POC and production)

**Rationale:**
- No upfront cost — pay-per-use at $0.001/transaction
- Free tier sufficient for POC (1K comparisons/month for 12 months)
- Easiest to integrate (well-documented SDK, boto3)
- Good accuracy across diverse faces (~99.5%)
- Team has AWS access
- `CompareFaces` API returns similarity score (0-100) and face bounding boxes
- No infrastructure to manage

### Alternative: Face++ (lowest cost cloud, best for Asian faces)

**Rationale:**
- Lowest per-transaction cost among cloud providers ($0.00019)
- Best accuracy for Asian faces (trained on Chinese/Asian datasets)
- Simple REST API with base64 image input
- Free tier: 1 QPS forever (enough for POC)

### Long-term: Megamatcher (most cost-effective at scale)

**Rationale:**
- One-time license fee (€2,590 Standard / €4,990 Extended), then $0/transaction forever
- No per-transaction billing — unlimited comparisons
- Self-hosted — no external API dependency, works on-premise
- Supports 1:1 face verification (not just enrollment)
- Tunable matching threshold — can be calibrated for PH ID quality
- Break-even vs AWS Rekognition at ~2.8M comparisons

> **Note:** SVI already owns a Megamatcher license and has it integrated in the OWA via the `/biometric` endpoint (Payara backend). It is currently used for face enrollment (1:N), but the SDK also supports 1:1 face verification. Since the license is already paid for and the infrastructure is in place, Megamatcher should be evaluated first for production — the marginal cost is $0. Adding 1:1 verification would require extending the existing `/biometric` endpoint to accept two images (ID photo + selfie) and return a match score.

### Free Fallback: InsightFace / face-api.js (for zero-budget POC)

**Rationale:**
- Zero cost — good for initial proof of concept
- face-api.js runs entirely in the browser (no server needed)
- InsightFace (ONNX) runs locally on any machine — no compilation needed
- Moderate accuracy (~95-98%) — sufficient for demonstrating the concept
- Can upgrade to cloud API or Megamatcher later without changing the POC architecture

---

## 4. Architecture

### 4.1 Real-Time Web Flow (OWA)

```
User Browser
    ├── Upload/Take ID Photo (webcam or file)
    ├── Upload/Take Selfie (webcam or file)
    ├── [Free Mode] face-api.js compares in browser → instant result
    └── [Cloud Mode] POST /compare → FastAPI → Rekognition → result
```

**Free Mode (face-api.js):**
- All processing in the browser
- No data leaves the user's device
- Instant results (~100ms)
- Moderate accuracy

**Cloud Mode (Rekognition):**
- Images sent to FastAPI server
- Server calls Rekognition `CompareFaces`
- Higher accuracy, especially for low-quality ID photos
- ~300-500ms latency

### 4.2 Batch Processing Flow

```
Input CSV (applicant_id, id_path, selfie_path)
    │
    ├── [insightface provider]  ONNX model → local CPU processing
    └── [rekognition provider]  boto3 → AWS Rekognition API
    │
    ▼
Output CSV (applicant_id, similarity, distance, decision, error)
    │
    ├── auto_approve   → similarity >= threshold → proceed to next step
    ├── manual_review  → similarity < threshold → route to human reviewer
    └── error           → processing failed → retry queue
```

---

## 5. Deliverables

### 5.1 POC Web Application

- **Location:** `face-id-matcher/web/`
- **Tech:** React 19 + Vite + face-api.js (SSD MobileNet, 128D face descriptors, Euclidean distance)
- **Features:**
  - Upload ID photo or take photo with webcam (rear camera on mobile)
  - Upload selfie or take selfie with webcam (front camera)
  - Camera selector dropdown for OBS Virtual Camera / multi-camera setups
  - Adjustable match threshold slider (Strict ↔ Lenient)
  - Visual similarity score with color-coded confidence bar (green/yellow/orange/red)
  - Euclidean distance and threshold metrics displayed transparently
  - All processing client-side (free, no API costs)
  - Live demo: https://vegamatcher.kevinguadalupevega.com

### 5.2 Batch Processing Script

- **Location:** `face-id-matcher/batch/`
- **Tech:** Python 3 + InsightFace (ONNX) / boto3 (Rekognition)
- **Features:**
  - CLI interface: `python batch.py --input pairs.csv --output results.csv`
  - Pluggable providers: `--provider insightface` (free, local) or `--provider rekognition` (AWS)
  - Parallel processing: `--workers 4`
  - Adjustable threshold: `--threshold 0.6`
  - Progress output with PASS/FAIL/ERR per applicant
  - Summary report: total, auto-approve count, manual review count, errors
  - Output CSV with routing decisions

### 5.3 Optional API Server

- **Location:** `face-id-matcher/server/`
- **Tech:** Python FastAPI + boto3
- **Purpose:** Enables the web app to use AWS Rekognition for higher accuracy
- **Endpoint:** `POST /compare` (multipart: id_image, selfie_image, threshold)

---

## 6. Threshold Calibration

| Threshold | Euclidean Distance | Rekognition Similarity | Behavior |
|-----------|-------------------|----------------------|----------|
| 0.40 | < 0.40 | >= 40% | Very lenient — high false accept rate |
| 0.50 | < 0.50 | >= 50% | Lenient — good for low-quality images |
| **0.60** | **< 0.60** | **>= 60%** | **Balanced (recommended)** |
| 0.70 | < 0.70 | >= 70% | Strict — may reject valid matches |
| 0.80 | < 0.80 | >= 80% | Very strict — high false reject rate |

**Recommendation:** Start with 0.60 for the POC. Calibrate with real Philippine ID samples by measuring false accept and false reject rates at different thresholds.

---

## 7. Future Integration Path

### Phase 1 (Current — POC)
- Standalone web app + batch script
- Free face matching (face-api.js / InsightFace)
- Prove the concept works with real ID + selfie pairs
- Live demo deployed on Vercel

### Phase 2 (AWS Rekognition — Cloud Benchmarking)
- Configure AWS credentials
- Switch batch script to `--provider rekognition`
- Run FastAPI server for cloud-based web matching
- Measure accuracy on real Philippine ID samples

### Phase 3 (OWA Production Integration)
- Add "selfie vs ID match" step in the OWA onboarding flow
- Place it **before** Megamatcher enrollment (only enroll if match succeeds)
- Use AWS Rekognition (or Megamatcher if licensed) from the Java backend

### Phase 4 (Production Hardening)
- Add liveness detection (anti-spoofing) to prevent photo attacks
- Implement retry logic and circuit breakers for API calls
- Set up monitoring and alerting on match rates
- Calibrate threshold based on production data

---

## 8. Cost Projection

### Scenario: 10,000 KYC applications/month (face match only)

| Vendor | Cost per Transaction | Upfront Cost | Monthly Cost (10K txns) | Annual Cost |
|--------|---------------------|-------------|------------------------|-------------|
| **InsightFace (self-hosted)** | **$0.00** | $0 | **$0.00** | **$0.00** |
| **DeepFace (self-hosted)** | **$0.00** | $0 | **$0.00** | **$0.00** |
| **face-api.js (browser)** | **$0.00** | $0 | **$0.00** | **$0.00** |
| **Megamatcher** | **$0.00** (after license) | €2,590 Std / €4,990 Ext (~$2,800/$5,400) | **$0.00** | **$0.00** |
| **Luxand FaceSDK** | **$0.00** (after license) | ~$2,995 (quote-based) | **$0.00** | **$0.00** |
| **Face++ (Megvii)** | **$0.00019** | $0 | **$1.90** | **$22.80** |
| **Azure Face API** | **$0.00050** | $0 | **$5.00** | **$60.00** |
| **AWS Rekognition** | **$0.001** | $0 | **$10.00** | **$120.00** |
| **Kairos** | **~$0.10** | $0 | **~$1,000** | **~$12,000** |
| **SumSub** (full KYC) | **~$0.40** | $0 | **~$4,000** | **~$48,000** |
| **Veriff** (full KYC) | **$0.80-$1.89** | $0 | **~$8,000-$18,900** | **~$96,000-$226,800** |

**Recommendation:** For the POC, use InsightFace/face-api.js (free). For production, AWS Rekognition is the easiest to integrate with no upfront cost. Megamatcher and Luxand FaceSDK are the most cost-effective long-term options — one-time license fee then $0 per transaction. Face++ offers the best accuracy for Asian faces at the lowest cloud price. If SVI already owns a Megamatcher license (which it does), the marginal cost is $0 — making it the clear production choice. Full KYC platforms (Veriff, SumSub) are only worth considering if document verification and liveness detection are also required.
