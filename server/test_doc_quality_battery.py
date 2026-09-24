"""KYCB-787 document-quality regression battery.

Renders synthetic captures with PIL and POSTs them to a running backend
(default http://127.0.0.1:5190), asserting the expected verdict for each case.

Run:
    python test_doc_quality_battery.py
    python test_doc_quality_battery.py --url http://127.0.0.1:5190

Reference locations:
    Endpoint under test : server/main.py -> POST /document/quality
    UI under test       : web/src/components/DocQualityCheck.tsx
    Metric glossary     : web/src/App.tsx (METRIC DEFINITIONS sidebar)
    Presentation        : web/src/data/slides.tsx (docQualitySlides)
    Full writeup        : KYCB-787-spike-report.md

Requires AWS credentials for the readability cases (DetectText); the
script fails loudly when aws_checked is False so skips never look green.
"""

import argparse
import base64
import io
import json
import sys
import urllib.request
from PIL import Image, ImageDraw, ImageFont

FONT_PATHS = [
    "C:\\Windows\\Fonts\\arial.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]

FILIPINO_LINES = [
    "Republika ng Pilipinas",
    "Pambansang Pagkakakilanlan",
    "Pangalan: Juan Dela Cruz",
    "Apelyido: Dela Cruz",
    "Araw ng Kapanganakan: 1990-05-14",
    "Tirahan: Maynila, Pilipinas",
    "PSN-1234-5678901",
    "Dugo: O+ Kasarian: M",
]

GARBAGE_LINES = ["B", "serving Par", "-", ". -", "abeped -", "x", "TI", "--"]


def _font(size):
    for path in FONT_PATHS:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def render(lines, size, w, h):
    img = Image.new("RGB", (w, h), "white")
    d = ImageDraw.Draw(img)
    f = _font(size)
    y = 40
    for ln in lines:
        d.text((60, y), ln, fill="black", font=f)
        y += size + 18
    return img


def blur_copy(img):
    small = img.resize((100, 75), Image.BILINEAR)
    return small.resize(img.size, Image.BILINEAR)


def img_b64(img, fmt="JPEG"):
    buf = io.BytesIO()
    if fmt.upper() in ("TIFF", "TIF"):
        img.save(buf, format="TIFF")
    else:
        img.save(buf, format="JPEG", quality=90)
    return base64.b64encode(buf.getvalue()).decode()


def check(url, img, camera_max_mp=None, fmt="JPEG", doc_type="printed"):
    payload = {"image": img_b64(img, fmt), "check_text": True, "doc_type": doc_type}
    if camera_max_mp is not None:
        payload["camera_max_mp"] = camera_max_mp
    req = urllib.request.Request(
        url.rstrip("/") + "/document/quality",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://127.0.0.1:5190")
    args = ap.parse_args()

    sharp = render(FILIPINO_LINES, 46, 1600, 1200)
    cases = [
        {
            "name": "sharp Filipino ID (1.9MP)",
            "img": sharp,
            "expect": "PASS",
            "extra": lambda r: r["score"] >= 70 and len(r.get("full_text", [])) == r["text_lines"],
            "extra_note": "score>=70 and full_text covers all lines",
        },
        {
            "name": "blurred copy",
            "img": blur_copy(sharp),
            "expect": "RETAKE",
            "extra": lambda r: r["sharpness_label"] == "blurry",
            "extra_note": "label is blurry",
        },
        {
            "name": "tiny 0.31MP, readable content",
            "img": sharp.resize((640, 480), Image.BILINEAR),
            "expect": "PASS",
            "extra": lambda r: r["score"] >= 70,
            "extra_note": "no sensor-MP floor",
        },
        {
            "name": "sharp garbage (fragments)",
            "img": render(GARBAGE_LINES, 44, 1200, 900),
            "expect": "RETAKE",
            "extra": lambda r: r["real_word_ratio"] < 0.5,
            "extra_note": "real-word share below 50%",
        },
        {
            "name": "sharp Filipino ID as TIFF",
            "img": sharp,
            "expect": "PASS",
            "extra": lambda r: r["score"] >= 70 and any("TIFF" in x for x in r["reasons"]),
            "extra_note": "server normalizes TIFF, notes it",
            "format": "TIFF",
        },
        {
            "name": "garbage in handwritten mode",
            "img": render(GARBAGE_LINES, 44, 1200, 900),
            "expect": "RETAKE",
            "extra": lambda r: r["real_word_ratio"] < 0.5,
            "extra_note": "toggle relaxes confidence only, not share",
            "doc_type": "handwritten",
        },
        {
            "name": "tiny garbage, camera maxed out",
            "img": render(GARBAGE_LINES, 30, 640, 480),
            "expect": "RETAKE",
            "extra": lambda r: any("Camera maxed out" in x for x in r["reasons"]),
            "extra_note": "at-max advice fires",
            "camera_max_mp": 0.31,
        },
    ]

    failures = 0
    print(f"{'case':38} {'verdict':8} {'score':6} signals")
    for c in cases:
        r = check(args.url, c["img"], c.get("camera_max_mp"), c.get("format", "JPEG"), c.get("doc_type", "printed"))
        if not r.get("aws_checked"):
            print(f"FAIL: {c['name']} — aws_checked is False (no AWS creds?)")
            failures += 1
            continue
        ok = r["verdict"] == c["expect"] and c["extra"](r)
        mark = "ok" if ok else "FAIL"
        if not ok:
            failures += 1
        signals = (
            f"share={r.get('real_word_ratio')} textmp={r.get('text_mp')} "
            f"full={len(r.get('full_text', []))}/{r['text_lines']}"
        )
        print(f"[{mark}] {c['name']:33} {r['verdict']:8} {r['score']:<6} {signals}")
        if not ok:
            print(f"      expected {c['expect']} + ({c['extra_note']})")

    print("ALL GREEN" if failures == 0 else f"{failures} FAILURE(S)")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
