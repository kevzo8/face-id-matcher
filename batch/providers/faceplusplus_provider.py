"""
Face++ (Megvii) face matching provider.
Requires FACEPLUSPLUS_API_KEY and FACEPLUSPLUS_API_SECRET env vars.

Auto-rotates images when Face++ returns 0% confidence (face detection failure),
typically caused by orientation mismatch between ID photo and selfie.
"""

import os
import time
import base64
import requests
from io import BytesIO

try:
    from PIL import Image
    _pil_available = True
except ImportError:
    _pil_available = False

from .base import BaseProvider, MatchResult


class FacePlusPlusProvider(BaseProvider):
    def __init__(self):
        self.api_key = os.environ.get("FACEPLUSPLUS_API_KEY")
        self.api_secret = os.environ.get("FACEPLUSPLUS_API_SECRET")
        if not self.api_key or not self.api_secret:
            raise ValueError("FACEPLUSPLUS_API_KEY and FACEPLUSPLUS_API_SECRET env vars required")
        self.endpoint = "https://api-us.faceplusplus.com/facepp/v3/compare"

    def _call_api(self, id_b64: str, selfie_b64: str) -> dict:
        """Call Face++ API with retry logic for rate limiting."""
        for attempt in range(3):
            response = requests.post(
                self.endpoint,
                data={
                    "api_key": self.api_key,
                    "api_secret": self.api_secret,
                    "image_base64_1": id_b64,
                    "image_base64_2": selfie_b64,
                },
                timeout=30,
            )

            if response.status_code == 403 and "CONCURRENCY_LIMIT" in response.text:
                time.sleep(1.5 * (attempt + 1))
                continue

            break

        if response.status_code != 200:
            return {"error": f"Face++ API error: {response.status_code} - {response.text}"}

        data = response.json()
        if "error_message" in data:
            return {"error": f"Face++ error: {data['error_message']}"}

        return data

    def _rotate_image(self, image_path: str, degrees: int) -> str:
        """Rotate image and return base64 string."""
        if not _pil_available:
            return None
        
        try:
            img = Image.open(image_path)
            rotated = img.rotate(degrees, expand=True)
            buffer = BytesIO()
            rotated.save(buffer, format="JPEG", quality=95)
            return base64.b64encode(buffer.getvalue()).decode()
        except Exception:
            return None

    def compare(self, id_path: str, selfie_path: str, threshold: float) -> MatchResult:
        try:
            with open(id_path, "rb") as f:
                id_bytes = f.read()
            with open(selfie_path, "rb") as f:
                selfie_bytes = f.read()

            id_b64 = base64.b64encode(id_bytes).decode()
            selfie_b64 = base64.b64encode(selfie_bytes).decode()

            # Try original orientation first
            data = self._call_api(id_b64, selfie_b64)
            
            if "error" in data:
                return MatchResult(
                    distance=1.0, similarity=0.0, match=False, error=data["error"],
                )

            confidence = float(data.get("confidence", 0))
            
            # If confidence is 0%, try rotating both images 90° CW
            if confidence == 0.0 and _pil_available:
                warnings = ["Face detection failed, trying auto-rotation"]
                
                id_rotated = self._rotate_image(id_path, 90)
                selfie_rotated = self._rotate_image(selfie_path, 90)
                
                if id_rotated and selfie_rotated:
                    data_rotated = self._call_api(id_rotated, selfie_rotated)
                    
                    if "error" not in data_rotated:
                        confidence_rotated = float(data_rotated.get("confidence", 0))
                        if confidence_rotated > confidence:
                            data = data_rotated
                            confidence = confidence_rotated
                            warnings.append(f"Auto-rotation improved confidence: {confidence:.1f}%")

            similarity = confidence
            distance = 1 - (confidence / 100)
            match = confidence >= (threshold * 100)

            return MatchResult(
                distance=distance,
                similarity=similarity,
                match=match,
                warnings=warnings if confidence == 0.0 else None,
            )

        except Exception as e:
            return MatchResult(
                distance=1.0, similarity=0.0, match=False, error=str(e),
            )
