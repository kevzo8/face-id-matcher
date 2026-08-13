# SVI Biometrics Liveness Check Web SDK Guide

**Document Version 1.0**

---

## Table of Contents

- [1. Overview](#1-overview)
- [2. Authentication](#2-authentication)
- [3. Common Request Headers](#3-common-request-headers)
- [4. Create Session](#4-create-session)
- [5. Run Liveness](#5-run-liveness)
- [6. Response Format & Liveness Thresholds](#6-response-format--liveness-thresholds)
- [7. Error Codes](#7-error-codes)
- [8. Client SDK Configuration](#8-client-sdk-configuration)

---

## 1. Overview

The SVI Biometrics Liveness Check Web SDK verifies that a person in front of the
camera is a **live human** (and not a photo, print, or replayed video) before a
face is used for downstream identity verification.

Liveness can be performed in two modes:

- **Active:** a challenge-response flow where the user performs physical actions
  (blink, turn head, look up/down) while the camera captures the face.
- **Passive:** a single capture where life cues (blinks, micro-movement) are
  detected with no user interaction.

The SDK performs camera capture and local analysis on the client; the **final
pass/fail verdict is computed server-side** and returned to the consuming
application. The client cannot forge a pass.

### Base URLs & Service Endpoints

Base URL: `https://verify.dev.svi.cloud/api/v1`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/session/create` | POST | Create a one-time session that authorizes a single liveness check |
| `/liveness` | POST | Run an Active or Passive liveness check (requires a valid session) |
| `/health` | GET | Provider/availability check (Unauthenticated) |

> **Note:** the liveness SDK is served from the same host. Clients can reach the
> backend either through `https://verify.dev.svi.cloud/api/v1` or by pointing the
> SDK's `backendUrl` at that base (see Section 8).

---

## 2. Authentication

### 2.1 Development Mode

When `ENVIRONMENT=development`, authentication is skipped and the client app is
recorded as `dev_app`. No headers are required.

### 2.2 Production Mode

When `ENVIRONMENT=production`, a valid API key is mandatory on every protected
call.

| Header | Type | Value / Description |
|--------|------|---------------------|
| `Authorization` | Header | `Bearer <apiKey>` — the key must exist in the server's `API_KEYS` list |

---

## 3. Common Request Headers

All protected API calls (`/api/v1/session/create`, `/api/v1/liveness`) accept the
following headers:

| Header | Requirement | Description |
|--------|-------------|-------------|
| `Authorization` | Mandatory (production) | `Bearer <apiKey>` obtained during onboarding |
| `Content-Type` | Mandatory (POST bodies) | `application/json` |
| `X-Sdk-Version` | Optional | SDK version, e.g. `1.0.0`. Enables stale-SDK rejection (`SDK_MIN_VERSION`) |

---

## 4. Create Session

Creates a one-time session used to authorize a single liveness check. Each
session can be used exactly once and expires after `SESSION_TTL_MINUTES` (default
5 minutes).

```
POST [Base URL]/session/create
```

**Request:** no body. Optional `Authorization: Bearer <apiKey>` in production.

**Sample Response (200 OK):**

```json
{
  "session_id": "3f0d2c1e-9a8b-4c5d-8e7f-1a2b3c4d5e6f",
  "expires_at": "2026-08-11T00:05:00Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `session_id` | string | UUID identifying the one-time session. Use this in the `/liveness` call. |
| `expires_at` | string | ISO 8601 UTC timestamp when the session expires. |

---

## 5. Run Liveness

Runs an Active or Passive check and returns the authoritative verdict.

```
POST [Base URL]/liveness
```

### Request Fields

| Field | Type | Required? | Description |
|-------|------|-----------|-------------|
| `mode` | string | Yes | `"active"` or `"passive"` — selects the liveness flow |
| `session_id` | string | Yes | Session from Section 4 (valid, unused, not expired) |
| `image` | string | Yes | Base64-encoded JPEG of the captured face/frame |
| `challenge_data` | object\|null | Active only | Challenge scores computed by the SDK (see below) |

### Example Request — Passive

```json
{
  "mode": "passive",
  "session_id": "3f0d2c1e-9a8b-4c5d-8e7f-1a2b3c4d5e6f",
  "image": "iVBORw0KGgoAAAANSUhEUgAA..."
}
```

### Example Request — Active

`challenge_data` carries the per-challenge signals the SDK computed (e.g.
`face_size_score`, `texture_score`, `motion_score`, `challenge_score`,
`blink_score`, `flash_score`). The backend re-scores these values.

```json
{
  "mode": "active",
  "session_id": "3f0d2c1e-9a8b-4c5d-8e7f-1a2b3c4d5e6f",
  "image": "iVBORw0KGgoAAAANSUhEUgAA...",
  "challenge_data": {
    "face_size_score": 13,
    "texture_score": 8,
    "motion_score": 7,
    "challenge_score": 14,
    "blink_score": 15,
    "flash_score": 5
  }
}
```

---

## 6. Response Format & Liveness Thresholds

Both Active and Passive calls return a standardized JSON verdict.

### Sample Success Response (200 OK)

```json
{
  "passed": true,
  "confidence": 0.82,
  "txn_id": "txn-1234-5678-90ab",
  "provider": "Open Face Liveness",
  "used_fallback": false,
  "captured_face": "iVBORw0KGgoAAAANSUhEUgAA...",
  "error": null
}
```

### Response Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `passed` | boolean | Whether the liveness check passed. |
| `confidence` | float | 0–1 confidence in the verdict. |
| `txn_id` | string | Unique audit transaction id. Use this when referencing transactions in support tickets. |
| `provider` | string | Provider that produced the verdict (e.g. `Open Face Liveness`, `AWS Rekognition`). |
| `used_fallback` | boolean | Whether a fallback provider was used. |
| `captured_face` | string\|null | Base64 face snapshot, returned only when `passed=true`. |
| `error` | string\|null | Error message, if the check errored. |

### Liveness Thresholds

| Mode | Scope | Max score | Pass threshold | Confidence |
|------|-------|-----------|----------------|------------|
| Active | Client (SDK) | 90 | ≥ 63 (70%) | score / 90 |
| Active | Server (Open Face) | 100 | ≥ 75 | score / 100 |
| Passive | Client (SDK) | 50 | ≥ 35 (70%) | score / 50 |
| Passive | Server (Heuristic) | 20 | > 14 | score / 20 |

> **Important:** the server's verdict is authoritative. The client-side scores are
> provisional/UX-oriented and re-validated by the backend. Passive checks are
> additionally penalized by 30% when AWS `DetectLabels` reports a `medium` or
> `high` `spoof_risk` (e.g. a phone, screen, or photo detected).

---

## 7. Error Codes

When a request fails, the API returns a structured error object alongside an
appropriate HTTP status code.

### Error Response Structure

```json
{
  "error": "Invalid or expired session",
  "code": "INVALID_SESSION"
}
```

### Error Reference Table

| HTTP Status | Code | Description / Resolution |
|-------------|------|--------------------------|
| 400 | `INVALID_MODE` | `mode` is not `"active"` or `"passive"`. |
| 400 | `INVALID_BASE64` | The `image` payload is not valid base64. |
| 400 | `STALE_SDK` | SDK version is below `SDK_MIN_VERSION`. Upgrade and retry. |
| 400 | `SESSION_USED` | The session was already consumed (one-time use). Create a new session. |
| 401 | `UNAUTHORIZED` | Bearer token missing, expired, or not in `API_KEYS` (production). |
| 401 | `INVALID_SESSION` | Session missing, expired, or not found. |
| 500 | `SERVER_ERROR` | An unexpected error occurred server-side. Contact support if it persists. |

> **Note:** all provider/AWS failures (502-style) are surfaced in the response
> body with `passed=false` and an `error` message rather than a distinct HTTP
> status, so a failed check is never confused with an invalid request.

---

## 8. Client SDK Configuration

The SDK is delivered as a single IIFE file with MediaPipe bundled inline — no CDN,
importmap, or build step required. It exposes `window.SviLiveness`.

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

### Configuration Reference

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `backendUrl` | string | yes | Backend URL (e.g. `https://api.svi.com`) |
| `mode` | `'active' \| 'passive'` | yes | Liveness flow type |
| `containerId` | string | yes | DOM element ID for the camera UI |
| `onComplete` | function | yes | Called with the `LivenessResult` |
| `onError` | function | yes | Called with an `SdkError` |
| `apiKey` | string | no | Bearer token (omit in development) |
| `theme` | object | no | `primaryColor`, `buttonText`, `accentColor` |

### Result Shape

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
3. **Trigger the check** — clicking the on-screen button starts the flow; the SDK
   calls the backend on completion.
4. **`onComplete(result)`** — receive the verdict.
5. **`destroy()`** — release the camera and clear the UI.

---
