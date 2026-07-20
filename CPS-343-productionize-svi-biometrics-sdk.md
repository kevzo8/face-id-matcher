# CPS-343: Productionize SVI Biometrics Liveness SDK

## Overview

Transform the current SVI Biometrics POC into a production-ready liveness detection platform. Consolidate backend services, build a lightweight frontend SDK, and integrate all liveness engines into a single secure backend.

**Critical Rule:** The SDK only captures liveness. It does **not** perform identity verification. After liveness succeeds, the client's backend calls the SVI Verification API separately.

---

## Architecture

```
CLIENT ENVIRONMENT
  ┌─────────────────────────────────────┐
  │   Client Mobile/Web App             │
  │   ┌──────────────────────┐          │
  │   │ SVI Liveness SDK     │          │
  │   │ • Camera Capture     │          │
  │   │ • Active/Passive UI  │          │
  │   │ • Session Handling   │          │
  │   └──────────┬───────────┘          │
  └──────────────┼──────────────────────┘
                 │ HTTPS
                 ▼
SVI BIOMETRICS PLATFORM
  ┌─────────────────────────────────────┐
  │ API Gateway (+ Cognito Auth)        │
  └──────────────┬──────────────────────┘
                 ▼
  ┌─────────────────────────────────────┐
  │ Unified Liveness Backend            │
  │ • Session Management                │
  │ • Active/Passive Orchestration      │
  │ • AWS Service Integration           │
  │ • Fallback Logic                    │
  │ • Audit Logging                     │
  └──────┬─────────────────────┬────────┘
         │                     │
         ▼                     ▼
  AWS Rekognition         Open Face
  Face Liveness + KVS     Liveness
         │                     │
         └──────────┬──────────┘
                    ▼
         DetectFaces / DetectLabels
                    ▼
         Liveness Result + Face Image
                    ▼
              Returned to SDK
                    ▼
           Client Mobile/Web App
                    ▼
    (Client Backend calls separately)
                    ▼
  ┌─────────────────────────────────────┐
  │ Client Backend                      │
  │ Calls SVI Verification API with:    │
  │ • Captured Face Image               │
  │ • Government ID / Demographics      │
  └──────────────┬──────────────────────┘
                 ▼
  ┌─────────────────────────────────────┐
  │ SVI Verification API                │
  │ • Performs 1:1 Identity Verification│
  │ • Returns Verification Result       │
  └─────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Backend Integration & Migration

**Goal:** Move all AWS services into the main production repo.

**Current POC services to migrate:**
- `server/providers/liveness_aws_rekognition.py` — AWS Rekognition DetectFaces
- `server/providers/liveness_passive.py` — Heuristic passive engine
- `/liveness/detect-faces` endpoint
- `/liveness/detect-objects` endpoint (AWS DetectLabels)
- `/liveness/passive` endpoint

**Steps:**
1. Create a new production repo (or a `production/` directory in the existing backend)
2. Copy/move all liveness provider code — strip POC-only logic
3. Add API Gateway + Cognito auth to all endpoints
4. Refactor so the SDK calls `POST /api/v1/liveness/{mode}` — the backend handles all AWS calls
5. Add internal transaction ID generation (UUID per request)
6. Write integration tests

**Files to create:**
```
backend/
├── api/
│   ├── __init__.py
│   ├── gateway.py          # FastAPI app, Cognito middleware
│   └── routes/
│       ├── __init__.py
│       ├── liveness.py     # POST /api/v1/liveness/active, /passive
│       └── session.py      # POST /api/v1/session/create
├── core/
│   ├── __init__.py
│   ├── config.py           # Env-based config (AWS keys, fallback flags)
│   ├── session.py          # Session manager (Redis or DB-backed)
│   └── logging.py          # Structured audit logger
├── liveness/
│   ├── __init__.py
│   ├── engine.py           # Orchestrator: routes to correct provider
│   ├── providers/
│   │   ├── __init__.py
│   │   ├── aws_face_liveness.py   # AWS Rekog Face Liveness + KVS
│   │   ├── open_face_liveness.py  # Open Face Liveness
│   │   ├── aws_detect_faces.py    # AWS DetectFaces
│   │   ├── aws_detect_labels.py   # AWS DetectLabels
│   │   └── heuristic.py           # 8-metric passive heuristic
│   └── fallback.py          # Primary → fallback switch logic
├── models/
│   ├── __init__.py
│   ├── request.py           # Request schemas
│   └── response.py          # Response schemas
├── requirements.txt
├── Dockerfile
└── tests/
    ├── test_liveness.py
    ├── test_fallback.py
    └── conftest.py
```

---

### Phase 2: Unified Liveness Engine

**Goal:** A single backend endpoint that routes to the correct liveness provider.

#### Request Flow

```
Client → POST /api/v1/liveness
         Headers: Authorization: Bearer <token>
                  X-Session-Id: <uuid>
         Body: {
           "mode": "active" | "passive",
           "image": "<base64>",        // single frame for passive
           "challenge_data": {...}     // for active (head turn, flash)
         }

Backend:
  1. Validate session + auth
  2. Select provider based on mode:
     - active  → AWS Rekog Face Liveness (primary)
               → Open Face Liveness (fallback)
     - passive → Open Face Liveness (primary)
               → AWS DetectFaces + DetectLabels + Heuristic (combined)
  3. If primary fails, try fallback
  4. Log: { txn_id, mode, provider, used_fallback, timestamp, status }
  5. Return: { liveness_passed, confidence, captured_face, txn_id }
```

#### Liveness Modes

| Mode | Primary | Fallback | Cost |
|------|---------|----------|------|
| Active (Registration) | AWS Rekog Face Liveness + KVS | Open Face Liveness | ~$0.015/check → $0 |
| Passive (Authentication) | Open Face Liveness | AWS DetectFaces + DetectLabels + Heuristic | $0 → ~$0.002/check |

#### Audit Log Schema

```json
{
  "txn_id": "uuid",
  "mode": "active|passive",
  "provider": "aws_face_liveness|open_face_liveness",
  "used_fallback": false,
  "timestamp": "2026-07-20T12:00:00Z",
  "status": "passed|failed",
  "confidence": 0.95,
  "client_app_id": "string",
  "session_id": "uuid"
}
```

---

### Phase 3: Production SDK (Plugin)

**Goal:** A lightweight, auto-updating SDK that client apps can drop in.

#### SDK Requirements

- **Size:** < 100KB gzipped
- **Framework-agnostic:** Vanilla JS/TS, works with React, Vue, Angular, or plain HTML
- **Camera:** Physical camera preferred over virtual/OBS
- **Modes:** Active (head turn + blink + flash) and Passive (single snapshot)
- **Auto-update:** Load latest SDK version from CDN (`https://svi-cdn.com/sdk/v1/svi-liveness.js`)
- **No direct AWS calls** — all communication goes through the SVI Liveness Backend

#### SDK API

```typescript
interface SviLivenessConfig {
  backendUrl: string;         // SVI Liveness Backend URL
  apiKey: string;             // Client API key
  mode: 'active' | 'passive';
  onComplete: (result: LivenessResult) => void;
  onError: (error: SdkError) => void;
  containerId: string;        // DOM element ID to mount the camera UI
  theme?: {
    primaryColor?: string;
    buttonText?: string;
  };
}

interface LivenessResult {
  passed: boolean;
  confidence: number;
  txnId: string;
  capturedFaceBase64?: string;  // or a secure reference URL
  provider: string;
  usedFallback: boolean;
}

// Usage:
const sdk = new SviLiveness({
  backendUrl: 'https://api.svi.com/v1',
  apiKey: 'sk_live_xxx',
  mode: 'passive',
  containerId: 'liveness-container',
  onComplete: (result) => {
    console.log('Liveness:', result.passed);
    // Send result.txnId + capturedFaceBase64 to your backend
    // Your backend then calls SVI Verification API
  },
  onError: (error) => console.error(error),
});

sdk.start();
```

#### SDK File Structure

```
sdk/
├── svi-liveness.js          # Bundled SDK (single file)
├── svi-liveness.css         # Styles (inlined in production build)
├── src/
│   ├── index.ts             # Main entry, SviLiveness class
│   ├── camera.ts            # Camera manager (prefers physical cams)
│   ├── active.ts            # Active liveness flow
│   ├── passive.ts           # Passive liveness flow
│   ├── api.ts               # Backend communication
│   ├── ui.ts                # Camera UI + feedback
│   ├── session.ts           # Session management
│   └── utils.ts             # Helpers
├── dist/
│   ├── svi-liveness.js
│   └── svi-liveness.min.js
├── package.json
├── tsconfig.json
└── README.md
```

---

### Phase 4: SDK & Backend Integration

**Goal:** Wire the SDK to the backend with secure sessions.

#### Session Flow

```
1. Client backend calls POST /api/v1/session/create
   → Returns { session_id, expires_at }

2. Client frontend initializes SDK with session_id

3. SDK starts liveness capture:
   a. Creates a WebRTC/RTC connection for camera
   b. For active: sends frames + challenge responses to backend
   c. For passive: sends single frame to backend

4. Backend processes liveness, logs audit entry

5. Backend returns result to SDK

6. SDK returns { passed, confidence, captured_face, txn_id } to client app

7. Client backend calls SVI Verification API:
   POST /api/v1/verify
   Body: { txn_id, captured_face, government_id, demographics }
```

---

## Testing Strategy

### Test APIs for Development

Since you don't have a production AWS account yet, here are your options:

#### Option A: Use the Existing POC Backend

The current backend at `https://face-id-matcher.onrender.com` already has working endpoints:

| Endpoint | What it does | Cost |
|----------|-------------|------|
| `POST /liveness/passive` | Heuristic, AWS, Face++ passive check | $0 for heuristic, ~$0.001 for AWS |
| `POST /liveness/detect-faces` | AWS DetectFaces attributes | ~$0.001 |
| `POST /liveness/detect-objects` | AWS DetectLabels spoof detection | ~$0.001 |
| `POST /liveness/openbiometrics` | OpenBiometrics proxy | $0 (self-hosted) |

You can use these endpoints during development by wrapping them behind your new API Gateway.

#### Option B: AWS Free Tier

- **AWS Rekognition:** Free tier = 5,000 images/month for first 12 months
- **AWS Kinesis Video Streams:** 100 hours of video ingested/month free
- Sign up at https://aws.amazon.com/free

Use the AWS CLI or SDK to test:
```bash
# Test DetectFaces
aws rekognition detect-faces \
  --image '{"S3Object":{"Bucket":"my-bucket","Name":"face.jpg"}}' \
  --attributes ALL

# Test DetectLabels
aws rekognition detect-labels \
  --image '{"S3Object":{"Bucket":"my-bucket","Name":"frame.jpg"}}' \
  --max-labels 50 --min-confidence 70
```

#### Option C: Open Source Fallbacks (for testing without AWS)

| Tool | What it does | How to run |
|------|-------------|------------|
| Open Face Liveness (in POC) | Browser-based face tracking, blink detection, flash analysis | Already in `web/src/components/LivenessCheck.tsx` |
| Heuristic Passive (in POC) | 8-metric pixel analysis | Already in `server/providers/liveness_passive.py` |
| InsightFace | Self-hosted face detection + anti-spoof | `pip install insightface` |
| MiniFASNet | Anti-spoofing model (used by OpenBiometrics) | `pip install torch; wget model.pth` |

#### Option D: Postman Collection

Create a Postman collection to test endpoints manually:

```json
POST {{base_url}}/api/v1/liveness
Content-Type: application/json
Authorization: Bearer {{token}}

{
  "mode": "passive",
  "image": "{{base64_image}}"
}
```

---

## Development Quickstart

### 1. Backend Setup

```bash
# From the face-id-matcher repo

# Install Python dependencies
cd server
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env with your AWS keys (or leave blank to use heuristic-only mode)

# Run the server
uvicorn main:app --reload --port 8000

# Test the passive endpoint
curl -X POST http://localhost:8000/liveness/passive \
  -H "Content-Type: application/json" \
  -d '{"image": "<base64>", "provider": "heuristic"}'
```

### 2. SDK Development

```bash
cd sdk  # new directory

# Initialize
npm init -y
npm install typescript rollup @rollup/plugin-typescript --save-dev

# Start development
npx rollup -c -w

# The SDK will be built to dist/svi-liveness.js
# Load it in any HTML page:
# <script src="https://svi-cdn.com/sdk/v1/svi-liveness.js"></script>
```

### 3. Testing in the Browser

Open the existing POC web app:
```bash
cd web
npm run dev
```

Navigate to `http://localhost:5173/liveness` to test active/passive liveness with the current providers.

---

## Key Differences from POC

| Aspect | POC | Production |
|--------|-----|------------|
| AWS calls | Direct from frontend or simple proxy | Server-side only via API Gateway |
| Auth | None | Cognito + API keys |
| Session mgmt | None | Session-based with expiry |
| Logging | Console.log | Structured audit logs |
| SDK | Embedded in App.tsx | Separate npm/CDN package |
| Fallback | Manual dropdown selection | Automatic |
| Deployment | Render.com free tier | Production AWS/GCP |
| Identity verification | Mixed with liveness | Completely separate |

---

## Next Steps

1. **Create the production backend repo** with the structure above
2. **Migrate existing providers** from `face-id-matcher/server/providers/`
3. **Add API Gateway + Cognito** authentication
4. **Build the SDK** as a standalone package
5. **Write tests** for each provider and the fallback logic
6. **Deploy** the backend to staging
7. **Integrate** the SDK with a test client app
8. **Document** the API and SDK usage

---

## Resources

- **Current POC:** https://face-id-matcher.onrender.com
- **CPS-222 (Liveness):** `/liveness/presentation/0`
- **CPS-289 (Architecture):** `/biometric/presentation/0`
- **Liveness SDK demo:** https://screenrec.com/share/jARxoyaW2G

## Open Questions

1. Where will the production backend be deployed? (AWS ECS? Render? On-prem?)
2. Do we have production AWS credentials with Rekognition + KVS access?
3. What's the target client platform first? (Web? iOS? Android?)
4. Who manages the CDN for SDK auto-updates?
5. What's the SLA for the liveness backend?

---

## Additional Considerations

### Security & Data Privacy

| Concern | Mitigation |
|---------|-----------|
| Face image storage | Do **not** store raw face images longer than needed. Return a secure reference (e.g., signed S3 URL with 5-min TTL) instead of base64 when possible. |
| Encryption in transit | All SDK ↔ Backend communication must use **TLS 1.2+**. API Gateway enforces HTTPS only. |
| Encryption at rest | AES-256 for any stored face data or audit logs containing PII. |
| Token expiry | Session tokens should expire after **5 minutes**. Require refresh. |
| Anti-replay | Each session ID is single-use. Timestamp + nonce in every request. |
| Data retention policy | Audit logs: 90 days. Face images: deleted immediately after verification result is returned. |
| PII scope | The backend **never** receives government IDs, names, or demographics — only face images. PII stays with the client. |

### Compliance

- **iBeta L1/L2 Certification** — Required if marketing as "liveness detection." AWS Rekognition Face Liveness is iBeta L1+L2 certified. Open Face Liveness is **not** certified — use it only as fallback and clearly document the limitation.
- **ISO 30107-3** — Presentation Attack Detection (PAD) standard. AWS meets this. Document which levels your solution covers.
- **Data Privacy** — If operating in the Philippines, comply with **PIPEDA**. If EU users, comply with **GDPR**. Face data is biometric PII under both.
- **Audit Trail** — All liveness transactions must be logged immutably (append-only DB table or CloudWatch Logs with IAM restrictions) for regulatory review.

### Error Handling & Edge Cases

| Scenario | Behavior |
|----------|----------|
| Camera denied | SDK shows clear error: "Camera access required." Don't silently fail. |
| No face detected | Return `{ passed: false, reason: "no_face_detected" }`. Client can retry. |
| Low confidence | Return `{ passed: false, reason: "low_confidence", confidence: 0.45 }`. |
| Network timeout | SDK retries **3 times** with exponential backoff (1s, 2s, 4s). Then fails with `network_error`. |
| Backend 5xx | Fallback provider kicks in automatically. If all providers fail, return `service_unavailable`. |
| Session expired | SDK returns `session_expired`. Client must create a new session. |
| Multiple rapid requests | Rate limit: **10 requests/minute per API key**. Return 429 if exceeded. |
| SDK version mismatch | Backend checks `X-Sdk-Version` header. If incompatible, return 400 with upgrade URL. |

### Performance Targets

| Metric | Target |
|--------|--------|
| Passive liveness latency | < 2 seconds (end-to-end) |
| Active liveness latency | < 10 seconds (end-to-end) |
| SDK load time | < 500ms (gzipped) |
| Backend P95 response time | < 1 second |
| Concurrent sessions | Scale to 1000+ per instance |
| Uptime SLA | 99.9% (8.76 hours downtime/year) |

### Cost Analysis at Scale

| Provider | Per-check | 10K/mo | 100K/mo | 1M/mo |
|----------|-----------|--------|---------|-------|
| AWS Rekog Face Liveness + KVS | ~$0.015 | $150 | $1,500 | $15,000 |
| AWS DetectFaces | ~$0.001 | $10 | $100 | $1,000 |
| AWS DetectLabels | ~$0.001 | $10 | $100 | $1,000 |
| Open Face Liveness | $0 | $0 | $0 | $0 |
| Heuristic Passive | $0 | $0 | $0 | $0 |

**Strategy:** Use Open Face Liveness + Heuristic as the primary path ($0/check). Only incur AWS costs when higher assurance is needed (e.g., high-value transactions).

### Mobile Platform Support

| Platform | Approach |
|----------|----------|
| Web (POC exists) | Vanilla JS SDK. Works in Chrome, Safari, Firefox, Edge. |
| iOS (new) | Swift SDK using `AVFoundation` for camera. WebRTC for KVS. |
| Android (new) | Kotlin SDK using `CameraX` for camera. WebRTC for KVS. |
| React Native (new) | Wrap native SDKs with a JS bridge. |

**Recommendation:** Ship Web SDK first (leverage existing code). Then iOS, then Android.

### CI/CD Pipeline

```
Git push → GitHub Actions:
  1. Lint (ESLint + Prettier for SDK, Flake8 for backend)
  2. Type-check (tsc --noEmit)
  3. Unit tests (Jest for SDK, pytest for backend)
  4. Build (rollup for SDK, Docker for backend)
  5. Integration tests (against staging backend)
  6. Push to CDN (S3 + CloudFront for SDK)
  7. Deploy backend (ECS/GCP Run)
  8. Smoke tests (Ping endpoints, run one liveness check)
```

### Monitoring & Alerting

- **Backend:** Log all requests with `txn_id`. Key metrics:
  - `liveness.success_rate` — alert if < 95%
  - `liveness.p95_latency` — alert if > 2s
  - `liveness.fallback_rate` — alert if > 10% (means primary provider is degrading)
  - `aws.errors` — alert on any AWS API error
- **SDK:** Track `sdk.load_time`, `sdk.error_rate`, `sdk.version_distribution`
- **Dashboard:** Datadog/Grafana with separate views for engineering and business (audit).

### API Versioning

```
https://api.svi.com/v1/liveness     ← stable
https://api.svi.com/v2/liveness     ← future
```

- Include `X-Api-Version` header in SDK requests
- Backward-compatible changes (new fields): minor version bump
- Breaking changes (removed fields): major version bump, deprecate v1 with 6-month notice

### Deliverables Checklist

- [ ] Production backend repo created with structure above
- [ ] All 4 providers migrated: AWS Rekog Face Liveness, Open Face Liveness, DetectFaces, DetectLabels
- [ ] Heuristic passive engine migrated
- [ ] API Gateway + Cognito auth integrated
- [ ] Session management (create/validate/expire)
- [ ] Audit logging (structured, immutable)
- [ ] Fallback logic (primary → fallback → error)
- [ ] SDK package built and published to CDN
- [ ] SDK auto-update mechanism (version check on init)
- [ ] SDK documentation (README, JSDoc, integration guide)
- [ ] Backend API documentation (OpenAPI/Swagger)
- [ ] Integration tests covering all modes and fallback scenarios
- [ ] Performance testing (latency, concurrency)
- [ ] Security review (pen test or automated scan)
- [ ] Deployment pipeline (CI/CD)
- [ ] Monitoring dashboard
- [ ] Demo/test app (simple HTML page or mobile app)

