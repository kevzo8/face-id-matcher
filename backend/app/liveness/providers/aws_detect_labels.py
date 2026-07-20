import base64
import os


class AWSDetectLabelsProvider:
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

    def predict(self, image_bytes: bytes) -> dict:
        try:
            client = self._get_client()
            response = client.detect_labels(
                Image={"Bytes": image_bytes},
                MaxLabels=50,
                MinConfidence=70,
            )

            spoof_indicators = {
                "Mobile Phone": 0, "Cell Phone": 0, "Smartphone": 0, "Phone": 0,
                "Hand": 0, "Finger": 0,
                "Screen": 0, "Display": 0, "Monitor": 0, "Television": 0, "TV": 0,
                "Photo": 0, "Photograph": 0, "Picture": 0, "Picture Frame": 0,
                "Frame": 0, "Border": 0, "Paper": 0, "Printed Material": 0,
                "Flat": 0, "Two-Dimensional": 0, "Poster": 0, "Print": 0,
                "ID Card": 0, "Identification Card": 0, "Driver's License": 0,
                "Passport": 0, "License": 0, "Credit Card": 0, "Card": 0,
                "Identification": 0, "Document": 0, "ID": 0,
            }
            detected_spoof_objects = []

            for label in response.get("Labels", []):
                name = label.get("Name", "")
                confidence = label.get("Confidence", 0)
                if name in spoof_indicators and confidence >= 80:
                    spoof_indicators[name] = confidence
                    detected_spoof_objects.append({"label": name, "confidence": confidence})

            has_phone = any(v > 0 for k, v in spoof_indicators.items() if k in ["Mobile Phone", "Cell Phone", "Smartphone", "Phone"])
            has_hand = any(v > 0 for k, v in spoof_indicators.items() if k in ["Hand", "Finger"])
            has_screen = any(v > 0 for k, v in spoof_indicators.items() if k in ["Screen", "Display", "Monitor", "Television", "TV"])
            has_photo = any(v > 0 for k, v in spoof_indicators.items() if k in ["Photo", "Photograph", "Picture", "Picture Frame", "Frame", "Border", "Paper", "Printed Material", "Flat", "Two-Dimensional", "Poster", "Print"])
            has_id = any(v > 0 for k, v in spoof_indicators.items() if k in ["ID Card", "Identification Card", "Driver's License", "Passport", "License", "Credit Card", "Card", "Identification", "Document", "ID"])

            spoof_risk = "low"
            if has_phone or (has_hand and has_screen) or has_photo or has_id:
                spoof_risk = "high"
            elif has_screen:
                spoof_risk = "medium"

            return {
                "spoof_risk": spoof_risk,
                "spoof_objects_detected": detected_spoof_objects,
                "has_phone": has_phone,
                "has_hand": has_hand,
                "has_screen": has_screen,
                "has_photo": has_photo,
                "has_id": has_id,
                "raw_labels": [
                    {"label": lbl.get("Name", ""), "confidence": lbl.get("Confidence", 0)}
                    for lbl in response.get("Labels", [])
                ],
                "error": None,
            }
        except Exception as e:
            return {"spoof_risk": "unknown", "spoof_objects_detected": [], "error": str(e)}

    def is_available(self) -> bool:
        try:
            self._get_client()
            return True
        except Exception:
            return False
