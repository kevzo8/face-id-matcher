# CPS-221 Face Match POC

1:1 face matching solution that compares a user's selfie with their ID photo for identity verification.

## Quick Start

### Web App (React + face-api.js — free, browser-side)

```bash
cd web
npm install
npm run download-models    # download face recognition model weights
npm run dev                # starts on http://localhost:5180
```

Open http://localhost:5180 in your browser. Upload an ID photo and a selfie (or use your webcam), then click "Compare Faces".

### Batch Script (Python — free, local)

```bash
cd batch
pip install -r requirements.txt
python batch.py --input sample_pairs.csv --output results.csv --threshold 0.6
```

### API Server (optional — for AWS Rekognition)

```bash
cd server
pip install -r requirements.txt
aws configure                # enter your AWS access key + secret
python main.py               # starts on http://localhost:5190
```

## Project Structure

```
face-id-matcher/
├── web/                    # React + Vite web app (face-api.js)
│   ├── src/
│   │   ├── App.tsx         # Main app
│   │   ├── components/     # ImageCapture, MatchResult
│   │   └── main.tsx
│   ├── scripts/
│   │   └── download-models.js
│   ├── public/models/      # face-api.js model weights (downloaded)
│   └── package.json
├── batch/                  # Python batch processor
│   ├── providers/
│   │   ├── base.py         # Provider interface
│   │   ├── dlib_provider.py     # Free local matching (face_recognition)
│   │   └── rekognition_provider.py  # AWS Rekognition
│   ├── batch.py            # CLI entry point
│   ├── sample_pairs.csv    # Example input
│   └── requirements.txt
├── server/                 # Optional FastAPI server
│   ├── main.py             # POST /compare endpoint
│   └── requirements.txt
├── samples/                # Sample ID + selfie image pairs
├── CPS-221-spike-report.md # Vendor research and comparison
└── README.md
```

## Providers

| Provider | Cost | Accuracy | Setup |
|----------|------|----------|-------|
| `dlib` (default) | Free | ~95-98% | `pip install face-recognition` |
| `rekognition` | $0.001/compare | ~99.5% | AWS credentials required |
| `face-api.js` (web) | Free | ~95-98% | Download model weights |

## Batch Script Usage

```bash
# Basic usage (free, local)
python batch.py --input pairs.csv --output results.csv

# With AWS Rekognition
python batch.py --input pairs.csv --provider rekognition --threshold 0.6

# Parallel processing (4 workers)
python batch.py --input pairs.csv --workers 4

# Custom threshold (lower = more lenient)
python batch.py --input pairs.csv --threshold 0.5
```

### Input CSV Format

```csv
applicant_id,id_image_path,selfie_image_path
APP001,samples/id_001.jpg,samples/selfie_001.jpg
APP002,samples/id_002.jpg,samples/selfie_002.jpg
```

### Output CSV Format

```csv
applicant_id,similarity,distance,decision,error
APP001,87.34,0.1266,auto_approve,
APP002,42.10,0.5790,manual_review,
APP003,0.00,1.0000,error,No face detected in ID image
```

## AWS Rekognition Setup

1. Create an IAM user in AWS Console with `AmazonRekognitionReadOnlyAccess` policy
2. Save the access key ID and secret
3. Run `aws configure` and enter credentials
4. Use `--provider rekognition` with the batch script
5. Or run the FastAPI server for web-based matching

## Threshold Calibration

| Threshold | Behavior |
|-----------|----------|
| 0.40 | Very lenient — high false accept |
| 0.50 | Lenient — good for low-quality images |
| **0.60** | **Balanced (recommended)** |
| 0.70 | Strict — may reject valid matches |
| 0.80 | Very strict — high false reject |
