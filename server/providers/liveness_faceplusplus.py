"""
Face++ (Megvii) passive liveness detection provider.
Requires FACEPLUSPLUS_API_KEY and FACEPLUSPLUS_API_SECRET env vars.
"""

import os
import base64
import requests
from typing import Optional


class LivenessFacePlusPlusProvider:
    """Passive liveness detection using Face++ API."""
    
    def __init__(self):
        self.api_key = os.environ.get("FACEPLUSPLUS_API_KEY")
        self.api_secret = os.environ.get("FACEPLUSPLUS_API_SECRET")
        if not self.api_key or not self.api_secret:
            raise ValueError("FACEPLUSPLUS_API_KEY and FACEPLUSPLUS_API_SECRET env vars required")
        self.url = "https://api-us.faceplusplus.com/facepp/v1/liveness"
    
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
            
            # Call Face++ liveness API
            response = requests.post(
                self.url,
                data={
                    "api_key": self.api_key,
                    "api_secret": self.api_secret,
                    "image_base64": image_b64,
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
            
            # Extract liveness score (0-100)
            liveness = data.get("liveness", {})
            livescore = liveness.get("livescore", 0)  # 0-100
            spoof_score = liveness.get("spoof_score", 100)  # 0-100
            
            # Map to 0-20 scale and 0-1 confidence
            score = max(1, min(20, int((livescore / 100) * 20)))
            confidence = livescore / 100
            
            # Face++ returns livescore > 70 as real (raise threshold to reject printed photos / spoofs)
            is_real = livescore > 70
            
            return {
                "is_real": bool(is_real),
                "confidence": round(confidence, 2),
                "score": score,
                "breakdown": [
                    {"label": "Face++ Liveness", "pts": round((livescore / 100) * 4, 1)},
                    {"label": "Anti-Spoof", "pts": round((max(0, 100 - spoof_score) / 100) * 4, 1)}
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
