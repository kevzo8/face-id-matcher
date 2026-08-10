# SVI Biometrics Liveness Backend

Production-ready liveness detection server for the SVI Biometrics platform.

## Architecture

```
Client SDK → POST /api/v1/liveness → Liveness Engine → AWS / Open Face / Heuristic → Result
```

## Quick Start

```bash
cd backend
cp .env.example .env
# Edit .env with your AWS keys (or leave blank for heuristic-only mode)

pip install -r requirements.txt
python run.py
# Server starts at http://localhost:8000
```

## API Endpoints

### New API (session-based)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/session/create` | Create a liveness session |
| POST | `/api/v1/liveness` | Run liveness check (active or passive) |
| GET | `/api/v1/health` | Health check + provider status |

### Backward-compatible POC endpoints (no auth)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/liveness/passive` | Single-frame passive liveness analysis |
| POST | `/liveness/detect-faces` | AWS DetectFaces face attributes |
| POST | `/liveness/detect-objects` | AWS DetectLabels spoof detection |
| GET | `/health` | Health check |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `0.0.0.0` | Server bind address |
| `PORT` | `8000` | Server port |
| `ENVIRONMENT` | `development` | `development`, `staging`, or `production` |
| `LOG_LEVEL` | `info` | Logging level |
| `AWS_ACCESS_KEY_ID` | (empty) | AWS access key for Rekognition |
| `AWS_SECRET_ACCESS_KEY` | (empty) | AWS secret key |
| `AWS_DEFAULT_REGION` | `ap-southeast-1` | AWS region |
| `API_KEYS` | (empty) | Comma-separated API keys for auth |
| `SESSION_TTL_MINUTES` | `5` | Session expiry time |
| `RATE_LIMIT_PER_MINUTE` | `10` | Max requests per minute per key |

## Liveness Modes

| Mode | Primary | Fallback | Cost |
|------|---------|----------|------|
| Active | AWS Rekognition Face Liveness | Open Face Liveness | ~$0.015 → $0 |
| Passive | Open Face Liveness | AWS DetectFaces + DetectLabels + Heuristic | $0 → ~$0.002 |

## Docker

```bash
docker build -t svi-liveness-backend backend/
docker run -p 8000:8000 --env-file backend/.env svi-liveness-backend
```

## Project Structure

```
backend/
├── app/
│   ├── api/routes.py       # API endpoints (new + backward-compat)
│   ├── config.py           # Environment configuration
│   ├── core/
│   │   ├── session.py      # Session management
│   │   └── audit.py        # Audit logging
│   ├── liveness/
│   │   ├── engine.py       # Liveness orchestrator
│   │   ├── fallback.py     # Primary → fallback logic
│   │   └── providers/
│   │       ├── heuristic.py          # 8-metric pixel analysis ($0)
│   │       ├── aws_detect_faces.py   # AWS Rekognition DetectFaces
│   │       ├── aws_detect_labels.py  # AWS Rekognition DetectLabels
│   │       └── open_face_liveness.py # Browser-based liveness
│   └── models/schemas.py   # Request/response schemas
├── run.py                  # Entry point
├── Dockerfile
├── requirements.txt
└── .env.example
```
