"""
MiniFASNet V2 passive liveness detection.
ONNX-based anti-spoofing — detects printed photos, screen replays, masks.
"""

from __future__ import annotations

import io
import os
from pathlib import Path

import numpy as np
from PIL import Image


class LivenessPassiveProvider:
    def __init__(self, model_path: str | None = None):
        if model_path is None:
            model_path = str(Path(__file__).parent.parent / "models" / "MiniFASNetV2.onnx")
        self.model_path = model_path
        self.session = None
        self.input_name = "input"
        self.output_name = "output"
        self.input_size = (80, 80)  # (width, height) — model expects 80x80
        self.scale = 2.7
        self._load()

    def _load(self):
        try:
            import onnxruntime
            if not os.path.exists(self.model_path):
                raise FileNotFoundError(f"MiniFASNet model not found at {self.model_path}")
            self.session = onnxruntime.InferenceSession(
                self.model_path,
                providers=["CPUExecutionProvider"],
            )
            meta = self.session.get_inputs()[0]
            self.input_name = meta.name
            self.output_name = self.session.get_outputs()[0].name
        except ImportError:
            raise RuntimeError("onnxruntime not installed")

    def predict(self, image_bytes: bytes, bbox: list[float] | None = None) -> dict:
        """
        Run liveness prediction on a face image.

        Args:
            image_bytes: JPEG/PNG image bytes (full image with face)
            bbox: [x, y, w, h] face bounding box relative to image dimensions (0-1).
                  If None, assumes the image is already a face crop.

        Returns:
            dict with is_real (bool), confidence (float 0-1), score (int 0-20)
        """
        if self.session is None:
            return {"is_real": False, "confidence": 0.0, "score": 0, "error": "Model not loaded"}

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

            face_resized = face.resize(self.input_size, Image.BILINEAR)
            img_array = np.array(face_resized, dtype=np.float32).transpose(2, 0, 1)  # CHW
            img_array = (img_array - 127.5) / 128.0  # normalize to [-1, 1]
            img_array = np.expand_dims(img_array, axis=0)  # NCHW

            outputs = self.session.run([self.output_name], {self.input_name: img_array})
            out = outputs[0].flatten()
            # Model outputs 3 values: [real_score, spoof1_score, spoof2_score]
            # Higher first value = more likely real
            raw_score = float(out[0])
            spoof_score = float(max(out[1], out[2])) if len(out) >= 3 else 0

            # softmax over real vs max(spoof)
            exp_real = np.exp(raw_score)
            exp_spoof = np.exp(spoof_score)
            confidence = exp_real / (exp_real + exp_spoof)
            is_real = confidence > 0.5

            # Map to 0-20 score
            score = min(20, max(0, int((confidence - 0.5) * 40))) if is_real else 0

            return {"is_real": is_real, "confidence": round(confidence, 4), "score": score}

        except Exception as e:
            return {"is_real": False, "confidence": 0.0, "score": 0, "error": str(e)}
