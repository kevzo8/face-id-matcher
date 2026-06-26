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

---

## Sample Results (Kaggle Dirty Test — 40 pairs)

Full threshold sweep using `samples/kaggle/` with InsightFace at default threshold **0.7**:

| Metric | Value |
|--------|-------|
| Total pairs | 40 (27 same-person + 13 cross-person) |
| Correctly identified (same) | 27 / 27 (100%) |
| Correctly rejected (cross) | 13 / 13 (100%) |
| Errors | 0 |
| Same-person similarity range | 35.98% – 78.50% |
| Cross-person similarity range | 0.0% – 8.7% |
| Gap between min-same and max-cross | **27.3 points** |

### Sample row (same person)
```
applicant_id=correct_0, name=Weslley, similarity=62.08%, match=true
```
### Sample row (cross person)
```
applicant_id=wrong_0, name=Weslley vs Alessandro, similarity=0.8%, match=false
```

Run it yourself:
```bash
python batch/batch.py --input samples/kaggle/dirty_pairs.csv --provider insightface --threshold 0.7 --base-dir .
```

---

## Deploy InsightFace Server to Hugging Face Spaces

Run the InsightFace provider as a public API server on Hugging Face Spaces using Docker.

### 1. Create a Hugging Face Space

1. Go to https://huggingface.co/new-space
2. Set **Space name** (e.g., `face-id-matcher`)
3. Choose **Docker** as the Space SDK
4. Set **Space hardware** (CPU is sufficient — choose at least `cpu-2` for reasonable speed)
5. Click **Create Space**

### 2. Push the Dockerfile

```bash
# In your repo root:
git add Dockerfile.huggingface
git commit -m "Add Hugging Face Spaces Dockerfile"

# Follow HF instructions to push to your Space's git repo
# (or use the HF web UI to upload the file)
```

The Space will auto-detect `Dockerfile.huggingface` if you **rename it to `Dockerfile`** in the Space repo. Alternatively, set **Dockerfile Path** to `Dockerfile.huggingface` in the Space settings.

### 3. How it works

| Aspect | Detail |
|--------|--------|
| **Port** | 7860 (HF Spaces default) |
| **Provider** | InsightFace (`buffalo_l` model, ONNX CPU) |
| **Endpoint** | `POST /compare` — multipart (`id_image`+`selfie_image`) or JSON (`source_image`+`target_image` base64) |
| **Health** | `GET /health` — returns status + provider name |
| **Models** | Pre-downloaded during build (~200 MB cached in the image) |
| **Env var** | `FACE_MATCH_PROVIDER=insightface` auto-initializes on startup |

### 4. Configure the Web App

1. Open the web app (`http://localhost:5180`)
2. In the settings bar, select **InsightFace (server)** from the Provider dropdown
3. A **Server** text field appears — enter your HF Space URL:
   ```
   https://your-username-face-id-matcher.hf.space
   ```
4. Upload photos and click **Compare Faces** — the app sends images to the HF Space for matching

> **Note:** The server accepts both **multipart form data** (`id_image` + `selfie_image`) and **JSON base64** (`source_image` + `target_image`). The web app sends JSON base64 by default. Use the `/docs` Swagger UI at `https://your-space.hf.space/docs` for manual testing.

### 5. Test with curl

Multipart form:
```bash
curl -X POST https://your-username-face-id-matcher.hf.space/compare \
  -F "id_image=@/path/to/id.jpg" \
  -F "selfie_image=@/path/to/selfie.jpg" \
  -F "threshold=0.7"
```

Or JSON base64:
```bash
ID_B64=$(base64 -w0 /path/to/id.jpg)
SELFIE_B64=$(base64 -w0 /path/to/selfie.jpg)
curl -X POST https://your-username-face-id-matcher.hf.space/compare \
  -H "Content-Type: application/json" \
  -d "{\"source_image\":\"$ID_B64\",\"target_image\":\"$SELFIE_B64\",\"threshold\":0.7}"
```

Response format:
```json
{
  "similarity": 87.34,
  "distance": 0.1266,
  "match": true,
  "threshold": 0.6,
  "error": null
}
```

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
│   │   │   ├── BatchMatcher.tsx   # Batch upload + results table
│   │   │   └── CsvViewer.tsx     # CSV upload viewer + compare modal
│   │   └── main.tsx
│   ├── public/models/            # face-api.js model weights
│   └── package.json
├── batch/                        # Python batch processor
│   ├── providers/
│   │   ├── base.py               # Provider interface
│   │   ├── insightface_provider.py  # Free local (recommended)
│   │   ├── rekognition_provider.py  # AWS cloud
│   │   ├── megamatcher_provider.py  # Licensed SDK wrapper + fallback
│   │   └── dlib_provider.py      # Hard to install, not recommended
│   ├── batch.py                  # CLI entry point
│   ├── sample_pairs.csv
│   └── requirements.txt
├── batch-java/                   # Megamatcher Java batch (Maven project)
│   ├── src/main/java/com/svi/facematch/
│   │   ├── MegamatcherBatchProcessor.java  # CLI batch processor
│   │   ├── MegamatcherEngine.java           # SDK wrapper
│   │   ├── MatchResult.java                 # Result model
│   │   └── CSVUtils.java                    # CSV I/O
│   ├── lib/                                # Place SDK jars here
│   ├── pom.xml
│   └── README.md
├── batch-cpp/                     # dlib C++ batch (CMake project)
│   ├── src/
│   │   ├── main.cpp
│   │   ├── face_match.h
│   │   └── face_match.cpp
│   ├── models/                    # Place model files here
│   ├── CMakeLists.txt
│   └── README.md
├── server/                       # FastAPI bridge server
│   ├── main.py                   # POST /compare endpoint
│   └── requirements.txt
├── samples/                      # Test images
├── CPS-221-spike-report.md       # Full vendor comparison
├── Dockerfile.huggingface        # Hugging Face Spaces deployment
└── README.md
```
