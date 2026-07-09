"""
Face++ (Megvii) passive liveness detection provider.
Requires FACEPLUSPLUS_API_KEY and FACEPLUSPLUS_API_SECRET env vars.
"""

import os
import base64
import logging
import requests
from typing import Optional

logger = logging.getLogger(__name__)

class LivenessFacePlusPlusProvider:
    """Passive liveness detection using Face++ API."""
    
    def __init__(self):
        self.api_key = os.environ.get("FACEPLUSPLUS_API_KEY")
        self.api_secret = os.environ.get("FACEPLUSPLUS_API_SECRET")
        if not self.api_key or not self.api_secret:
            raise ValueError("FACEPLUSPLUS_API_KEY and FACEPLUSPLUS_API_SECRET env vars required")
        self.url = "https://api-us.faceplusplus.com/facepp/v3/detect"
    
    def predict(self, image_bytes: bytes, bbox: Optional[list[float]] = None) -> dict:
        """
        Predict liveness of a face in an image using Face++ API.
        
        Args:
            image_bytes: Raw image bytes
            bbox: Bounding box [x, y, w, h] as fraction of image size (unused for Face++)
        
        Returns:
            {
                "is_real": bool,
                "confidence": float (0-1),
                "score": int (0-20),
                "breakdown": [{"label": str, "pts": float}],
                "error": str or None
            }
        """
        try:
            # Encode image to base64
            image_b64 = base64.b64encode(image_bytes).decode()
            
            # Call Face++ Detect API (Facial Recognition product) requesting the liveness attribute
            response = requests.post(
                self.url,
                data={
                    "api_key": self.api_key,
                    "api_secret": self.api_secret,
                    "image_base64": image_b64,
                    "return_attributes": "liveness",
                },
                timeout=10
            )
            
            if response.status_code != 200:
                return {
                    "is_real": False,
                    "confidence": 0,
                    "score": 0,
                    "error": f"Face++ API error: {response.status_code}"
                }
            
            data = response.json()
            
            # Check for API errors
            if "error_message" in data:
                return {
                    "is_real": False,
                    "confidence": 0,
                    "score": 0,
                    "error": f"Face++ error: {data['error_message']}"
                }
            
            # Detect API returns faces[] with attributes.liveness
            faces = data.get("faces", [])
            if not faces:
                return {
                    "is_real": False,
                    "confidence": 0,
                    "score": 0,
                    "error": "No face detected"
                }

            face = faces[0]
            liveness = face.get("attributes", {}).get("liveness")
            logger.info(f"🔍 Face++ detect liveness: {liveness}")

            # liveness assumed shape: {"value": 0|1|2, "threshold": float}
            #   1 = real, 2 = fake, 0 = uncertain
            lv = 0
            if isinstance(liveness, dict):
                lv = int(liveness.get("value", 0))
            elif isinstance(liveness, (int, float)):
                lv = int(liveness)

            if lv == 2:
                livescore = 0    # spoof / fake
            elif lv == 1:
                livescore = 100  # real
            else:
                livescore = 50   # uncertain

            # Map to 0-20 scale and 0-1 confidence
            score = max(1, min(20, int((livescore / 100) * 20)))
            confidence = livescore / 100

            # Real only when Face++ is confident the face is live
            is_real = livescore > 70

            return {
                "is_real": bool(is_real),
                "confidence": round(confidence, 2),
                "score": score,
                "breakdown": [
                    {"label": "Face++ Liveness", "pts": round((livescore / 100) * 4, 1)}
                ],
                "error": None
            }
            
        except requests.RequestException as e:
            return {
                "is_real": False,
                "confidence": 0,
                "score": 0,
                "error": f"Face++ request error: {str(e)}"
            }
        except Exception as e:
            return {
                "is_real": False,
                "confidence": 0,
                "score": 0,
                "error": f"Face++ error: {str(e)}"
            }
