"""
Face++ (Megvii) passive liveness detection provider.
Requires FACEPLUSPLUS_API_KEY and FACEPLUSPLUS_API_SECRET env vars.

NOTE: The Free plan does NOT include a true liveness API.
- facepp/v1/liveness returns 404 (not on Free plan)
- facepp/v3/detect does NOT accept return_attributes=liveness (-> 400)
So we call facepp/v3/detect (Free-plan Detect API) with standard attributes
(eyestatus, blur, gender, age, smiling) and derive a HEURISTIC liveness
score from them. This is not true liveness detection.
"""

import os
import base64
import logging
import requests
from typing import Optional

logger = logging.getLogger(__name__)


class LivenessFacePlusPlusProvider:
    """Passive liveness detection using Face++ Detect API (heuristic, Free-plan safe)."""

    def __init__(self):
        self.api_key = os.environ.get("FACEPLUSPLUS_API_KEY")
        self.api_secret = os.environ.get("FACEPLUSPLUS_API_SECRET")
        if not self.api_key or not self.api_secret:
            raise ValueError("FACEPLUSPLUS_API_KEY and FACEPLUSPLUS_API_SECRET env vars required")
        self.url = "https://api-us.faceplusplus.com/facepp/v3/detect"

    @staticmethod
    def _eye_open_prob(status: dict) -> float:
        """Max probability (0-1) that the eye is open across glasses/occlusion states."""
        if not isinstance(status, dict):
            return 0.0
        open_vals = [
            status.get("no_glass_eye_open", 0),
            status.get("normal_glass_eye_open", 0),
            status.get("dark_glasses_eye_open", 0),
        ]
        return max([v for v in open_vals if isinstance(v, (int, float))], default=0) / 100.0

    def predict(self, image_bytes: bytes, bbox: Optional[list[float]] = None) -> dict:
        """
        Heuristic passive liveness using Face++ Detect API attributes.

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
            image_b64 = base64.b64encode(image_bytes).decode()

            # Free-plan Detect API with standard (valid) attributes only
            response = requests.post(
                self.url,
                data={
                    "api_key": self.api_key,
                    "api_secret": self.api_secret,
                    "image_base64": image_b64,
                    "return_attributes": "gender,age,smiling,eyestatus,blur,emotion",
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

            if "error_message" in data:
                return {
                    "is_real": False,
                    "confidence": 0,
                    "score": 0,
                    "error": f"Face++ error: {data['error_message']}"
                }

            faces = data.get("faces", [])
            if not faces:
                return {
                    "is_real": False,
                    "confidence": 0,
                    "score": 0,
                    "error": "No face detected"
                }

            attrs = faces[0].get("attributes", {})
            logger.info(f"🔍 Face++ detect attributes: {list(attrs.keys())}")

            # 1. Eyes open (0-1) — real faces typically have eyes open
            eyestatus = attrs.get("eyestatus", {})
            left_open = self._eye_open_prob(eyestatus.get("left_eye_status", {}))
            right_open = self._eye_open_prob(eyestatus.get("right_eye_status", {}))
            eyes_open = (left_open + right_open) / 2.0

            # 2. Blur (blurness 0-100, higher = worse) — structure varies by API version
            blur = attrs.get("blur", {})
            blurness = 0
            if isinstance(blur, dict):
                b = blur.get("blurness", 0)
                if isinstance(b, dict):
                    blurness = b.get("value", 0)
                elif isinstance(b, (int, float)):
                    blurness = b

            # Heuristic livescore (0-100): eyes open + image sharpness
            score_eyes = eyes_open * 50          # up to 50
            score_blur = max(0.0, 50.0 - blurness * 0.5)  # up to 50
            livescore = score_eyes + score_blur

            # Prediction attributes (info only — not used for the liveness score)
            gender = attrs.get("gender", {})
            gender_val = gender.get("value") if isinstance(gender, dict) else None
            age = attrs.get("age", {})
            age_val = age.get("value") if isinstance(age, dict) else None
            smiling = attrs.get("smiling", {})
            smiling_val = smiling.get("value") if isinstance(smiling, dict) else None
            emotion = attrs.get("emotion", {})
            expression = None
            if isinstance(emotion, dict):
                expression = max(
                    (k for k, v in emotion.items() if isinstance(v, (int, float))),
                    key=lambda k: emotion[k],
                    default=None,
                )

            info = []
            if age_val is not None:
                info.append({"label": "Age", "value": str(int(age_val))})
            if gender_val:
                info.append({"label": "Gender", "value": str(gender_val)})
            if smiling_val is not None:
                info.append({"label": "Smiling", "value": f"{int(smiling_val)}%"})
            if expression:
                info.append({"label": "Expression", "value": str(expression).title()})

            score = max(1, min(20, int((livescore / 100) * 20)))
            confidence = livescore / 100
            is_real = livescore > 70  # same 70 threshold as the other passive providers

            return {
                "is_real": bool(is_real),
                "confidence": round(confidence, 2),
                "score": score,
                "breakdown": [
                    {"label": "Face++ Eyes Open", "pts": round((score_eyes / 50) * 4, 1)},
                    {"label": "Face++ Quality", "pts": round((score_blur / 50) * 4, 1)},
                ],
                "info": info,
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
