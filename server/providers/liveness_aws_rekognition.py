"""
AWS Rekognition passive liveness detection provider.
Uses DetectFaces to extract face attributes for heuristic liveness scoring.
Requires AWS credentials configured (aws configure or env vars).
"""

import boto3
from typing import Optional


class LivenessAWSRekognitionProvider:
    """Passive liveness detection using AWS Rekognition DetectFaces."""
    
    def __init__(self, region: str = "us-east-1"):
        self.client = boto3.client("rekognition", region_name=region)
    
    def predict(self, image_bytes: bytes, bbox: Optional[list[float]] = None) -> dict:
        """
        Predict liveness of a face using AWS Rekognition DetectFaces.
        
        Note: AWS DetectFaces is NOT true liveness detection, only face attribute analysis.
        This is a fallback/secondary provider. Use Face++ for better accuracy.
        
        Args:
            image_bytes: Raw image bytes
            bbox: Bounding box [x, y, w, h] as fraction of image size (unused)
        
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
            # Call AWS DetectFaces
            response = self.client.detect_faces(
                Image={"Bytes": image_bytes},
                Attributes=["ALL"]
            )
            
            if not response.get("FaceDetails"):
                return {
                    "is_real": False,
                    "confidence": 0,
                    "score": 0,
                    "error": "No face detected"
                }
            
            # Take the first (largest/most confident) face
            face = response["FaceDetails"][0]
            
            # Extract attributes for heuristic scoring
            # Real faces typically have:
            # - Eyes open (EyesOpen.Confidence > 80)
            # - Natural expression (Smile, Mouth not overly wide)
            # - Good sharpness (Quality.Sharpness > 50)
            # - Proper lighting (Quality.Brightness not extreme)
            
            eyes_open_conf = face.get("EyesOpen", {}).get("Confidence", 0)
            mouth_open_conf = face.get("MouthOpen", {}).get("Confidence", 0)
            quality = face.get("Quality", {})
            sharpness = quality.get("Sharpness", 0)
            brightness = quality.get("Brightness", 50)
            
            # Heuristic scoring (0-100)
            # 1. Eyes must be open (30 pts)
            eyes_score = min(30, eyes_open_conf * 0.3)
            
            # 2. Mouth closed/natural (20 pts) — high mouth_open is bad
            mouth_score = max(0, 20 - mouth_open_conf * 0.2)
            
            # 3. Good sharpness (25 pts)
            sharpness_score = (sharpness / 100) * 25
            
            # 4. Good lighting (25 pts) — brightness should be ~50
            brightness_score = max(0, 25 - abs(brightness - 50) * 0.5)
            
            confidence_score = eyes_score + mouth_score + sharpness_score + brightness_score
            confidence_score = min(100, max(0, confidence_score))
            
            # Map to 0-20 scale
            score = max(1, min(20, int((confidence_score / 100) * 20)))
            is_real = confidence_score > 60
            
            return {
                "is_real": bool(is_real),
                "confidence": round(confidence_score / 100, 2),
                "score": score,
                "breakdown": [
                    {"label": "Eyes Open", "pts": round((eyes_open_conf / 100) * 4, 1)},
                    {"label": "Mouth Natural", "pts": round((max(0, 100 - mouth_open_conf) / 100) * 4, 1)},
                    {"label": "Sharpness", "pts": round((sharpness / 100) * 4, 1)},
                    {"label": "Brightness", "pts": round((max(0, 100 - abs(brightness - 50)) / 100) * 4, 1)}
                ],
                "error": None
            }
            
        except Exception as e:
            return {
                "is_real": False,
                "confidence": 0,
                "score": 0,
                "error": f"AWS Rekognition error: {str(e)}"
            }
