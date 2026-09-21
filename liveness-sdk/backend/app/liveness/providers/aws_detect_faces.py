import base64
import os


class AWSDetectFacesProvider:
    def __init__(self):
        self._client = None

    def _get_client(self):
        if self._client is None:
            import boto3
            self._client = boto3.client(
                "rekognition",
                region_name=os.environ.get("AWS_DEFAULT_REGION", "ap-southeast-1"),
            )
        return self._client

    def predict(self, image_bytes: bytes, bbox: list[float] | None = None) -> dict:
        try:
            client = self._get_client()
            response = client.detect_faces(
                Image={"Bytes": image_bytes},
                Attributes=["ALL"],
            )

            if not response["FaceDetails"]:
                return {"is_real": False, "confidence": 0, "score": 0, "error": "No face detected"}

            face = response["FaceDetails"][0]
            confidence = face.get("Confidence", 0)
            eyes_open = face.get("EyesOpen", {}).get("Value", False)
            eyes_open_conf = face.get("EyesOpen", {}).get("Confidence", 0)
            occluded = face.get("FaceOccluded", {}).get("Value", False)
            occluded_conf = face.get("FaceOccluded", {}).get("Confidence", 0)
            quality = face.get("Quality", {})
            brightness = quality.get("Brightness", 0)
            sharpness = quality.get("Sharpness", 0)

            score = 0
            if confidence > 90: score += 5
            if eyes_open and eyes_open_conf > 80: score += 5
            if brightness > 40: score += 5
            if sharpness > 40: score += 5

            return {
                "face_detected": True,
                "is_real": score > 14,
                "confidence": confidence,
                "eyes_open": eyes_open,
                "eyes_open_confidence": eyes_open_conf,
                "face_occluded": occluded,
                "face_occluded_confidence": occluded_conf,
                "quality_brightness": brightness,
                "quality_sharpness": sharpness,
                "score": score,
                "age_low": face.get("AgeRange", {}).get("Low"),
                "age_high": face.get("AgeRange", {}).get("High"),
                "gender": face.get("Gender", {}).get("Value"),
                "expression": max(face.get("Emotions", []), key=lambda e: e.get("Confidence", 0)).get("Type") if face.get("Emotions") else None,
                "breakdown": [
                    {"label": "Face Confidence", "pts": 5 if confidence > 90 else 0},
                    {"label": "Eyes Open", "pts": 5 if eyes_open and eyes_open_conf > 80 else 0},
                    {"label": "Lighting", "pts": 5 if brightness > 40 else 0},
                    {"label": "Sharpness", "pts": 5 if sharpness > 40 else 0},
                ],
                "info": [
                    {"label": "Age", "value": f"{face.get('AgeRange', {}).get('Low', '?')}-{face.get('AgeRange', {}).get('High', '?')}"},
                    {"label": "Gender", "value": face.get("Gender", {}).get("Value", "?")},
                    {"label": "Eyes Open", "value": f"Yes ({eyes_open_conf:.0f}%)" if eyes_open else "No"},
                    {"label": "Occluded", "value": f"Yes ({occluded_conf:.0f}%)" if occluded else "No"},
                    {"label": "Lighting", "value": f"{brightness:.0f}"},
                    {"label": "Sharpness", "value": f"{sharpness:.0f}"},
                ],
                "error": None,
            }
        except Exception as e:
            return {
                "face_detected": False,
                "is_real": False, "confidence": 0, "score": 0,
                "eyes_open": False, "eyes_open_confidence": 0,
                "quality_brightness": 0, "quality_sharpness": 0,
                "error": str(e)
            }

    def is_available(self) -> bool:
        # boto3 builds a client even with no credentials — require resolvable
        # credentials so callers don't make doomed AWS calls that fail silently.
        try:
            import boto3
            if boto3.Session().get_credentials() is None:
                return False
            self._get_client()
            return True
        except Exception:
            return False
