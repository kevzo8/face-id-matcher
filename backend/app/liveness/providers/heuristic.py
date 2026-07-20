import numpy as np
import cv2
import io


class HeuristicProvider:
    def predict(self, image_bytes: bytes, bbox: list[float] | None = None) -> dict:
        try:
            img = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
            if img is None:
                return self._error("Could not decode image")

            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            height, width = img.shape[:2]

            metrics = {}
            breakdown = []

            # 1. Sharpness (Laplacian variance)
            lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            metrics["sharpness"] = min(1.0, lap_var / 100)
            breakdown.append({"label": "Sharpness", "pts": round(metrics["sharpness"] * 2.5)})

            # 2. Edge count (Canny)
            edges = cv2.Canny(gray, 50, 150)
            edge_ratio = np.count_nonzero(edges) / (height * width)
            metrics["edges"] = min(1.0, edge_ratio * 20)
            breakdown.append({"label": "Edge Detail", "pts": round(metrics["edges"] * 2.5)})

            # 3. Color depth (channel variance)
            if len(img.shape) == 3:
                ch_var = max(cv2.Laplacian(img[:, :, c], cv2.CV_64F).var() for c in range(3))
                metrics["color_depth"] = min(1.0, ch_var / 500)
            else:
                metrics["color_depth"] = 0
            breakdown.append({"label": "Color Depth", "pts": round(metrics["color_depth"] * 2.5)})

            # 4. Tonal range (histogram spread)
            hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
            non_zero = hist[hist > 0]
            if len(non_zero) > 0:
                spread = len(non_zero) / 256
                metrics["tonal_range"] = min(1.0, spread * 2)
            else:
                metrics["tonal_range"] = 0
            breakdown.append({"label": "Tonal Range", "pts": round(metrics["tonal_range"] * 2.5)})

            # 5. Detail (FFT high-frequency)
            f = np.fft.fft2(gray)
            fshift = np.fft.fftshift(f)
            magnitude = np.abs(fshift)
            hf_mask = np.ones(gray.shape) * 0.1
            cy, cx = gray.shape
            cv2.circle(hf_mask, (cx // 2, cy // 2), min(cx, cy) // 10, 0, -1)
            hf_energy = np.sum(magnitude * hf_mask) / np.sum(magnitude)
            metrics["detail"] = min(1.0, hf_energy * 10)
            breakdown.append({"label": "Fine Detail", "pts": round(metrics["detail"] * 2.5)})

            # 6. No glare (highlight ratio)
            hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
            highlights = np.sum(hsv[:, :, 2] > 220) / (height * width)
            metrics["no_glare"] = 1.0 - min(1.0, highlights * 5)
            breakdown.append({"label": "No Glare", "pts": round(metrics["no_glare"] * 2.5)})

            # 7. No moiré (screen pattern)
            gray_f32 = np.float32(gray)
            dft = cv2.dft(gray_f32, flags=cv2.DFT_COMPLEX_OUTPUT)
            dft_shift = np.fft.fftshift(dft)
            magnitude = 20 * np.log(cv2.magnitude(dft_shift[:, :, 0], dft_shift[:, :, 1]) + 1)
            _, peak_mask = cv2.threshold(magnitude, np.percentile(magnitude, 99), 255, cv2.THRESH_BINARY)
            peak_ratio = np.count_nonzero(peak_mask) / (height * width)
            metrics["no_moire"] = 1.0 - min(1.0, peak_ratio * 50)
            breakdown.append({"label": "No Moiré", "pts": round(metrics["no_moire"] * 2.5)})

            # 8. No banding (color quantization)
            quantized = (gray // 32) * 32
            unique_levels = len(np.unique(quantized))
            banding_ratio = 1.0 - (unique_levels / 8)
            metrics["no_banding"] = 1.0 - min(1.0, banding_ratio * 2)
            breakdown.append({"label": "No Banding", "pts": round(metrics["no_banding"] * 2.5)})

            score = sum(b["pts"] for b in breakdown)
            confidence = score / 20.0
            is_real = score > 14

            return {
                "is_real": is_real,
                "confidence": round(confidence, 4),
                "score": score,
                "breakdown": breakdown,
                "error": None,
            }
        except Exception as e:
            return self._error(str(e))

    def _error(self, msg: str) -> dict:
        return {"is_real": False, "confidence": 0, "score": 0, "breakdown": [], "error": msg}
