# SVI Biometrics Liveness Check Web SDK

Production-ready **face liveness detection** SDK (camera + active/passive checks)
paired with a **FastAPI backend** that orchestrates multiple liveness providers.
Built for the SVI Biometrics platform and reusable across web applications.

## Architecture

```
Consuming application (OWA, Passenger Manifest, ...)
        |
        |  <svi-liveness> web component / SDK (camera UI)
        v
  Front-End SDK (frontend/)   <-- TypeScript, MediaPipe face detection, no backend logic
        |
        |  POST /api/v1/session/create  ->  session_id
        |  POST /api/v1/liveness        ->  result (image + challenge)
        v
  Backend (backend/)     <-- Python FastAPI (server-side only)
        |-- AWS Rekognition Face Liveness   (active, primary)
        |-- AWS DetectFaces / DetectLabels  (passive, spoof detection)
        |-- Open Face Liveness              (fallback)
        |-- Heuristic pixel analysis        ($0 fallback)
        v
   passed / failed  +  confidence  +  txn_id
```

## Key guarantees

- **Liveness never decided in the browser.** The SDK captures camera frames and
  runs challenges locally, but the *pass/fail verdict* is produced by the backend
  engine from provider analysis. The client cannot forge a pass.
- **No external service access from the client.** AWS credentials and API keys
  live only in the backend environment. Every check routes through the backend.
- **Two modes.** `active` (multi-step challenge flow, e.g. "smile", "blink")
  and `passive` (single snapshot analysis).
- **Provider fallback.** If the primary provider fails or is unavailable, the
  engine degrades gracefully to the next available provider (AWS → Open Face →
  Heuristic) so the service stays online at reduced cost.
- **Session-based & audited.** Each check requires a one-time session, and every
  transaction is logged for audit.
- **Sanitized errors.** Responses never leak internal or external API details.

## Liveness modes

| Mode | Primary | Fallback | Cost |
|------|---------|----------|------|
| Active | AWS Rekognition Face Liveness | Open Face Liveness | ~$0.015 → $0 |
| Passive | Open Face Liveness | AWS DetectFaces + DetectLabels + Heuristic | $0 → ~$0.002 |

## Repository layout

```
.
├── backend/              # Python FastAPI liveness server
│   ├── app/
│   │   ├── api/routes.py     # Session + liveness endpoints
│   │   ├── config.py         # Environment configuration
│   │   ├── core/             # Session management + audit logging
│   │   ├── liveness/         # Orchestrator, fallback, providers
│   │   └── models/schemas.py # Request/response schemas
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── run.py                # Entry point
│   └── .env.example
├── frontend/             # TypeScript front-end SDK
│   ├── src/                  # active, passive, core, detector, ui
│   ├── rollup.config.js      # bundles MediaPipe into a single IIFE
│   ├── tsconfig.json
│   └── package.json
├── demo/                 # demo page + presentation
├── vite.config.ts        # dev server + proxy to :8000
├── package.json
├── .gitignore
└── README.md
```

## Backend

### 1. Configure (one time)

Copy the template to a real `.env` file and fill in your values (AWS is optional;
leave blank to run in fallback-only mode):

```bash
cd backend
cp .env.example .env
# edit .env  ->  AWS keys + region, API_KEYS, SESSION_TTL_MINUTES, ...
```

`.env` is **git-ignored** — secrets are never committed. If you already ran
`aws configure`, AWS reads `~\.aws\credentials` automatically.

### 2. Install & run

```bash
cd backend
pip install -r requirements.txt
python run.py
# Server starts at http://localhost:8000
```

Or via Docker:

```bash
docker build -t svi-liveness-backend backend/
docker run -p 8000:8000 --env-file backend/.env svi-liveness-backend
```

### API endpoints

New session-based API (v1):

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/session/create` | Create a one-time liveness session |
| POST | `/api/v1/liveness` | Run a liveness check (active or passive) |
| GET | `/api/v1/health` | Health check + provider status |

Backward-compatible POC endpoints (no auth):

| Method | Path | Description |
|--------|------|-------------|
| POST | `/liveness/passive` | Single-frame passive liveness analysis |
| POST | `/liveness/detect-faces` | AWS DetectFaces face attributes |
| POST | `/liveness/detect-objects` | AWS DetectLabels spoof detection |
| GET | `/health` | Health check |

**1. Create a session:**

```json
POST /api/v1/session/create
```

```json
{ "session_id": "a1b2c3", "expires_at": "2026-01-01T00:00:00Z" }
```

**2. Run a liveness check** (send a base64 image; for `active`, include the
challenge answers):

```json
POST /api/v1/liveness
{
  "mode": "passive",
  "session_id": "a1b2c3",
  "image": "<base64>"
}
```

Response:

```json
{
  "passed": true,
  "confidence": 0.98,
  "txn_id": "txn-123",
  "provider": "open_face",
  "used_fallback": false,
  "captured_face": "<base64>",
  "error": null
}
```

## Environment variables

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
| `RATE_LIMIT_PER_MINUTE` | `10` | Max requests per minute per key |
| `AUDIT_LOG_TABLE` | `liveness_audit` | Append-only audit log group/table |
| `SDK_CDN_URL` | - | URL used in stale-SDK upgrade messages |
| `SDK_MIN_VERSION` | `1.0.0` | Minimum accepted SDK version |

## Front-End SDK

The SDK is bundled into a single IIFE file (MediaPipe included inline) — no CDN,
no importmap, no build step needed on the consuming side.

```bash
cd frontend
npm install
npm run build   # outputs dist/svi-liveness.js, .esm.js, .dev.js + types
```

### Usage

Load the bundle, then create an instance:

```html
<script src="./dist/svi-liveness.dev.js"></script>
<div id="svi-root"></div>
<script>
  const instance = SviLiveness.create({
    backendUrl:  'http://localhost:8000',
    mode:        'passive',          // 'passive' | 'active'
    containerId: 'svi-root',
    onComplete:  (result) => {
      console.log('passed:', result.passed,
                  'confidence:', result.confidence,
                  'provider:', result.provider,
                  'txn:', result.txnId);
    },
    onError:     (err) => console.error(err.code, err.message),
    theme:       { primaryColor: '#3b82f6' },
  });
  await instance.start();            // request camera + init
  instance.startCheck();             // begin the liveness flow
</script>
```

### Configuration reference

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `backendUrl` | string | yes | Backend URL (e.g. `http://localhost:8000`) |
| `mode` | `'active' \| 'passive'` | yes | Liveness flow type |
| `containerId` | string | yes | DOM element ID for the camera UI |
| `onComplete` | fn | yes | Called with the `LivenessResult` |
| `onError` | fn | yes | Called with an `SdkError` |
| `apiKey` | string | no | Bearer token (omit in development) |
| `theme` | object | no | `primaryColor`, `buttonText`, `accentColor` |

Result shape:

```ts
interface LivenessResult {
  passed: boolean;
  confidence: number;
  txnId: string;
  capturedFaceBase64?: string; // only present when liveness passed
  provider: string;
  usedFallback: boolean;
  score?: number;
  breakdown?: { label: string; pts: number }[];
  info?: { label: string; value: string }[];
}
```

## Demo

1. Start the backend: `cd backend && python run.py` (serves on `:8000`).
2. Serve the demo: `npm install && npm run demo` (starts vite on `:5173`,
   proxying liveness API calls to `:8000`).
3. Open `http://localhost:5173/demo/`, allow camera access, and click
   **Start Check**.

The demo supports both **Passive** (single snapshot) and **Active**
(six-step challenge) modes and logs every API call to the output panel.

## Notes

- Active liveness requires the AWS Rekognition Face Liveness provider (or a
  local fallback). Without AWS credentials configured, the backend runs in
  heuristic/open-face fallback mode.
- Always use HTTPS + the API key when deploying outside development.
