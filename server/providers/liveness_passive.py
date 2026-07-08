"""
Passive liveness detection using face quality heuristics.
Analyzes blur, texture, color distribution, and edge patterns to
distinguish real faces from printed photos / screen replays.
"""

from __future__ import annotations

import io

import numpy as np
from PIL import Image


class LivenessPassiveProvider:
    def __init__(self, model_path: str | None = None):
        self.scale = 2.7

    def predict(self, image_bytes: bytes, bbox: list[float] | None = None) -> dict:
        try:
            pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            img_w, img_h = pil_image.size

            if bbox and len(bbox) == 4:
                bx, by, bw, bh = bbox
                cx = (bx + bw / 2) * img_w
                cy = (by + bh / 2) * img_h
                size = max(bw * img_w, bh * img_h) * self.scale
                x1 = max(0, int(cx - size / 2))
                y1 = max(0, int(cy - size / 2))
                x2 = min(img_w, int(cx + size / 2))
                y2 = min(img_h, int(cy + size / 2))
                face = pil_image.crop((x1, y1, x2, y2))
            else:
                face = pil_image

            return self._analyze(face)

        except Exception as e:
            return {"is_real": True, "confidence": 0.5, "score": 10, "error": str(e)}

    def _analyze(self, face: Image.Image) -> dict:
        face_rgb = np.array(face, dtype=np.uint8)
        h, w = face_rgb.shape[:2]
        if h < 10 or w < 10:
            return {"is_real": False, "confidence": 0.0, "score": 0, "error": "Face too small"}

        gray = face_rgb.mean(axis=2).astype(np.float64)

        # 1. Blur / texture: Laplacian variance (numpy-based)
        lap = (
            -gray[1:-1, 1:-1] * 4
            + gray[:-2, 1:-1]
            + gray[2:, 1:-1]
            + gray[1:-1, :-2]
            + gray[1:-1, 2:]
        )
        lap_var = float(np.var(lap))

        # 2. Edge strength
        edges_h = np.abs(np.diff(gray, axis=1))
        edges_v = np.abs(np.diff(gray, axis=0))
        edge_strength = float((edges_h.mean() + edges_v.mean()) / 2)

        # 3. Color channel variance
        ch_var = float(np.mean([np.var(face_rgb[:, :, c].astype(np.float64)) for c in range(3)]))

        # 4. Histogram spread
        hist, _ = np.histogram(gray, bins=32, range=(0, 255))
        hist_norm = hist / (hist.sum() + 1e-8)
        hist_spread = float(np.sum(hist_norm > 0.01)) / 32

        # 5. Frequency ratio (low vs high)
        gray_float = gray - gray.mean()
        fft = np.fft.fft2(gray_float)
        fft_shift = np.fft.fftshift(fft)
        magnitude = np.abs(fft_shift)
        cy, cx_ = h // 2, w // 2
        y_grid, x_grid = np.ogrid[:h, :w]
        radius = min(h, w) * 0.15
        mask_low = (y_grid - cy) ** 2 + (x_grid - cx_) ** 2 < radius ** 2
        low_freq = float(np.mean(magnitude[mask_low]))
        high_freq = float(np.mean(magnitude[~mask_low])) + 1e-8
        hf_ratio = low_freq / high_freq

        # 6. Specular highlight detection (screens have sharp, saturated reflections)
        max_rgb = np.max(face_rgb, axis=2)
        mean_rgb = np.mean(face_rgb, axis=2)
        highlight_mask = (max_rgb > 240) & ((max_rgb - mean_rgb) > 30)
        highlight_ratio = float(np.sum(highlight_mask)) / (h * w)

        # 7. Moiré / screen pattern detection (high-frequency periodic artifacts)
        fft_mag = np.abs(np.fft.fft2(gray_float))
        fft_mag_shift = np.fft.fftshift(fft_mag)
        outer = np.ones_like(fft_mag_shift, dtype=bool)
        mask_inner = (y_grid - cy) ** 2 + (x_grid - cx_) ** 2 < (min(h, w) * 0.3) ** 2
        outer[mask_inner] = False
        outer_energy = float(np.mean(fft_mag_shift[outer]))
        total_energy = float(np.mean(fft_mag_shift)) + 1e-8
        moire_ratio = outer_energy / total_energy

        # 8. Color banding / quantization (screens posterize gradients)
        ch_range = float(np.mean([
            np.ptp(face_rgb[:, :, 0]),
            np.ptp(face_rgb[:, :, 1]),
            np.ptp(face_rgb[:, :, 2]),
        ]))
        banding_score = min(1.0, ch_range / 200.0)

        def clamp(v, lo, hi):
            return max(0.0, min(1.0, (v - lo) / (hi - lo)))

        s_blur = clamp(lap_var, 5, 100)
        s_edge = clamp(edge_strength, 0.5, 15)
        s_color = clamp(ch_var, 200, 8000)
        s_hist = clamp(hist_spread, 0.1, 1.0)
        s_freq = clamp(hf_ratio, 3, 50)
        s_highlight = 1.0 - clamp(highlight_ratio, 0.0, 0.02)  # penalize highlights (stricter)
        s_moire = 1.0 - clamp(moire_ratio, 0.2, 1.0)  # penalize moiré (stricter)
        s_banding = 1.0 - banding_score  # penalize banding

        confidence = (
            s_blur * 0.20 +
            s_edge * 0.15 +
            s_color * 0.15 +
            s_hist * 0.10 +
            s_freq * 0.10 +
            s_highlight * 0.15 +
            s_moire * 0.10 +
            s_banding * 0.05
        )

        is_real = confidence > 0.50
        score = min(20, max(1, int((confidence - 0.15) * 50)))

        # Generate meaningful reason
        reasons = []
        if lap_var < 10:
            reasons.append("blurry")
        if edge_strength < 3:
            reasons.append("low contrast")
        if ch_var < 300:
            reasons.append("flat color")
        if hist_spread < 0.15:
            reasons.append("narrow tones")
        if hf_ratio > 18:
            reasons.append("artificial pattern")
        if highlight_ratio > 0.005:
            reasons.append("screen glare")
        if moire_ratio > 0.2:
            reasons.append("moiré pattern")
        if banding_score < 0.6:
            reasons.append("color banding")
        details = "; ".join(reasons) if reasons else "face looks natural"

        breakdown = [
            {"label": "Sharpness", "pts": round(s_blur * 4, 1)},
            {"label": "Edges", "pts": round(s_edge * 4, 1)},
            {"label": "Color Depth", "pts": round(s_color * 4, 1)},
            {"label": "Tonal Range", "pts": round(s_hist * 4, 1)},
            {"label": "Detail", "pts": round(s_freq * 4, 1)},
            {"label": "No Glare", "pts": round(s_highlight * 4, 1)},
            {"label": "No Moiré", "pts": round(s_moire * 4, 1)},
            {"label": "No Banding", "pts": round(s_banding * 4, 1)},
        ]

        raw_score = sum(b["pts"] for b in breakdown)
        score = max(1, min(20, int(raw_score)))

        return {
            "is_real": bool(confidence > 0.50),
            "confidence": round(score / 20, 4),
            "score": score,
            "details": details,
            "breakdown": breakdown,
        }
