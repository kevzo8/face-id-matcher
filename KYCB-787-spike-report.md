# KYCB-787: SPIKE — Detect Blurry Documents and Unreadable Text

**Goal:** POC for rejecting poor-quality document captures *before* OCR — detect blur and unreadable text at capture time so users retake immediately instead of failing downstream in CPS-220 OCR parsing.

**Status:** POC implemented in this repo (backend + web). No new infrastructure — reuses the existing FastAPI server, the existing AWS credentials (Rekognition), and the existing `ImageCapture` camera component.

---

## 1. Executive Summary

| Layer | Method | Cost | What it catches |
|-------|--------|------|-----------------|
| **🥇 Local blur check** | Laplacian variance + brightness/contrast/resolution/glare (numpy + PIL, no new deps beyond `numpy`/`pillow`) | $0, instant, works offline | Motion blur, out-of-focus, dark/overexposed, tiny/cropped, glare |
| **🥈 AWS readability check** | Rekognition `DetectText` — line/word count + per-word confidence | ~$0.0015/check | Unreadable text (0 lines, low avg confidence, high low-conf ratio) |
| **Combined verdict** | Weighted score 0–100 → `PASS` / `RETAKE` + actionable reasons | — | Single gate to put in front of `/ocr/detect` |

**Recommendation:** gate every document capture on `POST /document/quality` first. If `verdict == RETAKE`, show the returned `reasons` and block OCR. This is the same pattern as the existing liveness gate before face compare.

---

## 2. How It Works

```
Camera capture (ImageCapture, rear camera)
        │
        ▼
POST /document/quality { image (b64), check_text: true }
        │
        ├── Local analysis ($0): sharpness, brightness, contrast, resolution, glare
        │
        ├── AWS Rekognition DetectText (~$0.0015): lines, words, avg confidence,
        │                                          low-conf ratio, text sample
        │
        ▼
{ verdict: PASS|RETAKE, score: 0-100, breakdown[5], reasons[], text_sample[] }
        │
        ├── PASS   → proceed to /ocr/detect
        └── RETAKE → show reasons, ask user to retake
```

### 2.1 Local metrics (free)

Same Laplacian-variance technique already proven in `server/providers/liveness_passive.py`, retuned for documents (text edges need higher sharpness than faces):

| Metric | How | Thresholds |
|--------|-----|-----------|
| Sharpness (Laplacian var) | Variance of 3×3 Laplacian on grayscale | blurry < 25 · marginal 25–80 · sharp > 80 |
| Brightness | Mean gray 0–255 (ideal ~130) | dark < 60 · overexposed > 200 |
| Contrast | Std-dev of gray | low < 25 |
| Resolution | Megapixels | warn < 0.5 MP · fail < 0.3 MP |
| Glare | Saturated near-white pixel ratio | flag > 2% |

### 2.2 AWS readability metrics (~$0.0015)

| Metric | PASS bar |
|--------|----------|
| Text lines (`LINE` detections) | ≥ 3 |
| Avg word confidence | ≥ 70% |
| Low-conf word ratio (words < 80%) | ≤ 40% |

### 2.3 Scoring (0–100)

| Component | Max pts |
|-----------|--------|
| Sharpness | 30 |
| Lighting | 10 |
| Contrast | 10 |
| Resolution | 5 |
| Text readability (AWS) | 45 |

`PASS` requires **score ≥ 70 AND sharpness ≠ blurry AND text readable** (≥3 lines, avg conf ≥ 70%, low-conf ≤ 40%). Without AWS creds the endpoint degrades gracefully: local-only score rescaled to 100, `aws_checked: false`, verdict from sharpness/lighting with an explanatory note.

---

## 3. POC Test Evidence (2026-09-10, local)

Synthetic 800×600 document (white page + 12 black text bars) vs. blurred copy (downscale/upscale), via `_analyze_document_local` + `POST /document/quality` logic:

| Image | Laplacian var | Label | Verdict |
|-------|--------------:|-------|---------|
| Sharp synthetic | 4551.3 | sharp | **PASS 82** (local-only mode) |
| Blurred copy | 18.4 | blurry | **RETAKE** path (sharpness reason fires) |

AWS path on this machine: `aws_checked: true`, 0 lines on synthetic bars (correct — bars aren't glyphs), verdict `RETAKE 45` with "No readable text detected". Confirms the unreadable-text gate fires when Rekognition finds nothing, and that the existing AWS credentials work with the new endpoint. `npx tsc --noEmit` on `web/` passes clean.

---

## 4. What Was Built (this repo)

| File | Change |
|------|--------|
| `server/main.py` | New `POST /document/quality` + `DocumentQualityResponse` schema + `_analyze_document_local()` |
| `server/requirements.txt` | Added `numpy`, `pillow` (already used by `liveness_passive.py`, now declared) |
| `web/src/components/DocQualityCheck.tsx` | **New.** Camera capture → Check Quality → verdict badge, score breakdown, metric grid, reasons, AWS text sample |
| `web/src/App.tsx` | New `doc_quality` feature: left-menu entry, `/doc-quality` route, center panel, right sidebar (server URL + thresholds + capture tips) |
| `KYCB-787-spike-report.md` | This report |

### Run it

```bash
# backend (needs AWS creds only for the text half; local half works without)
cd server
pip install -r requirements.txt
python main.py --port 5190

# web
cd web
npm install
npm run dev    # http://localhost:5180/doc-quality
```

Point the sidebar **Server URL** at `http://localhost:5190` for local testing (production default is the Render URL). Capture a document with the rear camera → **Check Quality**.

```bash
# curl
curl -X POST http://localhost:5190/document/quality \
  -H "Content-Type: application/json" \
  -d "{\"image\":\"$(base64 -w0 /path/to/doc.jpg)\",\"check_text\":true}"
```

---

## 5. Cost

| Volume | Local only | + Rekognition DetectText (~$0.0015) |
|--------|-----------|-------------------------------------|
| 1K docs | $0 | ~$1.50 |
| 10K docs | $0 | ~$15 |
| 100K docs | $0 | ~$150 |

Savings angle: every RETAKE caught here avoids a wasted `/ocr/detect` + `/ocr/parse` (GROQ/OpenAI) call downstream — quality-gating pays for itself.

---

## 6. Follow-ups (out of POC scope)

1. **Calibrate thresholds on real PH IDs** — current cutoffs (25/80 sharpness, 70% conf) come from synthetic + face-tuned heuristics; run 50–100 real captures (good/blurry/dark/glare) and adjust.
2. **Optional Textract upgrade** — `DetectText` is enough for readability gating; only switch to Textract `DetectDocumentText` if word-level geometry (e.g., "document fills < 40% of frame") is needed.
3. **Client-side pre-check** — port the Laplacian check to a tiny canvas-based JS function for instant viewfinder feedback ("hold steady") before upload; keep server as source of truth.
4. **Wire into OCR flow** — call `/document/quality` automatically inside `/ocr/detect` (or in the web OCR tab) and return `quality` alongside OCR results.
5. **Blur-type classification** (motion vs. defocus) — needs inertial/dual-frame data; not worth it for the retake UX ("hold steady + tap to focus" covers both).

---

## 7. References

- Existing blur baseline: `server/providers/liveness_passive.py` (Laplacian variance, §1 metrics 1–2)
- Existing OCR flow this gates: `POST /ocr/detect`, `POST /ocr/parse` in `server/main.py`
- Prior spikes: `CPS-220-spike-report.md` (OCR & ID type), `CPS-221-spike-report.md` (face match), `CPS-222-spike-report.md` (liveness), `CPS-289-spike-report.md` (transaction auth)
- AWS: [Rekognition DetectText](https://docs.aws.amazon.com/rekognition/latest/dg/text-detecting-text-procedure.html), [DetectText pricing](https://aws.amazon.com/rekognition/pricing/) (~$0.0015/image first 1M)
- Classic result: Pech-Pacheco et al., "Diatom autofocusing in brightfield microscopy" (Laplacian variance focus measure)
