# CPS-222: SPIKE — Research Non-PhilSys Liveness Detection (Passive & Active)

**Parent:** CPS-91 — Core Platform Shared

**Goal:** Research, evaluate, and prototype an out-of-the-box liveness detection solution in the Onboarding Web App (OWA) to prevent spoofing attacks (e.g., photos, videos, or masks). Must work independently from the PhilSys ecosystem.

---

## Executive Summary

| Priority | Option | Why | Est. Monthly (10K) |
|----------|--------|-----|-------------------:|
| **🥇 Best overall** | **AWS Rekognition Liveness** | Required baseline. iBeta L1+L2 certified, pre-built Amplify React component, fully managed, active+passive hybrid | ~$150 |
| **🥈 Cheapest cloud** | **Face++ Liveness** | $0.00019/check, already integrated in POC, simple REST API, can run alongside existing face compare | ~$1.90 |
| **🥉 Best free/OSS** | **open-face-liveness** (browser) | $0 cost, runs entirely in-browser via WebAssembly (no server changes), MIT license, passive+active+light modes | $0 |
| **🏆 Best all-in-one** | **OpenBiometrics** | Covers CPS-220 (OCR + MRZ) + CPS-221 (face recog, 99.4% LFW) + CPS-222 (passive+active liveness) in one platform | ~$20–$100 |
| **💼 Best enterprise** | **iProov** | Government-grade, iBeta Level 2, FIDO compliant, DHS RIVTD 0% attack rate, used by banks/govts globally | ~$1K–$3K |

---

## Table of Contents

1. [Overview](#1-overview)
2. [Option A: AWS Rekognition Face Liveness](#2-option-a-aws-rekognition-face-liveness)
3. [Option B: MegaMatcher ID Liveness](#3-option-b-megamatcher-id-liveness)
4. [Option C: Third-Party Alternative](#4-option-c-third-party-alternative)
5. [Comparison Matrix](#5-comparison-matrix)
6. [Integration into Existing App](#6-integration-into-existing-app)
7. [POC Plan](#7-poc-plan)
8. [POC Implementation Progress](#8-poc-implementation-progress)
9. [References](#9-references)

---

## 1. Overview

Liveness detection prevents spoofing attacks where a bad actor presents a photo, video, mask, or deepfake to fool a camera. There are two approaches:

| Type | Description | UX Impact |
|------|-------------|-----------|
| **Passive** | Analyzes natural cues (skin texture, reflections, depth) from a single image/video — no user action required | Seamless |
| **Active** | Requires the user to perform actions (blink, turn head, smile) to prove liveness | More friction, higher drop-off |
| **Hybrid** | Passive when lighting allows, falls back to active in bright environments | Adaptive |

All three options below can be integrated as an additional step in the existing face matching flow: **Upload/Take Photo → Liveness Check → Compare Faces**.

---

## 2. Option A: AWS Rekognition Face Liveness

**Status:** Required baseline — evaluate as primary option

### How It Works

1. **Backend** calls `CreateFaceLivenessSession` → receives a `SessionId`
2. **Frontend** (React) uses `@aws-amplify/ui-react-liveness` `FaceLivenessDetector` component → captures a short selfie video with challenge prompts
3. Video is streamed directly to AWS via the Amplify SDK, which internally uses **Amazon Kinesis Video Streams (KVS)** over a **WebSocket** connection — not a simple REST API call
4. **Backend** calls `GetFaceLivenessSessionResults` → receives a confidence score (0–100), reference image, and up to 4 audit images

### Infrastructure Requirements

The streaming architecture requires additional AWS infrastructure beyond a simple REST endpoint:

| Component | Purpose | Cost |
|-----------|---------|------|
| **Kinesis Video Streams** | Receives the WebRTC/WebSocket video stream from the browser | ~$0.0085/hour ingested + ~$0.0119/hour stored |
| **AWS IAM** | Role with `RekognitionLivenessPermissions` policy (session creation + KVS access) | $0 |
| **S3 Bucket** (optional) | Stores audit images from sessions | ~$0.023/GB |
| **Amplify SDK** | Frontend library that handles KVS streaming + session management | $0 (open source) |

The browser cannot call AWS Rekognition Liveness APIs directly — the frontend captures video locally, but the session token and streaming must go through a backend proxy that holds AWS credentials. This is **not** the same as the existing `/compare` endpoint which is a simple REST call with base64 images.

### Challenge Modes

| Mode | Description | Best For |
|------|-------------|----------|
| `FaceMovementAndLightChallenge` (default) | User moves face into oval + colored lights flash on screen | Maximum accuracy |
| `FaceMovementChallenge` | User moves face into oval only — no colored lights | Faster checks |

### Pricing

**Rekognition Liveness** — per-check pricing:

| Volume | Per Check |
|--------|-----------|
| First 500K/month | $0.015 |
| Next 2.5M/month | $0.0125 |
| Beyond 3M/month | $0.010 |

At 10K verifications/month: **$150/mo** (first tier)

**Rekognition `detect_faces`** (alternative — not true liveness, just face analysis):

| Volume | Per Image |
|--------|-----------|
| First 1M/month | $0.001 |
| Next 10M/month | $0.0008 |

This is the **same price as `compare_faces`** ($0.001/image), but `detect_faces` only checks for face attributes (eyes open, glasses, etc.) — it cannot distinguish a live person from a photo/video replay. It is **not a substitute** for the Liveness API.

### Integration Effort

| Layer | Work Required |
|-------|--------------|
| AWS setup | IAM role with `AmazonRekognitionFullAccess`, S3 bucket for audit images |
| Backend | Two API calls: `CreateFaceLivenessSession` + `GetFaceLivenessSessionResults` |
| Frontend | Install `@aws-amplify/ui-react-liveness`, embed `FaceLivenessDetector` component |
| Existing app | Add as a step before face comparison in the match flow |

### Pros & Cons

| ✅ Pros | ❌ Cons |
|---------|---------|
| Pre-built React component — minimal frontend work | Requires AWS credentials and IAM setup |
| Passive + active hybrid — adapts to lighting | $150/mo at 10K checks (vs $10/mo for Rekognition compare alone) |
| Returns audit images for human review | Session expires in 3 minutes — must handle timeouts |
| 100% accuracy on the face matching POC already | Video streaming — higher bandwidth than single image |
| Fully managed — no infrastructure to maintain | Vendor lock-in to AWS |

---

## 3. Option B: MegaMatcher ID Liveness

**Status:** Current system check — verify availability and gaps

### How It Works

MegaMatcher ID is a separate product from MegaMatcher ABIS. It is available as:
- **MegaMatcher ID SDK** (Windows, Linux, macOS, iOS, Android)
- **MegaMatcher ID Web Service** (Docker containers with WebRTC capture)

### Liveness Detection Capabilities

From Neurotechnology's 2025.2 release (Feb 2026):

| Mode | Description | User Action Required |
|------|-------------|---------------------|
| **Passive** | Analyzes facial features while user stays still for a short period | None (10+ FPS required, color images) |
| **Passive + Blink** | Same as passive, but engine requests a blink when needed | Blink when prompted |
| **Custom (Active)** | Turn head in 4 directions (up, down, left, right) in random order | Head rotation (5+ FPS, works with grayscale) |

All modes are ISO/IEC 30107-3 Level 2 compliant (independently verified by BixeLab).

### Key Requirements

- Live video stream via WebRTC (Janus server acts as middleware)
- Docker-based deployment (Janus + Biostream + Web Server + Management service)
- On-premises installation — no cloud option for MegaMatcher ID (MegaMatcher ABIS Online is cloud, but ABIS-only, not liveness-focused)

### Pricing

| Component | Cost |
|-----------|------|
| MegaMatcher ID SDK | License-based (contact Neurotechnology) |
| MegaMatcher ID Web Service | License-based + infrastructure (Docker hosts) |
| MegaMatcher ABIS Online | Subscription-based but focused on ABIS, not standalone liveness |

### Integration Effort

| Layer | Work Required |
|-------|--------------|
| Infrastructure | Docker hosts for Janus + Biostream + management containers |
| Backend | REST API integration with the Web Service |
| Frontend | WebRTC capture integration (custom UI, no pre-built React component) |
| Existing app | Add liveness step, requires WebRTC support in browser |

### Pros & Cons

| ✅ Pros | ❌ Cons |
|---------|---------|
| Pay-per-transaction (Face PRT license, volume-tiered) | On-premises Docker deployment — infrastructure cost |
| ISO 30107-3 Level 2 certified | No pre-built React component — more frontend work |
| Multiple liveness modes (passive + active) | Requires WebRTC + Janus server setup |
| Works offline (no cloud dependency) | WebRTC may have firewall/NAT issues |
| Data stays on-premises | License cost unclear without direct Neurotechnology contact |
| Face PRT per-transaction cost (€0.69–€0.03/unit depending on volume) | Different product from MegaMatcher ABIS — may need separate license |

### Gap Assessment

MegaMatcher ID is **not** the same as MegaMatcher ABIS Online. SVI's existing Megamatcher integration (used in OWA via `/biometric` endpoint, pay-per-transaction basis) is likely the ABIS/SDK version, which may or may not include the ID product's liveness features. **This needs verification with the team.**

---

## 4. Option C: Third-Party Alternative

**Status:** Developer research — recommended pick

### Recommended: Face++ (Megvii) Liveness Detection

**Why:** Already integrated in our POC for face matching — natural extension. Cheapest cloud option with both passive and active liveness.

| Spec | Value |
|------|-------|
| **Type** | REST API (cloud) |
| **Liveness modes** | Passive (single image) + Active (video) |
| **Pricing** | $0.00019/check (same as their compare API) |
| **Certification** | Not publicly iBeta certified, but used in production globally |
| **Setup** | Simple REST API call with face image |
| **SDK** | REST-based, no pre-built UI component |

**Estimated cost at 10K/month:** **$1.90/mo** (10x cheaper than AWS)

### Alternative: Mitek IDLive Face

| Spec | Value |
|------|-------|
| **Type** | SDK / Docker / Cloud REST API |
| **Liveness mode** | Passive only (single selfie, no user action) |
| **Certification** | iBeta Level 1 & 2, ISO 30107-3, DHS RIVTD 2025 (100% block rate) |
| **Pricing** | Per-check, estimated ~$0.02–$0.05 (contact vendor) |
| **Setup** | REST API or Docker on-premises |

**Estimated cost at 10K/month:** **$200–$500/mo**

### Dark Horse: KBY-AI Face Liveness SDK

| Spec | Value |
|------|-------|
| **Type** | On-premise SDK (Docker, mobile, desktop) |
| **Liveness mode** | Passive + Active |
| **Certification** | iBeta Level 2 |
| **Pricing** | Perpetual license (one-time cost) |
| **Setup** | Docker container with REST API |

**Best for:** If SVI prefers on-premise with no recurring per-check costs and a one-time license fee.

### Alternative: Azure Face Liveness

**Why:** Competitive pricing ($0.015/check), Passive + Passive-Active modes, pre-built UI components. Azure ecosystem integration.

| Spec | Value |
|------|-------|
| **Type** | Cloud API + SDK (iOS, Android, Web) |
| **Liveness modes** | Passive (no action, ~12s) + Passive-Active (~20s in bright light) |
| **Certification** | Microsoft-managed, continuous improvement |
| **Pre-built UI** | ✅ Vision Face SDK for web, iOS, Android |
| **Pricing** | $0.015/check (Face Liveness) or $0.0155/check (Liveness + Verification) |
| **Free tier** | 30K transactions/month free |
| **Monthly (10K)** | $150 (or $0 if within free tier) |

**Note:** Azure was previously blocked in the CPS-221 spike. Verify if the block applies to liveness specifically or Azure Face API as a whole.

### Alternative: HyperVerge

**Why:** ISO 30107-3 Level 2 certified, on-device processing via SDK, 850M+ checks processed. Strong in KYC market.

| Spec | Value |
|------|-------|
| **Type** | SDK-based (on-device) + cloud API option |
| **Liveness modes** | Passive (single image) |
| **Certification** | ISO 30107-3 Level 2, iBeta tested |
| **Pre-built UI** | ✅ Native SDKs (Android, iOS) + API |
| **Pricing** | Subscription/tiered (contact vendor) |
| **Setup** | SDK integration — no cloud dependency for capture |
| **Best for** | High-security KYC, on-device processing preferred |

### Alternative: Didit

**Why:** iBeta Level 1 certified, sub-2-second verdict, 500 checks/month free forever. Cheapest passive option at $0.10.

| Spec | Value |
|------|-------|
| **Type** | Cloud REST API |
| **Liveness modes** | Passive ($0.10), 3D Flash ($0.15), Active 3D ($0.15) |
| **Certification** | iBeta Level 1 PAD, SOC 2 Type 1 |
| **Free tier** | 500 checks/month forever |
| **Pricing** | $0.10/passive, $0.15/active, $0.33/full KYC (ID + biometric + IP) |
| **Attack coverage** | Printed photos, screen replays, paper/silicone/latex masks, morph attacks, deepfakes |
| **Setup** | Simple REST API |

### Alternative: iProov

**Why:** Industry leader. iBeta Level 2 PAD, FIDO compliant, 0% attack success rate in DHS testing. Used by governments and banks globally.

| Spec | Value |
|------|-------|
| **Type** | Cloud API + SDK |
| **Liveness modes** | Dynamic Liveness (flash-based), Passive Liveness |
| **Certification** | iBeta Level 2, FIDO Alliance, SOC 2 Type II, DHS RIVTD |
| **Pre-built UI** | ✅ SDKs for web, iOS, Android |
| **Pricing** | Contact vendor (enterprise — estimated $0.10–$0.30/check) |
| **Best for** | Government-grade security, regulated markets |

### Alternative: Microblink

**Why:** Combined ID scan + liveness in one SDK. iBeta-tested liveness. Used by US Military.

| Spec | Value |
|------|-------|
| **Type** | SDK + Cloud API |
| **Liveness modes** | Passive + Active |
| **Certification** | iBeta-tested |
| **Pre-built UI** | ✅ Native SDKs (Android, iOS) + web |
| **Additional** | Also does ID scanning (covers CPS-220 too) |
| **Pricing** | Contact vendor |

### Open Source Option A: MiniFASNet ONNX (Self-Hosted)

**Why:** 600KB quantized model, 98.2% accuracy, zero cost. Runs on CPU/GPU/edge. Apache 2.0 license.

| Spec | Value |
|------|-------|
| **Type** | ONNX model (self-hosted) |
| **Model size** | 600KB (quantized) / 1.82MB (FP32) |
| **Accuracy** | 98.2% overall, 0.9984 ROC-AUC |
| **Liveness mode** | Passive (single image, 128x128 RGB) |
| **Architecture** | MiniFASNet V2 SE (lightweight CNN) |
| **Deployment** | Python, ONNX Runtime — CPU or GPU |
| **Cost** | $0 + server compute |
| **License** | Apache 2.0 |

**Integration:** Add a `/liveness/check` endpoint in the Python server that loads the ONNX model, runs inference on a detected face crop, and returns a `real`/`spoof` verdict.

### Open Source Option B: OpenBiometrics (Full Platform)

**Why:** One open-source platform covers face detection, recognition (99.4% LFW), passive liveness (MiniFASNet), active liveness (6 presets), AND document processing (MRZ, OCR). MIT/Apache 2.0 licensed.

| Spec | Value |
|------|-------|
| **Type** | Self-hosted (Docker, FastAPI + TypeScript) |
| **Passive liveness** | MiniFASNet (~98% accuracy) |
| **Active liveness** | 6 presets: eye, smile, multi-range, head-turn, full, passive-only |
| **Face recognition** | SFace (99.4% LFW), 1:1 verification, 1:N identification |
| **Document processing** | MRZ parsing (ICAO 9303), OCR, document detection |
| **Edge ready** | Docker, Jetson, ARM via ONNX Runtime/TensorRT |
| **Cost** | $0 (MIT/Apache 2.0) + hosting |
| **Covers** | CPS-220 (document OCR) + CPS-221 (face match) + CPS-222 (liveness) |

**Key differentiator:** One platform for all three spikes. Dramatically simplifies architecture. Accuracy on Philippine IDs/faces needs testing.

### Open Source Option C: open-face-liveness (Browser-Based)

**Why:** Runs entirely in the browser using ONNX models via WebAssembly. No server needed for liveness checks. MIT license.

| Spec | Value |
|------|-------|
| **Type** | TypeScript library (browser) |
| **Liveness modes** | Passive (RGB anti-spoofing) + Active (head pan/pitch, mouth-open) + Screen light challenge |
| **Models** | MediaPipe BlazeFace + Face Mesh + MiniFASNet V1SE/V2 — all browser-loadable ONNX |
| **Cost** | $0 (MIT license) |
| **Setup** | `npm install` + model manifest |
| **Privacy** | All processing on-device — no video leaves browser |

**Best for:** Zero-infrastructure liveness. Runs in the existing face-id-matcher POC without any server changes.

### Open Source Option D: YOLO Liveness Detector

**Why:** Real-time (30+ FPS on GPU), edge-optimized. YOLOv8-based anti-spoofing. Supports ONNX export for mobile.

| Spec | Value |
|------|-------|
| **Type** | YOLOv8 model (self-hosted or on-device) |
| **Liveness mode** | Passive (classifies face as REAL vs FAKE) |
| **Deployment** | FastAPI backend, React Native mobile, Next.js web |
| **Performance** | 30+ FPS on GPU |
| **Cost** | $0 (open source) + compute |
| **Export** | ONNX for cross-platform, CoreML for iOS |

### Recommended Picks by Priority

| Priority | Option | Why |
|----------|--------|-----|
| **🥇 Best overall** | **AWS Rekognition Liveness** | Required baseline. Pre-built React component. iBeta certified. Fully managed. |
| **🥈 Cheapest cloud** | **Face++ Liveness** | $0.00019/check, already integrated in POC, simple REST API |
| **🥉 Best free/OSS** | **open-face-liveness** (browser) | $0 cost, runs in-browser, MIT license, no server changes |
| **🏆 Best all-in-one** | **OpenBiometrics** | Covers all 3 spikes (OCR + face + liveness). Open source. |
| **💼 Best enterprise** | **iProov** | Government-grade, iBeta Level 2, FIDO compliant, 0% attack rate |

---

## 5. Comparison Matrix (Full)

| Criterion | AWS Rekog Liveness | MegaMatcher ID | Face++ | Azure Face | HyperVerge | Didit | iProov | MiniFASNet OSS | open-face-liveness | OpenBiometrics |
|-----------|:----------------:|:--------------:|:------:|:----------:|:----------:|:-----:|:------:|:--------------:|:------------------:|:--------------:|
| **Type** | Cloud managed | On-prem (Docker) | Cloud REST | Cloud SDK | SDK + cloud | Cloud REST | Cloud + SDK | ONNX model | Browser lib | Self-hosted platform |
| **Liveness mode** | Passive-Active | Passive/Active/Blink | Passive+Active | Passive/Passive-Active | Passive | Passive/Flash/Active3D | Dynamic+Passive | Passive | Passive+Active+Light | Passive+Active (6 modes) |
| **Certification** | iBeta L1+L2 | ISO 30107-3 L2 | Not certified | Microsoft managed | ISO 30107-3 L2 | iBeta L1 | iBeta L2, FIDO | None | None | None |
| **Pre-built UI** | ✅ Amplify React | ❌ Custom WebRTC | ❌ Custom | ✅ Vision SDK | ✅ Native SDKs | ❌ Custom | ✅ SDKs | ❌ Custom | ✅ Built-in | ✅ Built-in web |
| **Cost/txn** | $0.015 | License + infra | $0.00019 | $0.015 | Tiered | $0.10-0.15 | $0.10-0.30 | $0 + compute | $0 | $0 + compute |
| **Monthly (10K)** | $150 | $0 + infra | $1.90 | $150 | Contact | $1K-1.5K | $1K-3K | ~$20-100 | $0 | ~$20-100 |
| **Setup time** | 1-2 days | 1-2 weeks | 1-2 days | 1-2 days | 2-3 days | 1 day | 3-5 days | 1-2 days | 1 day | 1-2 days |
| **Runs in browser** | ❌ (Amplify capture → cloud) | ❌ (WebRTC → server) | ❌ (REST → server) | ❌ (SDK → cloud) | ❌ (SDK → device) | ❌ (REST → cloud) | ❌ (SDK → cloud) | ❌ (server) | ✅ Fully browser | ❌ (server) |
| **Audit trail** | 4 audit images | Video stream | Configurable | Audit images | Audit images | N/A | Audit images | N/A | Telemetry logs | Built-in |
| **Vendor lock-in** | High (AWS) | Medium | Low | High (Azure) | Medium | Medium | High | None | None | None |
| **Covers CPS-220** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Document OCR |
| **Covers CPS-221** | ✅ Face compare | ❌ | ✅ Face compare | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Face recog |

---

## 6. Integration into Existing App

The existing face-id-matcher POC can be extended with a liveness detection step. The flow would be:

```
Current:  Upload/Take Photo → Compare Faces → Result
New:      Upload/Take Photo → Liveness Check → Compare Faces → Result
```

### Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Frontend App   │     │  Python Server    │     │  Liveness Provider│
│  (React + Vite)  │────▶│  (FastAPI)        │────▶│  (AWS / REST API) │
│                  │     │  /liveness/session│     │                  │
│  ImageCapture.tsx│     │  /liveness/result │     │                  │
│  LivenessCheck   │     │  /compare         │     │                  │
│  (new component) │     │                   │     │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

### New Files Needed

| File | Purpose |
|------|---------|
| `web/src/components/LivenessCheck.tsx` | React component for liveness capture (wraps Amplify SDK or custom camera) |
| `server/providers/liveness_base.py` | Base interface for liveness providers |
| `server/providers/rekognition_liveness.py` | AWS Rekognition liveness provider |
| `server/providers/faceplusplus_liveness.py` | Face++ liveness provider |
| `server/routes/liveness.py` | FastAPI routes for liveness session management |

### Strict Rule Implementation

> **If liveness fails, block onboarding immediately and prevent data from being saved.**

In the app, this means:
- The "Compare Faces" button stays disabled until liveness passes
- No match result is computed or displayed if liveness fails
- A clear error/warning UI is shown explaining the block
- Session state resets on failure (user must retake)

```typescript
// Pseudocode for strict rule
const handleLivenessResult = (score: number) => {
  if (score < LIVENESS_THRESHOLD) {
    setLivenessPassed(false);
    setLivenessError('Liveness check failed — spoof detected. Onboarding blocked.');
    // Prevent any further processing
    return;
  }
  setLivenessPassed(true);
  setLivenessError(null);
};
```

---

## 7. POC Plan

### Phase 1: AWS Rekognition Liveness (Required Baseline)

1. Set up AWS IAM role with Rekognition + S3 permissions
2. Create S3 bucket for audit images
3. Implement `POST /liveness/create-session` and `POST /liveness/get-result` in the Python server
4. Create `LivenessCheck.tsx` React component using `@aws-amplify/ui-react-liveness`
5. Wire into the existing match flow as an optional step
6. Test with: printed photo, phone screen, digital video, and real person

### Phase 2: Face++ Liveness (Third-Party)

1. Research Face++ liveness API docs
2. Implement provider in the Python server
3. Add as a selectable provider in the liveness dropdown
4. Compare accuracy and speed vs AWS

### Phase 3: MegaMatcher Gap Analysis

1. Determine which MegaMatcher product SVI currently uses (ABIS vs ID vs SDK)
2. If MegaMatcher ID is available, deploy Docker containers and test WebRTC liveness
3. Document findings and gaps

### Phase 4: UI Integration

1. Add liveness step indicator to the existing two-column layout
2. Show liveness status (pending / in-progress / passed / failed)
3. Implement the strict block rule
4. Update the presentation and README

---

## 8. POC Implementation Progress

**Status:** Active development — passive and active liveness implemented in the face-id-matcher POC

### 8.1 What Was Built

| Component | File(s) | Description |
|-----------|---------|-------------|
| **Active Liveness (browser)** | `web/src/components/LivenessCheck.tsx` | face-api.js blink detection (EAR), head-turn challenges (left/right/up/down), continuous scoring (face size, texture, motion, blinks, challenges). Threshold: 70/100. |
| **Passive Liveness (server)** | `server/providers/liveness_passive.py` | Heuristic analysis — Laplacian variance, edge gradients, color channel variance, histogram spread, FFT frequency ratio. Score 0–20, threshold: >6 (>30%). |
| **Passive Liveness (frontend)** | `web/src/components/PassiveLivenessCheck.tsx` | Camera capture → `detectAllFaces` → closest-to-center face → draw bounding box snapshot → send full frame + bbox to backend. |
| **OpenBiometrics integration** | `server/main.py` | Proxy `/liveness/openbiometrics` endpoint → POST multipart to OpenBiometrics `/api/v1/detect` → return liveness + quality. |
| **Presentation slides** | `web/src/components/Presentation.tsx`, `web/src/data/slides.tsx` | Feature-routed presentations at `/face-id/presentation/{slide}`, `/liveness/presentation/{slide}`, `/ocr/presentation/{slide}`. |
| **Sidebar info** | `web/src/App.tsx` | Per-feature right sidebar with provider selection, descriptions, How It Works, and Why It Fails sections. |
| **Passive — Heuristic (server)** | `server/providers/liveness_passive.py` | numpy/PIL heuristic analysis (Laplacian variance, edge gradients, color/channel variance, histogram spread, FFT frequency ratio, glare/moiré/banding). Score 0–20, **threshold aligned to displayed score: `score/20 > 0.70` (≈70%)**. |
| **Passive — AWS DetectFaces** | `server/providers/liveness_aws_rekognition.py` | `DetectFaces` (Attributes=ALL) heuristic: Eyes Open (30), Mouth Natural (20, only when AWS confident mouth closed), Sharpness (25), Brightness (25). Surfaces **Predictions** (Gender, Age range, Expression). Threshold 80/100. **No nudity/inappropriate-selfie detection** in DetectFaces. |
| **Passive — Face++** | `server/providers/liveness_faceplusplus.py` | Free-plan `facepp/v3/detect` with attributes (eyestatus, blur, gender, age, smiling, emotion). Heuristic: Eyes Open + Image Quality. Surfaces **Predictions** (Age, Gender, Expression). Threshold 70/100. **Heuristic only — Free plan has no true liveness API** (see 8.2). |
| **Predictions / Facial Attributes** | backend `info` field → `PassiveLivenessCheck.tsx` + `App.tsx` | Non-scored "Predictions" group under each passive result: Age, Gender, and Expression (dominant emotion). Rendered separately from the scored "Score Breakdown". |
| **Liveness UI** | `web/src/App.tsx` | Provider dropdown subgrouped into "Functional" vs "Not functional (trying later)"; AWS DetectFaces moved to 2nd passive choice; "Video Demos" sidebar section added (top Present Slides / Demo buttons removed); playback progress-bar reset on new video. |

### 8.2 Key Findings

| Finding | Detail |
|---------|--------|
| **MiniFASNet ONNX model is broken** | The model produces identical logits (`[-3.6, -0.8, +4.4]`) for any input image — biases dominate, no discrimination between real and spoof. Cannot be used for passive liveness. |
| **Heuristic replacement built** | Rewrote passive liveness using pure numpy/PIL heuristics (Laplacian variance, edge strength, color variance, histogram spread, FFT ratio). No model file needed — runs on CPU. |
| **Scoring alignment** | Original had 3 different formulas for confidence, score, and breakdown — user sees contradictory numbers. Fixed: breakdown ×4 each (max 20), score = sum of breakdown, confidence = score/20. All three now aligned. |
| **detectSingleFace limitation** | Active liveness used `detectSingleFace` which picks highest-confidence face — wrong person when multiple faces in frame. Fixed to `detectAllFaces` + closest-to-center Manhattan distance. |
| **Render import issue** | Backend at `face-id-matcher.onrender.com` runs `uvicorn server.main:app` from `/app`, so `from providers.liveness_passive` fails. Added fallback: `try: from providers... except: from server.providers...`. |
| **Face++ Free plan has NO true liveness** | `facepp/v1/liveness` returns **404** (not on Free plan). `facepp/v3/detect` with `return_attributes=liveness` returns **400** (invalid attribute). Passive Face++ therefore uses `v3/detect` standard attributes + a heuristic score — it is NOT real liveness detection. |
| **Passive threshold contradiction fixed** | Heuristic `is_real` was checked against the internal weighted-sum `confidence` (~0.55 max) while the UI showed `score/20`. A real face at **75% displayed still failed**. Fixed: `is_real = (score/20) > 0.70`, so the threshold matches the displayed percentage. All three passive providers now use a consistent 70% threshold. |
| **AWS "Mouth Natural" covered-mouth fix** | Previously any non-open mouth scored full points, so a covered mouth falsely passed as "natural". Now scored only when AWS is **confident the mouth is closed** (Value=False & conf ≥ 70); covered/uncertain → 0 pts. |
| **Facial-attribute Predictions added** | Both AWS DetectFaces and Face++ passive results now return a non-scored `info` array (Age, Gender, Expression from dominant emotion) shown as a "Predictions" group — informative only, does not affect pass/fail. |

### 8.3 Implemented Providers

| Provider | Type | Cost | Status |
|----------|------|------|--------|
| **open-face-liveness** (default) | Browser (face-api.js) | $0, MIT | ✅ Active: blink + head-turn |
| **Passive Liveness** | Server (numpy/PIL) | $0 + compute | ✅ Passive: heuristic analysis |
| **OpenBiometrics** | Self-hosted server | $0 + hosting | ✅ Active + Passive proxied |
| **AWS DetectFaces** | Cloud REST | $0.001/check | ✅ Wired (face attributes only — not true liveness). Surfaces Predictions: Gender, Age, Expression. Threshold 80. |
| **AWS Rekognition Liveness** | Cloud KVS | ~$0.015/check | 🔧 Not yet implemented (requires KVS + WebSocket) |
| **Face++** | Cloud REST | $0.00019/check | ✅ Implemented (heuristic via `facepp/v3/detect`; Free plan has NO true liveness API). Surfaces Predictions: Age, Gender, Expression. Threshold 70. |
| **Azure Face** | Cloud REST | $0.015/check | 🔧 Not yet implemented |
| **HyperVerge** | Cloud REST | Tiered | 🔧 Not yet implemented |
| **Didit** | Cloud REST | $0.10/check | 🔧 Not yet implemented |
| **iProov** | Cloud + SDK | Enterprise | 🔧 Not yet implemented |

### 8.4 Scoring Details

**Active Liveness (0–100):**
- Face size (>100px): 0–20 pts
- Texture variance (>20): 0–20 pts
- Frame motion delta (>0.8): 0–20 pts
- Blinks: 3/5/7/10 pts depending on count
- Challenges passed (2 randomly selected from left/right/up/down): 15 pts each
- Threshold: 70/100

**Passive Liveness (0–20):**
- Sharpness (Laplacian variance): 0–4 pts
- Edges (gradient strength): 0–4 pts
- Color Depth (channel variance): 0–4 pts
- Tonal Range (histogram spread): 0–4 pts
- Detail (FFT low/high frequency ratio): 0–4 pts
- No Glare / No Moiré / No Banding: 0–4 pts each
- **Threshold: `score/20 > 0.70` (≈70%, score > 14)** — aligned to the displayed percentage so a real face at 75% now passes.

**Passive — AWS DetectFaces (0–100 → 0–20):**
- Eyes Open: 0–30 pts (penalize if closed)
- Mouth Natural: 0–20 pts (only when AWS confident mouth is closed; covered/uncertain → 0)
- Sharpness: 0–25 pts
- Brightness: 0–25 pts (≈50 ideal)
- Threshold: 80/100
- **Predictions (not scored):** Gender, Age range, Expression (dominant emotion). *No nudity/inappropriate-selfie detection in DetectFaces.*

**Passive — Face++ (0–100 → 0–20, Free-plan heuristic):**
- Face Detected: 0–20 (base)
- Eyes Open: 0–30
- Image Quality (blur): 0–30
- Smiling: 0–20
- Threshold: 70/100
- **Predictions (not scored):** Age, Gender, Expression (dominant `emotion`). *Heuristic only — Free plan has no true liveness endpoint.*

### 8.5 Deployment

| Service | URL | Type |
|---------|-----|------|
| Frontend | `vegamatcher.kevinguadalupevega.com` | Vercel (auto-deploy from master) |
| Backend API | `face-id-matcher.onrender.com` | Render (Docker, free tier — spins down after inactivity, ~50s cold start) |
| OpenBiometrics | `openbiometrics.onrender.com` | Render (Docker, free tier, fork: `kevzo8/openbiometrics`) |

---

## 9. References

- [AWS Rekognition Face Liveness Docs](https://docs.aws.amazon.com/rekognition/latest/dg/face-liveness.html)
- [AWS Amplify UI React Liveness](https://ui.docs.amplify.aws/react/connected-components/liveness)
- [AWS Rekognition Face Liveness Pricing](https://aws.amazon.com/rekognition/pricing/)
- [Neurotechnology MegaMatcher ID 2025.2](https://www.neurotechnology.com/press_release_megamatcher_id_2025.html)
- [MegaMatcher ID Web Service Docs](https://docs.faceverification.online/)
- [Face++ Liveness Detection API](https://www.faceplusplus.com/face-liveness/)
- [Mitek IDLive Face](https://www.miteksystems.com/products/face-liveness-detection)
- [KBY-AI Face Liveness SDK](https://kby-ai.com/face-liveness-detection-sdk/)
- [Banuba Face Liveness SDK](https://www.banuba.com/face-liveness-sdk)

---

## 10. Unified KYC Architecture (CPS-220 + CPS-221 + CPS-222)

All three spikes compose into a single onboarding flow within the same application:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        Unified KYC Onboarding Flow                        │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────────┐        │
│  │  STEP 1   │    │  STEP 2   │    │  STEP 3   │    │   STEP 4     │       │
│  │  Capture  │───▶│   OCR     │───▶│ Liveness  │───▶│ Face Match   │       │
│  │  ID Photo │    │ Extract   │    │  Check    │    │ ID vs Selfie │       │
│  └──────────┘    └──────────┘    └──────────┘    └──────────────┘        │
│       │                │               │                │                 │
│  CPS-221 (exists)  CPS-220 (new)   CPS-222 (new)   CPS-221 (exists)    │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  STRICT RULE: If ANY step fails → block onboarding, discard data   │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

### Provider Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Python Server (FastAPI)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │  /ocr/extract    │  │  /liveness/*     │  │  /compare        │   │
│  │  (CPS-220)       │  │  (CPS-222)       │  │  (CPS-221)       │   │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤   │
│  │ Bedrock OCR      │  │ Rekognition Live │  │ Rekognition      │   │
│  │ Textract OCR     │  │ MegaMatcher Live │  │ InsightFace      │   │
│  │ Verihubs OCR     │  │ Face++ Live      │  │ Face++           │   │
│  │ (feature flag)   │  │ (feature flag)   │  │ MegaMatcher      │   │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘   │
│                                                                       │
│  Shared: AWS credentials, S3 buckets, Docker infrastructure           │
└─────────────────────────────────────────────────────────────────────┘
```

### Pros & Cons of Unified Approach

| ✅ Pros | ❌ Cons |
|---------|---------|
| Single app for all KYC steps — lower maintenance | All three spikes must be completed for full flow |
| Shared AWS infrastructure (credentials, S3, IAM) | Feature flags needed to decouple spike delivery |
| Common React component library (ImageCapture reused) | Each provider adds latency to total onboarding time |
| Consistent UX (dark theme, same layout patterns) | Error handling must cascade across all steps |
| Strict rule easy to enforce (single state machine) | Testing complexity grows with each integration |

### Recommendations for Phased Delivery

| Phase | Spikes | Timeline | What Ships |
|-------|--------|----------|------------|
| **Phase 1** | CPS-221 (done) | Complete | Face matching POC — compare ID vs selfie |
| **Phase 2** | CPS-220 | 2-3 weeks | OCR extraction + auto-fill form |
| **Phase 3** | CPS-222 | 2-3 weeks | Liveness check step |
| **Phase 4** | All three | 1 week | Unified flow with strict block rule |

### See Also

- `CPS-220-spike-report.md` — ID OCR and auto-extraction
- `CPS-221-spike-report.md` — Face matching provider benchmarks
- This file — Liveness detection
