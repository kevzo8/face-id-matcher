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

### 2.2 AWS readability + content metrics (~$0.0015)

Confidence alone passes crisp garbage (card graphics read as `B`, `-`, `. -` fragments at 90%+ confidence), so the same `DetectText` response is also scored for language content:

| Metric | PASS bar | Why |
|--------|----------|-----|
| Text lines (`LINE` detections) | ≥ 3 | Cropped/empty captures |
| Avg word confidence | ≥ 70% | Blurry/glare-degraded text |
| Low-conf word ratio (words < 80%) | ≤ 40% | Partially readable text |
| Real words (tokens with 3+ alnum chars) | ≥ 5 | Fragment soup (`B`, `-`, `abeped -`) |
| Real-word share (real ÷ total words) | ≥ 50% | Mixed captures — clear half + garbage half (`Dela Cruz X Q 7` passes line checks, fails here) |
| Fragment line ratio (lines with <3 alnum chars) | ≤ 50% | Graphics misread as text |
| Text frame coverage (summed LINE bbox area) | ≥ 1% | Document too far/small in frame |
| Text detail (MP × coverage, camera-independent) | scores 0–5 pts | A 0.3MP frame-filling shot beats a 12MP shot from across the room |
| Sensor MP | **no floor** (0.15MP sanity only) | Punishing hardware the user can't change is wrong — judge the text, not the spec sheet |

"Real word" is script-based (`[A-Za-z0-9]{3,}`), **not an English dictionary** — Filipino/Tagalog (`Pilipinas`, `Pangalan`, `Apelyido`, `Kapanganakan`) counts identically. Short particles (`ng`, `sa`, `at`) and single-letter markers (`M`/`F`) don't count individually, which is fine against a ≥5 threshold on a full document.

### 2.3 Scoring (0–100)

| Component | Max pts |
|-----------|--------|
| Sharpness | 30 |
| Lighting | 10 |
| Contrast | 10 |
| Resolution | 5 |
| Text readability (AWS) | 45 |

Text pts are multiplied by the blended content factor `((1 − fragment_ratio) + real_word_ratio) / 2`, and **gates override score**. `PASS` requires **score ≥ 70 AND sharp AND all content bars above** — with no sensor-MP floor. The frontend reports the camera's max MP (`track.getCapabilities()`, Chromium) as `camera_max_mp`, so advice splits into fixable-now vs hardware-limited: "move closer" when the camera has headroom, vs "camera maxed out at X MP — switch camera or use Upload File" when the sensor is the bottleneck (Upload File re-enters the same gates, so no quality escapes).

> **Calibration status:** weights and the 70 bar are reasoned starting values (70 inherits the app's liveness convention), **not** fitted to data. A good phone capture scores ~85–92; the line placement needs a 50–100 real-capture batch (see §6.1).

---

## 3. POC Test Evidence (2026-09-10, local)

Synthetic 800×600 document (white page + 12 black text bars) vs. blurred copy (downscale/upscale), via `_analyze_document_local` + `POST /document/quality` logic:

| Image | Laplacian var | Label | Verdict |
|-------|--------------:|-------|---------|
| Sharp synthetic | 4551.3 | sharp | **PASS 82** (local-only mode) |
| Blurred copy | 18.4 | blurry | **RETAKE** path (sharpness reason fires) |

AWS path on this machine: `aws_checked: true`, 0 lines on synthetic bars (correct — bars aren't glyphs), verdict `RETAKE 45` with "No readable text detected". Confirms the unreadable-text gate fires when Rekognition finds nothing, and that the existing AWS credentials work with the new endpoint. `npx tsc --noEmit` on `web/` passes clean.

### Round 2 — content gates (2026-09-10, live endpoint, rendered-text images)

| Case | Verdict | Key signals |
|------|---------|-------------|
| Sharp Filipino ID (1600×1200, 8 lines incl. `Republika ng Pilipinas`, `Araw ng Kapanganakan`) | **PASS 84** | real=20 words, frag=0.0, avg=98.9 — Filipino counts, proof |
| Blurred copy | **RETAKE 9** | blurry, frag=0.88, real=1 |
| Tiny copy (640×480 ≈ reporter's 0.31 MP case) | **RETAKE 79** | hard resolution floor fires despite score ≥ 70 |
| Sharp garbage (`B`, `serving Par`, `-`, `. -`, `abeped -`) | **RETAKE 45** | frag=0.75, real=3/9 (33% share) — the crisp-garbage hole is closed |
| Mixed (4 clean + 4 junk lines) | **PASS 71** | 14/19 real (74% share) — mostly-readable docs still pass; the 50% bar only bites half-unreadable ones |

### Round 3 — detail-based scoring, no MP floor (2026-09-10)

| Case | Verdict | Key signals |
|------|---------|-------------|
| Sharp Filipino 1.9MP | **PASS 81** | share 0.83, text detail 0.19MP |
| Blurred copy | **RETAKE 8** | blurry, share 0.04 |
| Tiny 0.31MP, good content | **PASS 76** | share 0.83 — same pixels that failed the old MP floor now pass on readable content |
| Sharp garbage | **RETAKE 43** | share 0.33 |
| Tiny garbage + `camera_max_mp: 0.31` | **RETAKE 46** | reasons end with "Camera maxed out at 0.31 MP and text still unreadable — switch camera or use Upload File" — the hardware-vs-distance split works |

Note: the overexposed/brightness advisories on these rows are synthetic-image artifacts (pure-white margins average ~250); real captures don't hit that. Score-vs-gate behavior is intentional: gates decide, score advises.

---

## 4. What Was Built (this repo)

| File | Change |
|------|--------|
| `server/main.py` | New `POST /document/quality` + `DocumentQualityResponse` schema + `_analyze_document_local()` |
| `server/requirements.txt` | Added `numpy`, `pillow` (already used by `liveness_passive.py`, now declared) |
| `server/test_doc_quality_battery.py` | **New.** 5-case regression battery (sharp / blurred / tiny-readable / garbage / maxed-out). Run `python test_doc_quality_battery.py` in `server/` — expect `ALL GREEN` |
| `web/src/components/DocQualityCheck.tsx` | **New.** Camera capture → Check Quality → verdict badge, score breakdown with raw evidence, metric grid, reasons, full scrollable AWS text (`full_text`, `n of N` header) |
| `web/src/App.tsx` | New `doc_quality` feature: left-menu entry, `/doc-quality` route, center panel, right sidebar (server URL + thresholds + Sharpness note + METRIC DEFINITIONS glossary + capture tips) |
| `web/src/data/slides.tsx` | New `docQualitySlides` (13 slides: problem → metrics → gates → calibration → how-to → evidence with file refs). Sidebar Presentations entry sits between OCR & ID Type and Biometric Auth |
| `web/src/components/Presentation.tsx` | `docquality-title` landing cover (badges/links/gradients), Switch-Presentation entry, title/thanks parity with other decks |
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

```bash
# regression battery (needs backend on :5190 + AWS creds) — expect ALL GREEN
cd server
python test_doc_quality_battery.py
```

Slide deck: Presentations → Doc Quality in the left sidebar (also in the viewer Switch Presentation list), or direct at `/doc-quality/presentation/0`.

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
