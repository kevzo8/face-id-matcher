# CPS-221: Spike — Biometric Face Matching (UX vs. Async Backend)

## 1. Objective

Research, benchmark, and integrate a 1:1 face matching solution that compares a user's selfie with their ID photo for identity verification. The solution must support two use cases:

- **Real-time (OWA Flow):** Face matching during onboarding with instant feedback in the web app
- **Background Processing (Batch):** A batch program that processes KYC applications in bulk, calls the face match API, and routes results (auto-approve or manual review)

---

## 2. Vendor Evaluation

### 2.1 Comparison Table

| Vendor | API | Pricing (per 1K comparisons) | Free Tier | Accuracy (general) | Accuracy (Asian/PH IDs) | Setup Difficulty | Latency |
|--------|-----|------------------------------|-----------|-------------------|------------------------|-----------------|---------|
| **Megamatcher (Neurotechnology)** | `/biometric` (already integrated) | Already licensed — $0 marginal | N/A (owned) | High (~99%) | Good (tunable) | **None** (already in stack) | ~100-300ms |
| **Amazon Rekognition** | `CompareFaces` | $1.00 (first 1M/month tier) | 1K/month for 12 months | High (~99.5%) | Good | Easy (AWS SDK) | ~200-500ms |
| **Azure Face API** | `Verify` | ~$0.50-$1.00 per 1K | 30K/month free | High (~99.5%) | Good | Easy (Azure SDK) | ~200-400ms |
| **Face++ (Megvii)** | `/compare` | ~$0.19 per 1K (pay-as-you-go) | 1 QPS free forever | High | **Best** (trained on Asian faces) | Medium (REST API) | ~100-300ms |
| **face_recognition (dlib)** | Python library | $0 (self-hosted) | Unlimited | Moderate (~95-98%) | Moderate | Medium (needs CMake, dlib) | ~100-500ms (CPU) |
| **face-api.js** | JavaScript library | $0 (browser-side) | Unlimited | Moderate (~95-98%) | Moderate | Easy (npm install) | ~50-200ms (client) |

> **Note on Megamatcher:** Already integrated in the OWA via the `/biometric` endpoint (Payara backend). Currently used for face **enrollment** (1:N), but the Neurotechnology Megamatcher SDK also supports 1:1 face **verification** — comparing two face images and returning a match score. Since the license is already paid for and the infrastructure is in place, it should be the **first option evaluated** for production. The OWA already sends selfie images to `/biometric`; adding ID photo comparison would require a new endpoint or extending the existing one to accept two images.

### 2.2 Pricing at Scale

| Volume / Month | Megamatcher (owned) | AWS Rekognition | Azure Face API | Face++ | dlib (self-hosted) |
|----------------|---------------------|-----------------|----------------|--------|---------------------|
| 1,000 | $0 | $1.00 (free tier) | $0.50 (free tier) | $0.19 (free tier) | $0 |
| 10,000 | $0 | $10.00 | $5.00 | $1.90 | $0 |
| 100,000 | $0 | $100.00 | $50.00 | $19.00 | $0 |
| 1,000,000 | $0 | $1,000.00 | $500.00 | $190.00 | $0 (add servers) |

**Note:** Megamatcher has zero marginal cost since the license is already owned. Self-hosted (dlib/InsightFace) also has zero API cost but requires server infrastructure.

### 2.3 API Limits & Rate Limits

| Vendor | Rate Limit | Max Image Size | Concurrent Requests |
|--------|-----------|----------------|-------------------|
| Megamatcher | License-based (no API limit) | Configurable | Thread pool |
| AWS Rekognition | 50 TPS default (raisable) | 15MB (JPEG/PNG) | No hard limit |
| Azure Face API | 10 TPS (Standard tier) | 6MB (JPEG) | 10 concurrent |
| Face++ | 1 QPS (free), 100 QPS (paid) | 2MB (free), 10MB (paid) | Varies by plan |
| dlib/InsightFace | CPU-bound (~2-5/sec on 4-core) | No limit | Thread pool |
| face-api.js | Browser-bound | No limit | One at a time |

### 2.4 Accuracy Notes for Philippine ID Images

Philippine government IDs (SSS, UMID, PhilID, Driver's License) present specific challenges:

1. **Low print quality** — Many IDs have pixelated or blurry photos
2. **Holographic overlays** — Can interfere with face detection
3. **Variable lighting** — Camera flash reflections on glossy ID surfaces
4. **Small photo size** — ID photos are typically 1x1 inch, limiting face resolution

**Recommendation:** Cloud APIs (especially Face++) handle these better than open-source libraries due to larger training datasets. If budget allows, test with real Philippine ID samples and measure false accept/false reject rates empirically.

---

## 3. Recommendation

### Primary: Megamatcher (for production — already in the stack)

**Rationale:**
- **Already integrated** in the OWA via `/biometric` endpoint — no new vendor to onboard
- License already paid for — zero marginal cost per comparison
- Neurotechnology Megamatcher SDK supports 1:1 face verification (not just enrollment)
- Already handles Philippine ID images in production
- Infrastructure (Payara backend) is in place and proven
- Tunable matching threshold — can be calibrated for PH ID quality
- No external API dependency — works on-premise

**Implementation path:** Extend the existing `/biometric` endpoint (or add a `/biometric/verify` endpoint) to accept two face images (ID photo + selfie) and return a match score. The Megamatcher SDK's `Verify` function compares two face templates and returns a similarity score.

### Secondary: Amazon Rekognition (for POC and comparison benchmarking)

**Rationale:**
- Easi to integrate (well-documented SDK, boto3)
- Good accuracy across diverse faces
- Free tier sufficient for POC (1K comparisons/month)
- Team has AWS access
- `CompareFaces` API returns similarity score (0-100) and face bounding boxes
- No infrastructure to manage
- Can be used to benchmark against Megamatcher's accuracy

### Alternative: Face++ (if PH ID accuracy is insufficient)

**Rationale:**
- Lowest cost at scale ($0.19 per 1K vs $1.00 for AWS)
- Best accuracy for Asian faces (trained on Chinese/Asian datasets)
- Simple REST API with base64 image input
- Free tier: 1 QPS forever (enough for POC)

### Free Fallback: InsightFace / face-api.js (for zero-budget POC)

**Rationale:**
- Zero cost — good for initial proof of concept
- face-api.js runs entirely in the browser (no server needed)
- InsightFace (ONNX) runs locally on any machine — no compilation needed
- Moderate accuracy (~95-98%) — sufficient for demonstrating the concept
- Can upgrade to Megamatcher or cloud API later without changing the POC architecture

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
    ├── [dlib provider]   face_recognition library → local CPU processing
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
- **Tech:** React 19 + Vite + face-api.js
- **Features:**
  - Upload ID photo or take photo with webcam (rear camera on mobile)
  - Upload selfie or take selfie with webcam (front camera)
  - Adjustable match threshold slider
  - Visual similarity score with color-coded result (MATCH / NO MATCH)
  - All processing client-side (free, no API costs)

### 5.2 Batch Processing Script

- **Location:** `face-id-matcher/batch/`
- **Tech:** Python 3 + face_recognition library (dlib) / boto3 (Rekognition)
- **Features:**
  - CLI interface: `python batch.py --input pairs.csv --output results.csv`
  - Pluggable providers: `--provider dlib` (free) or `--provider rekognition` (AWS)
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

| Threshold | dlib Distance | Rekognition Similarity | Behavior |
|-----------|--------------|----------------------|----------|
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
- Free face matching (face-api.js / dlib)
- Prove the concept works with real ID + selfie pairs

### Phase 2 (AWS Rekognition)
- Configure AWS credentials
- Switch batch script to `--provider rekognition`
- Run FastAPI server for cloud-based web matching
- Measure accuracy on real Philippine ID samples

### Phase 3 (OWA Integration)
- Add "selfie vs ID match" step in the OWA onboarding flow
- Place it **before** Megamatcher enrollment (only enroll if match succeeds)
- Use the same API server or call Rekognition directly from the Java backend

### Phase 4 (Production Hardening)
- Add liveness detection (anti-spoofing) to prevent photo attacks
- Implement retry logic and circuit breakers for API calls
- Set up monitoring and alerting on match rates
- Calibrate threshold based on production data

---

## 8. Cost Projection

### Scenario: 10,000 KYC applications/month

| Vendor | Monthly Cost | Annual Cost | Notes |
|--------|-------------|-------------|-------|
| AWS Rekognition | $10.00 | $120.00 | Pay-per-use, no infrastructure |
| Azure Face API | $5.00 | $60.00 | Cheapest cloud option |
| Face++ | $1.90 | $22.80 | Lowest cost cloud |
| dlib (self-hosted) | $0 (existing server) | $0 | Or ~$50/month for dedicated VM |

**Recommendation:** Start with dlib (free) for POC → migrate to AWS Rekognition for production. At 10K/month, the cost difference is negligible ($10/month), but Rekognition provides significantly better accuracy and no infrastructure management.
