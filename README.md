# CPS-221 Face Match POC

1:1 face matching — compares a selfie against an ID photo to verify identity. Supports multiple providers so you can compare accuracy, speed, and cost.

---

## Which Provider Should I Use?

| Provider | Where it runs | Cost | Accuracy | Best for |
|----------|--------------|------|----------|----------|
| **face-api.js** | Browser (JS) | Free | ~90-95% | Quick POC, no server needed |
| **InsightFace** | Python (local) | Free | ~95-98% | Batch processing, no cloud |
| **AWS Rekognition** | Cloud (AWS) | $0.001/compare | ~99% | Production cloud option |
| **Megamatcher** | SDK (Java/C++) | Licensed ($0 marginal) | ~95-99% | SVI's licensed SDK — already paid for |
| **dlib** | Python (local) | Free | ~90-95% | Not recommended — hard to install on Windows |

### Why can't I pick InsightFace or dlib in the web dropdown?

Because they're **Python/C++ libraries** — they can't run inside a web browser. The web app has three modes:

| Web dropdown option | What it does | Server needed? |
|--------------------|--------------|----------------|
| **face-api.js (browser)** | Runs entirely in your browser — no data leaves your PC | No |
| **AWS Rekognition (cloud)** | Sends images to a Python FastAPI server → calls AWS API | Yes (Python server + AWS creds) |
| **Megamatcher (server)** | Sends images to a Python FastAPI server → calls Megamatcher SDK (or falls back to InsightFace) | Yes (Python server) |

InsightFace and dlib are available in the **Python batch script** (`--provider insightface`) since that runs locally on your machine.

---

## Quick Start — Web App

```bash
cd web
npm install
npm run download-models    # download face recognition model weights
npm run dev                # starts on http://localhost:5180
```

Open http://localhost:5180 — upload/take two photos and click **Compare Faces**.

Choose provider at the top:
- **face-api.js (browser)** — works immediately, all processing in-browser
- **AWS Rekognition / Megamatcher** — requires the Python server running

---

## Provider Details

### face-api.js (Browser)

- JavaScript library built on TensorFlow.js
- Runs **entirely in the browser** — no images uploaded anywhere
- Models: SSD MobileNet (accurate/slow) or TinyFaceDetector (fast/less accurate)
- Produces a 128-number face descriptor, compares with Euclidean distance
- Good for quick testing — no infrastructure needed

### InsightFace (Python)

- Free, open-source, ONNX-based face recognition
- Uses the `buffalo_l` model — produces 512-dimension embeddings
- Runs **locally on your machine** — no cloud calls
- More accurate than face-api.js, but requires Python

### AWS Rekognition (Cloud)

- Amazon's cloud face recognition API
- **Requires AWS credentials** (`aws configure`) with `AmazonRekognitionReadOnlyAccess`
- Cost: ~$0.001 per face compare
- Uses the FastAPI Python server as a bridge between web app and AWS

### Megamatcher (Neurotechnology SDK)

- **SVI already owns a license** — used in production OWA via `/biometric` endpoint
- Commercial SDK (Java/C++/.NET) — not available in Python
- **In this POC**: the Python provider detects if the SDK is installed. If not, it falls back to InsightFace so you can still test the workflow.
- **For production**: integrate directly in Java (Spring Boot) using the SDK — skip Python entirely

#### Should I use Java batch processing for Megamatcher?

**Yes.** Megamatcher's native SDK is Java/C++/.NET. The Python provider here is just a POC placeholder. For real batch processing:

```java
// Pseudocode — Megamatcher Java SDK
NMatcher matcher = new NMatcher();
NSubject idSubject = matcher.createSubject();
idSubject.setImage(/* ID photo path */);
// ... compare with selfie, get score
```

### dlib (face_recognition)

- Popular Python face recognition library
- **Problem**: Requires CMake + C++ compiler to install on Windows
- With Python 3.14, this is very difficult to set up
- **Not recommended** for this POC — use InsightFace instead (no CMake needed)

---

## Batch Script (Python)

Process multiple pairs at once from a CSV file.

### Install

```bash
cd batch
pip install -r requirements.txt
```

### Usage

```bash
# Using InsightFace (free, local, no cloud)
python batch.py --input pairs.csv --provider insightface

# Using AWS Rekognition (needs AWS credentials)
python batch.py --input pairs.csv --provider rekognition

# Using Megamatcher (SDK or fallback)
python batch.py --input pairs.csv --provider megamatcher

# Custom threshold (0.7 = most lenient, 0.3 = strictest)
python batch.py --input pairs.csv --threshold 0.7

# Parallel processing (faster with many images)
python batch.py --input pairs.csv --workers 4

# Custom output file
python batch.py --input pairs.csv --output my_results.csv
```

### Input CSV Format

```csv
applicant_id,id_image_path,selfie_image_path,extra_info
APP001,C:/photos/1_ID_John.jpg,C:/photos/1_Selfie_John.jpg,optional data
APP002,C:/photos/2_ID_Jane.jpg,C:/photos/2_Face_Jane.jpg,anything
```

Any extra columns are preserved in the output.

### Can I test the files I uploaded in the web batch upload?

**Yes** — the web app's Batch Upload tab and the Python batch script both use the same approach. The CSV should point to your file paths. If your files are named like `1_ID_Kevin.jpg` and `1_Selfie_Kevin.jpg`, the CSV would be:

```csv
applicant_id,id_image_path,selfie_image_path
1,C:/path/to/1_ID_Kevin.jpg,C:/path/to/1_Selfie_Kevin.jpg
```

### Output CSV

```csv
applicant_id,similarity,distance,decision,error
APP001,87.34,0.1266,auto_approve,
APP002,42.10,0.5790,manual_review,
APP003,0.00,1.0000,error,No face detected
```

Decisions: `auto_approve` (match) / `manual_review` (no match) / `error`

---

## API Server (FastAPI)

Bridges the web app to cloud/SDK providers.

```bash
cd server
pip install -r requirements.txt
aws configure                         # only for Rekognition
python main.py --provider insightface  # starts on port 5190
python main.py --provider rekognition  # needs AWS creds
python main.py --provider megamatcher  # SDK or fallback
```

The web app connects to `http://localhost:5190` when set to a server provider.

---

## Threshold Guide

The threshold slider controls how strict the comparison is:

| Setting | Value | Meaning |
|---------|-------|---------|
| Strict | 0.30 | Only very similar faces match (few false accepts) |
| Default | 0.50 | Balanced — recommended starting point |
| Max leniency | 0.70 | Allows some differences (fewer false rejects) |

The default is 0.50. For the POC, set to 0.70 (max leniency) to minimize "no match" errors.

---

## Project Structure

```
face-id-matcher/
├── web/                          # React + Vite web app
│   ├── src/
│   │   ├── App.tsx               # Main app with settings + single compare
│   │   ├── components/
│   │   │   ├── ImageCapture.tsx   # Camera + file upload
│   │   │   ├── MatchResult.tsx    # Single compare result display
│   │   │   └── BatchMatcher.tsx   # Batch upload + results table
│   │   └── main.tsx
│   ├── public/models/            # face-api.js model weights
│   └── package.json
├── batch/                        # Python batch processor
│   ├── providers/
│   │   ├── base.py               # Provider interface
│   │   ├── insightface_provider.py  # Free local (recommended)
│   │   ├── rekognition_provider.py  # AWS cloud
│   │   ├── megamatcher_provider.py  # Licensed SDK + fallback
│   │   └── dlib_provider.py      # Hard to install, not recommended
│   ├── batch.py                  # CLI entry point
│   ├── sample_pairs.csv
│   └── requirements.txt
├── server/                       # FastAPI bridge server
│   ├── main.py                   # POST /compare endpoint
│   └── requirements.txt
├── samples/                      # Test images
├── CPS-221-spike-report.md       # Full vendor comparison
└── README.md
```
