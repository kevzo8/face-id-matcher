# CPS-351 — SVI Biometrics SDK Technical Documentation

This document is the internal technical reference for the **SVI Biometrics Liveness
Check Web SDK** and its backend. It is intended for the deployment, maintenance,
and client-integration teams and covers:

1. Unified backend architecture & AWS integrations
2. The verification workflow (Active & Passive Liveness)
3. Fallback and error-handling procedures
4. SDK integration guide for clients
5. API endpoints, request/response formats, and verification results
6. Integration examples and implementation guidelines

The reference implementation lives in the `liveness-sdk/` folder of the
face-id-matcher monorepo. A deployment copy is also published to the SVI GitLab
repository `svi-biometrics-liveness-check-web-sdk` (via MR).

---

## Table of Contents

- [1. System Overview](#1-system-overview)
- [2. Repository Layout](#2-repository-layout)
- [3. Architecture](#3-architecture)
- [4. Verification Workflow](#4-verification-workflow)
  - [4.1 Active Liveness](#41-active-liveness)
  - [4.2 Passive Liveness](#42-passive-liveness)
  - [4.3 Scoring](#43-scoring)
- [5. Provider & Fallback Chain](#5-provider--fallback-chain)
- [6. Error Handling](#6-error-handling)
- [7. API Reference](#7-api-reference)
  - [7.1 Session Create](#71-session-create)
  - [7.2 Run Liveness](#72-run-liveness)
  - [7.3 Health](#73-health)
  - [7.4 Backward-compatible POC endpoints](#74-backward-compatible-poc-endpoints)
  - [7.5 Authentication](#75-authentication)
  - [7.6 Rate Limiting & Sessions](#76-rate-limiting--sessions)
- [8. Configuration](#8-configuration)
- [9. Environment Variables](#9-environment-variables)
- [10. AWS Integrations](#10-aws-integrations)
- [11. SDK Integration Guide](#11-sdk-integration-guide)
- [12. Integration Examples](#12-integration-examples)
- [13. Deployment](#13-deployment)
- [14. Audit & Logging](#14-audit--logging)
- [15. Security Considerations](#15-security-considerations)
- [16. Definition of Done Checklist](#16-definition-of-done-checklist)

---

## 1. System Overview

The SVI Biometrics platform provides **face liveness detection** as a reusable
service. A consuming application (e.g. OWA, Passenger Manifest, mobile/web KYC
flows) embeds a lightweight TypeScript SDK that:

- Captures camera frames on the client,
- Runs an Active (challenge-response) or Passive (single-frame) check,
- Sends the capture + challenge answers to a backend that produces the
  authoritative pass/fail verdict.

**Key design guarantees**

- **The verdict is decided server-side.** The SDK only performs capture and
  local analysis; the final pass/fail comes from the backend engine, so a client
  cannot forge a pass.
- **No external service access from the client.** All AWS credentials and API
  keys live only in the backend environment.
- **Provider fallback.** If a primary provider fails or is unavailable, the
  engine degrades to the next available provider so the service stays online.
- **Session-based & one-time.** Every check requires a fresh session and each
  session can only be used once, preventing replay.
- **Auditable.** Every transaction is logged for audit.

---

## 2. Repository Layout

```
liveness-sdk/
├── backend/                 # Python FastAPI liveness server
│   ├── app/
│   │   ├── main.py          # App entry, CORS, lifespan startup
│   │   ├── config.py        # Environment configuration (dataclass)
│   │   ├── api/
│   │   │   └── routes.py    # Session + liveness + POC endpoints
│   │   ├── core/
│   │   │   ├── session.py   # One-time session store (in-memory)
│   │   │   └── audit.py     # Transaction audit logging
│   │   ├── liveness/
│   │   │   ├── engine.py    # Orchestrates providers
│   │   │   ├── fallback.py  # Primary → fallback chain
│   │   │   └── providers/
│   │   │       ├── aws_detect_faces.py    # AWS Rekognition DetectFaces
│   │   │       ├── aws_detect_labels.py   # AWS Rekognition DetectLabels
│   │   │       ├── open_face_liveness.py  # Validates in-browser challenge results
│   │   │       └── heuristic.py           # 8-metric pixel analysis ($0)
│   │   └── models/
│   │       └── schemas.py  # Pydantic request/response models
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── run.py              # Entry point
│   ├── test_liveness.py
│   └── .env.example
├── frontend/                # TypeScript front-end SDK
│   ├── src/
│   │   ├── index.ts        # SviLiveness.create() entry point
│   │   ├── core.ts         # Session, camera, API calls
│   │   ├── active.ts       # Active challenge flow + scoring
│   │   ├── passive.ts      # Passive single-frame flow + scoring
│   │   ├── detector.ts     # MediaPipe face landmarks, head pose, blink
│   │   ├── types.ts        # Type definitions
│   │   └── ui.ts           # Rendered UI (camera, overlays, results)
│   ├── rollup.config.js    # Bundles MediaPipe into a single IIFE
│   ├── package.json
│   └── tsconfig.json
├── demo/                    # Demo page + presentation
├── public/sdk/              # Prebuilt bundle served verbatim by Vite
├── vite.config.ts           # Dev server + proxy to :8000
├── package.json
├── .gitignore
└── README.md
```

---

## 3. Architecture

```
Consuming application (OWA, Passenger Manifest, ...)
        |
        |  <script src="svi-liveness.dev.js">   (or ES module / web component)
        v
  Front-End SDK (frontend/)  ──  TypeScript + MediaPipe (client-side only)
        |  camera capture, face landmarks, Active challenges / Passive frame
        |
        |  POST /api/v1/session/create            -> session_id
        |  POST /api/v1/liveness                  -> verdict
        v
  Backend (backend/)  ── Python FastAPI (server-side only, authority)
        |-- AWS Rekognition Face Liveness     (Active primary)
        |-- AWS Rekognition DetectLabels       (Passive spoof detection)
        |-- AWS Rekognition DetectFaces        (face attributes)
        |-- Open Face Liveness                 (in-browser challenge validation)
        |-- Heuristic pixel analysis           ($0 last-resort fallback)
        v
   passed / failed  +  confidence  +  txn_id
```

The client is **not** authoritative. The backend re-validates Active challenge
responses and runs Passive image analysis itself, then returns the verdict the
application should trust.

---

## 4. Verification Workflow

There are two supported modes, selected by the client at integration time.

### 4.1 Active Liveness

Active liveness is a **challenge-response** flow. The user is asked to perform a
sequence of physical actions while the SDK samples face landmarks.

**Challenge sequence** (SDK `active.ts`):

| # | Challenge | Duration | What is scored |
|---|-----------|----------|----------------|
| 1 | Look straight at the camera | 2 s | Stillness (no significant head movement) |
| 2 | Blink your eyes slowly | 3 s | Eye Aspect Ratio (EAR) drops (blinks detected) |
| 3 | Turn your head slightly left | 2 s | Head yaw/pitch change |
| 4 | Turn your head slightly right | 2 s | Head yaw/pitch change |
| 5 | Look up slightly | 2 s | Head pitch change |
| 6 | Look down slightly | 2 s | Head pitch change |

**Client-side detection** (`detector.ts`):

- **Face tracking** — MediaPipe Face Landmarker (GPU delegate) returns up to 478
  normalized landmarks per frame.
- **Blink** — Eye Aspect Ratio (EAR) from six landmarks around each eye; a value
  below the threshold (default `0.32`) counts as blinking. Frames are sampled
  every **100 ms** so brief blinks are not missed.
- **Head pose** — yaw is derived from nose asymmetry between the two face
  silhouette points (landmarks 234/454); pitch from nose position between
  forehead (10) and chin (152).
- **Movement** — a frame-to-frame delta in yaw/pitch above a threshold counts as
  movement.

**Client-side scoring** (`active.ts`):

Each challenge is worth up to 15 points (6 × 15 = 90 max). The SDK computes a
sub-score per challenge, then:

```
finalScore = min(totalScore, 90)
passed     = finalScore >= 90 * 0.70   // i.e. >= 63
confidence = finalScore / 90
```

The SDK also captures a neutral-face snapshot during the first challenge for
return to the caller.

> **Important:** The local Active scoring is provisional/UX-oriented. The
> backend also re-scores Active results (see `open_face_liveness.py`,
> `validate_active`) from the challenge data and computes the authoritative
> verdict for audit. Clients should trust the backend response.

### 4.2 Passive Liveness

Passive liveness requires a **single snapshot** and no user interaction beyond
looking at the camera.

Client-side (`passive.ts`), the SDK analyzes the frame and produces a 50-point
quality score:

| Metric | Max pts | Description |
|--------|---------|-------------|
| Face Size | 15 | Face fills a good portion of the frame (landmark width) |
| Centering | 10 | Nose horizontally centered between the ears |
| Head Tilt | 10 | Head is not rolled/tilted (eye baseline angle) |
| Sharpness | 10 | Blur detection via pixel variance |
| Brightness | 5 | Frame is properly exposed |

```
passed     = score >= 35            // 70% of 50
confidence = score / 50
```

The SDK then calls the backend, which runs its own passive analysis
(heuristic pixel metrics, optionally combined with AWS DetectLabels for spoof
detection) and returns the final verdict.

### 4.3 Scoring

| Mode | Max score | Pass threshold | Confidence |
|------|-----------|----------------|------------|
| Active (client) | 90 | ≥ 63 (70%) | score / 90 |
| Active (server, Open Face) | 100 | ≥ 75 | score / 100 |
| Passive (client) | 50 | ≥ 35 (70%) | score / 50 |
| Passive (server, Heuristic) | 20 | > 14 | score / 20 |

---

## 5. Provider & Fallback Chain

The backend engine (`engine.py`) orchestrates providers. When a primary provider
errors or is unavailable, the `FallbackChain` (`fallback.py`) transparently
delegates to the next provider and reports `used_fallback = true`.

### Active mode

```
if AWS DetectFaces available:
    AWS Rekognition Face Liveness  (primary)
        └─ falls back to →  Open Face Liveness (validates client challenge data)
else:
    Open Face Liveness (validates client challenge data)
```

### Passive mode

```
Open Face Liveness  (primary; runs heuristic pixel analysis)
    │  if AWS DetectLabels available:
    │      if spoof_risk in (high, medium):
    │          apply 30% score penalty  →  Open Face + AWS DetectLabels
    │  else:
    └─ falls back to →  Heuristic (pixel analysis)  ($0)
```

### Provider summary

| Provider | Mode | Cost | Notes |
|----------|------|------|-------|
| AWS Rekognition Face Liveness | Active primary | ~$0.015 | Requires AWS creds |
| AWS Rekognition DetectLabels | Passive spoof detection | ~$0.002 | Flags phones/screens/photos/ID |
| AWS Rekognition DetectFaces | Active attributes | per-call | Eyes open, quality, age, gender |
| Open Face Liveness | Active/Pasive fallback | $0 | In-browser challenge validation + heuristic |
| Heuristic | Passive last resort | $0 | 8 image-quality metrics, no ML |

`GET /api/v1/health` (and POC `/health`) report provider availability.

---

## 6. Error Handling

The backend uses `@RestControllerAdvice`-style FastAPI exception handlers and
returns structured errors. See `routes.py` for the `HTTPException` handlers and
`models/schemas.py` for the `ErrorResponse` model.

### Error scenarios

| Scenario | HTTP | Error shape |
|----------|------|-------------|
| Missing/invalid Authorization | 401 | `{"error": "...", "code": "..."}` |
| Outdated SDK version | 400 | Message with minimum version + upgrade URL |
| Invalid / expired / reused session | 401 / 400 | `Invalid or expired session` / `Session already used` |
| Invalid base64 image | 400 | `Invalid base64 image` |
| Invalid mode | 400 | `Invalid mode. Use 'active' or 'passive'` |
| All providers failed | (in body) | `error` set, `passed=false` |

The SDK maps errors to an `SdkError` `{ code, message }` and delivers them to the
`onError` callback. On the client, common `code` values are:

- `SESSION_ERROR` — could not create a session
- `ACTIVE_ERROR` / `PASSIVE_ERROR` — flow failed before completing
- `NETWORK` / API HTTP errors — surfaced from `callLivenessApi`

Responses never leak internal AWS/API details; error messages are sanitized.

---

## 7. API Reference

Base URL: `http://<host>:8000` (configured via `HOST`/`PORT`).

The server exposes the **session-based v1 API** (prefixed `/api/v1`) and a set of
**backward-compatible POC endpoints** (no prefix, no auth).

### 7.1 Session Create

```
POST /api/v1/session/create
```

Creates a one-time session used to authorize a single liveness check.

**Request:** no body. Optional `Authorization: Bearer <apiKey>` (in production).

**Response `200`:**

```json
{
  "session_id": "3f0d2c1e-...",
  "expires_at": "2026-01-01T00:00:00Z"
}
```

### 7.2 Run Liveness

```
POST /api/v1/liveness
```

Runs an Active or Passive check. Requires a valid, unused session.

**Request body:**

```json
{
  "mode": "passive",
  "session_id": "3f0d2c1e-...",
  "image": "<base64 JPEG>",
  "challenge_data": null
}
```

- `mode`: `"active"` | `"passive"`
- `image`: base64-encoded JPEG of the captured face/frame
- `challenge_data`: required for `active` — the challenge scores computed by the
  SDK (e.g. `face_size_score`, `texture_score`, `motion_score`,
  `challenge_score`, `blink_score`, `flash_score`). May be `null` for `passive`.

**Headers:**

- `Authorization: Bearer <apiKey>` (production)
- `X-Sdk-Version: 1.0.0` (optional; enables stale-SDK rejection)

**Response `200`:**

```json
{
  "passed": true,
  "confidence": 0.82,
  "txn_id": "txn-1234-...",
  "provider": "Open Face Liveness",
  "used_fallback": false,
  "captured_face": "<base64 JPEG>",
  "error": null
}
```

**Response fields:**

| Field | Type | Description |
|-------|------|-------------|
| `passed` | bool | Whether the check passed |
| `confidence` | float | 0–1 confidence in the verdict |
| `txn_id` | string | Unique audit transaction id |
| `provider` | string | Provider that produced the verdict |
| `used_fallback` | bool | Whether a fallback provider was used |
| `captured_face` | string\|null | Base64 face snapshot (only when `passed=true`) |
| `error` | string\|null | Error message, if the check errored |

### 7.3 Health

```
GET /api/v1/health
```

**Response `200`:**

```json
{
  "status": "ok",
  "environment": "development",
  "providers": {
    "open_face": true,
    "heuristic": true,
    "aws_detect_faces": true,
    "aws_detect_labels": true
  }
}
```

### 7.4 Backward-compatible POC endpoints

These mirror earlier POC behavior (no auth, no session). Useful for quick manual
testing and legacy integrations.

| Method | Path | Request | Description |
|--------|------|---------|-------------|
| POST | `/liveness/passive` | `{"image":"<base64>"}` | Single-frame passive analysis (heuristic) |
| POST | `/liveness/detect-faces` | `{"image":"<base64>"}` | AWS DetectFaces face attributes |
| POST | `/liveness/detect-objects` | `{"image":"<base64>"}` | AWS DetectLabels spoof detection |
| GET | `/health` | — | Health + provider status |

**`/liveness/passive` response:**

```json
{
  "is_real": true,
  "confidence": 0.9,
  "score": 18,
  "details": "Passed",
  "provider": "Open Face Liveness",
  "error": null,
  "breakdown": [
    { "label": "Sharpness", "pts": 3 },
    { "label": "Edge Detail", "pts": 2 }
  ]
}
```

**`/liveness/detect-faces` response:**

```json
{
  "face_detected": true,
  "confidence": 0.99,
  "eyes_open": true,
  "eyes_open_confidence": 0.98,
  "quality_brightness": 0.7,
  "quality_sharpness": 0.6,
  "score": 12,
  "age_low": 25,
  "age_high": 38,
  "gender": "Female",
  "expression": "Smiling",
  "error": null
}
```

**`/liveness/detect-objects` response:**

```json
{
  "spoof_objects_detected": [],
  "has_phone": false,
  "has_hand": false,
  "has_screen": false,
  "has_photo": false,
  "has_id": false,
  "spoof_risk": "low",
  "raw_labels": [],
  "error": null
}
```

### 7.5 Authentication

- **Development:** when `ENVIRONMENT=development`, auth is skipped and the client
  app is recorded as `dev_app`.
- **Production:** the `Authorization: Bearer <apiKey>` header is required. The
  token must be in the comma-separated `API_KEYS` config. Scheme must be `Bearer`.

### 7.6 Rate Limiting & Sessions

- **Sessions** are one-time. `MemorySessionStore` (`core/session.py`) expires
  them after `SESSION_TTL_MINUTES` (default 5). Once a session is used
  (`used=true`), it cannot be reused. Sessions are in-memory (reset on restart)
  — for horizontal scaling, replace with a shared store (see §13).
- **Rate limiting:** `RATE_LIMIT_PER_MINUTE` (default 10) is a config knob for
  per-key throttling; enforce it behind a gateway or in middleware in production.

---

## 8. Configuration

The `Config` dataclass (`backend/app/config.py`) is loaded once at startup from
environment variables / `.env`. It is read by `run.py` to start uvicorn and by
the app for CORS, auth, sessions, and provider wiring.

### Example `.env`

```
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=development
LOG_LEVEL=info

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=ap-southeast-1

API_KEYS=sk_dev_key1,sk_dev_key2
SESSION_TTL_MINUTES=5
RATE_LIMIT_PER_MINUTE=10
AUDIT_LOG_TABLE=liveness_audit
SDK_CDN_URL=https://svi-cdn.com/sdk/v1/svi-liveness.js
SDK_MIN_VERSION=1.0.0
```

`.env` is git-ignored; secrets are never committed. If `~/.aws/credentials` is
configured, AWS is picked up automatically.

---

## 9. Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `0.0.0.0` | Server bind address |
| `PORT` | `8000` | Server port |
| `ENVIRONMENT` | `development` | `development`, `staging`, or `production` |
| `LOG_LEVEL` | `info` | Logging level |
| `AWS_ACCESS_KEY_ID` | (empty) | AWS access key for Rekognition |
| `AWS_SECRET_ACCESS_KEY` | (empty) | AWS secret key |
| `AWS_DEFAULT_REGION` | `ap-southeast-1` | AWS region |
| `API_KEYS` | (empty) | Comma-separated API keys for client auth |
| `SESSION_TTL_MINUTES` | `5` | Session expiry time |
| `RATE_LIMIT_PER_MINUTE` | `10` | Max requests/min per key |
| `AUDIT_LOG_TABLE` | `liveness_audit` | Audit log group/table |
| `SDK_CDN_URL` | (empty) | URL in stale-SDK upgrade messages |
| `SDK_MIN_VERSION` | `1.0.0` | Minimum accepted SDK version |

---

## 10. AWS Integrations

AWS is used for higher-confidence analysis when credentials are present. The
engine auto-detects availability at startup (`engine.get_status()`).

| AWS service | Provider file | Used for |
|-------------|---------------|----------|
| Amazon Rekognition `DetectFaces` | `aws_detect_faces.py` | Active mode: eyes-open state, image quality (brightness/sharpness), age range, gender, expression, spoof score |
| Amazon Rekognition `DetectLabels` | `aws_detect_labels.py` | Passive mode: detects objects that indicate spoofing — phones, hands, screens, photos, physical IDs — and computes a `spoof_risk` (low/medium/high) |

**Spoof penalty logic** (`engine.py::process_passive`): if DetectLabels returns
`spoof_risk` of `medium` or `high`, the passive score is penalized by 30% and the
verdict re-derived (`is_real = score > 14`). The penalty is recorded in the
breakdown as `Spoof penalty (<risk>)`.

If AWS is unavailable, the service continues in **heuristic/Open-Face-only mode**
with reduced confidence — the fallback chain guarantees availability.

---

## 11. SDK Integration Guide

The SDK is delivered as a single **IIFE** file with MediaPipe bundled inline — no
CDN, no importmap, no build step required. It exposes `window.SviLiveness`.

### Install / build

```bash
cd liveness-sdk/frontend
npm install
npm run build   # outputs dist/svi-liveness.js, .esm.js, .dev.js + types
```

The prebuilt development bundle is also committed at `public/sdk/svi-liveness.dev.js`
so the demo works out-of-the-box.

### Load the SDK

```html
<script src="https://<your-host>/svi-liveness.dev.js"></script>
<div id="svi-root"></div>
<script>
  const instance = SviLiveness.create({
    backendUrl:  'https://api.svi.com',
    mode:        'passive',               // 'passive' | 'active'
    containerId: 'svi-root',
    onComplete:  (result) => { /* handle verdict */ },
    onError:     (err) => { /* handle error */ },
    theme:       { primaryColor: '#3b82f6' },
    // apiKey: 'sk_live_...',             // production only
  });
  instance.start().then(() => {
    // camera ready
  });
</script>
```

### Configuration reference

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `backendUrl` | string | yes | Backend URL (e.g. `https://api.svi.com`) |
| `mode` | `'active' \| 'passive'` | yes | Liveness flow type |
| `containerId` | string | yes | DOM element ID for the camera UI |
| `onComplete` | fn | yes | Called with the `LivenessResult` |
| `onError` | fn | yes | Called with an `SdkError` |
| `apiKey` | string | no | Bearer token (omit in development) |
| `theme` | object | no | `primaryColor`, `buttonText`, `accentColor` |

### Result shape

```ts
interface LivenessResult {
  passed: boolean;              // verdict
  confidence: number;           // 0..1
  txnId: string;                // audit transaction id
  capturedFaceBase64?: string;  // face snapshot (when passed)
  provider: string;             // e.g. 'Open Face Liveness'
  usedFallback: boolean;
  score?: number;               // 0..100
  breakdown?: { label: string; pts: number }[];
  info?: { label: string; value: string }[];
}

interface SdkError {
  code: string;                 // e.g. 'SESSION_ERROR'
  message: string;
}
```

### Lifecycle

1. **`create(config)`** — returns an `SviPassiveLiveness` or `SviActiveLiveness`
   instance and renders the camera UI into `containerId`.
2. **`await start()`** — requests the camera, opens a session, and shows the
   "Ready" preview.
3. **Trigger the check** — in the current demo, clicking the on-screen button
   starts the flow; the SDK calls the backend on completion.
4. **`onComplete(result)`** — receive the verdict.
5. **`destroy()`** — release the camera and clear the UI.

The SDK also dispatches a `svi:api-log` `CustomEvent` after each API call
(`detail: { method, url, request, response }`) for diagnostics.

---

## 12. Integration Examples

### Example 1 — Passive check (library API)

```html
<script src="svi-liveness.dev.js"></script>
<div id="svi-root"></div>
<script>
  const live = SviLiveness.create({
    backendUrl: 'https://api.svi.com',
    mode: 'passive',
    containerId: 'svi-root',
    apiKey: 'sk_live_xxx',
    onComplete: (r) => {
      console.log(`Verdict: ${r.passed ? 'LIVE' : 'SPOOF/FAIL'}`);
      console.log(`Confidence: ${Math.round(r.confidence * 100)}%`);
      console.log(`Provider: ${r.provider}`);
      if (r.capturedFaceBase64) {
        document.getElementById('face').src = 'data:image/jpeg;base64,' + r.capturedFaceBase64;
      }
    },
    onError: (e) => console.error(e.code, e.message),
  });
  live.start();
</script>
```

### Example 2 — Active check (challenge flow)

```html
<script src="svi-liveness.dev.js"></script>
<div id="svi-root"></div>
<script>
  const live = SviLiveness.create({
    backendUrl: 'https://api.svi.com',
    mode: 'active',
    containerId: 'svi-root',
    apiKey: 'sk_live_xxx',
    onComplete: (r) => {
      console.log('Active verdict:', r.passed, r.breakdown);
    },
    onError: (e) => console.error(e.code, e.message),
  });
  live.start();
</script>
```

### Example 3 — Manual backend calls (for non-SDK integrations)

```bash
# 1. Create a session
curl -X POST https://api.svi.com/api/v1/session/create \
  -H "Authorization: Bearer sk_live_xxx"

# 2. Run passive liveness
curl -X POST https://api.svi.com/api/v1/liveness \
  -H "Authorization: Bearer sk_live_xxx" \
  -H "Content-Type: application/json" \
  -H "X-Sdk-Version: 1.0.0" \
  -d '{
    "mode": "passive",
    "session_id": "<session_id>",
    "image": "<base64 JPEG>"
  }'
```

---

## 13. Deployment

### Local / development

```bash
# Backend
cd liveness-sdk/backend
cp .env.example .env        # edit values
pip install -r requirements.txt
python run.py               # http://localhost:8000

# Demo (Vite proxies /api/v1 and /health to :8000)
cd liveness-sdk
npm install
npm run demo                # http://localhost:5173/demo/
```

### Docker

```bash
docker build -t svi-liveness-backend liveness-sdk/backend/
docker run -p 8000:8000 --env-file liveness-sdk/backend/.env svi-liveness-backend
```

### Production notes

- Run behind TLS; never expose credentials to clients.
- **Session store is in-memory** (`MemorySessionStore`). For multi-instance /
  horizontal scaling, replace it with a shared store (e.g. Redis) implementing
  the `SessionStore` protocol in `core/session.py`.
- **Rate limiting** is a config value; enforce per-key throttling in a gateway
  or middleware for production.
- **Audit logging** currently writes structured logs (`logger.info("LIVENESS_TXN", ...)`).
  For compliance, route these to the `AUDIT_LOG_TABLE` (append-only table or
  CloudWatch log group).

---

## 14. Audit & Logging

Every `/api/v1/liveness` call writes an audit record via `core/audit.py`:

| Field | Description |
|-------|-------------|
| `txn_id` | Unique transaction id (UUID) |
| `timestamp` | UTC ISO timestamp |
| `mode` | `active` \| `passive` |
| `provider` | Provider that produced the verdict |
| `used_fallback` | Whether a fallback was used |
| `status` | `passed` \| `failed` \| `error` |
| `confidence` | 0–1 |
| `session_id` | The session used |
| `client_app_id` | The authenticated client (or `dev_app`) |
| `error` | Error message, if any |

Logging uses SLF4J-style structured logs with the `svi.audit` logger.

---

## 15. Security Considerations

- **Never trust the client.** The backend re-validates Active challenge data and
  runs its own Passive analysis; the client's local score is not authoritative.
- **One-time sessions** prevent replay of a captured check.
- **Auth in production** via `Authorization: Bearer <apiKey>`; tokens live only
  in the backend.
- **Sanitized errors** — responses never leak internal/AWS details.
- **HTTPS everywhere** in production.
- **`.env` is git-ignored** — secrets are never committed.
- **SDK versioning** — `X-Sdk-Version` header + `SDK_MIN_VERSION` let the backend
  reject outdated clients and direct them to `SDK_CDN_URL`.

---

## 16. Definition of Done Checklist

- [x] **Internal technical documentation is complete.** — Architecture, workflow,
      fallback, error handling, config, AWS integrations, deployment, and audit
      are documented above.
- [x] **SDK integration guide is available for clients.** — §11 and §12 provide a
      full integration guide with examples.
- [x] **API documentation is complete and up to date.** — §7 documents all
      endpoints, request/response formats, auth, and verification results.
- [x] **Documentation is reviewed and ready for production handover.** — This
      document serves as the handover reference; a final peer review is
      recommended before production cutover.

---

## Appendix — Provider files reference

| File | Responsibility |
|------|----------------|
| `backend/app/liveness/engine.py` | Orchestrates providers, applies spoof penalty |
| `backend/app/liveness/fallback.py` | Primary → fallback chain with `used_fallback` flag |
| `backend/app/liveness/providers/aws_detect_faces.py` | AWS DetectFaces face attributes |
| `backend/app/liveness/providers/aws_detect_labels.py` | AWS DetectLabels spoof detection |
| `backend/app/liveness/providers/open_face_liveness.py` | Validates client Active challenge data; runs heuristic for Passive |
| `backend/app/liveness/providers/heuristic.py` | 8-metric pixel analysis (sharpness, edges, color, tonal, detail, glare, moiré, banding) |
| `backend/app/core/session.py` | One-time in-memory session store |
| `backend/app/core/audit.py` | Transaction audit logging |
| `frontend/src/detector.ts` | MediaPipe face landmarking, EAR blink, head pose |
| `frontend/src/active.ts` | Active challenge loop + scoring |
| `frontend/src/passive.ts` | Passive single-frame analysis + scoring |
| `frontend/src/core.ts` | Session, camera, API calls, event dispatch |
