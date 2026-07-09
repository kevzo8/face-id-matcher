"""
AWS Rekognition passive liveness detection provider.
Uses DetectFaces to extract face attributes for heuristic liveness scoring.
Requires AWS credentials configured (aws configure or env vars).
"""

import boto3
import json
import logging
from typing import Optional

logger = logging.getLogger(__name__)


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
            
            # DEBUG: Log raw AWS response
            mouth_data = face.get("MouthOpen", {})
            eyes_data = face.get("EyesOpen", {})
            logger.info(f"🔍 AWS Raw: MouthOpen={mouth_data}, EyesOpen={eyes_data}")
            
            # Extract attributes for heuristic scoring
            # Real faces typically have:
            # - Eyes open (EyesOpen.Confidence > 80)
            # - Natural expression (Smile, Mouth not overly wide)
            # - Good sharpness (Quality.Sharpness > 50)
            # - Proper lighting (Quality.Brightness not extreme)
            
            eyes_open_conf = face.get("EyesOpen", {}).get("Confidence", 0)
            eyes_open_value = face.get("EyesOpen", {}).get("Value", False)
            
            mouth_open_conf = face.get("MouthOpen", {}).get("Confidence", 0)
            mouth_open_value = face.get("MouthOpen", {}).get("Value", False)
            
            quality = face.get("Quality", {})
            sharpness = quality.get("Sharpness", 0)
            brightness = quality.get("Brightness", 50)

            # Heuristic scoring (0-100)
            # 1. Eyes must be open (30 pts) — penalize if eyes closed
            if eyes_open_value:
                eyes_score = min(30, eyes_open_conf * 0.3)  # Confident eyes are open
            else:
                eyes_score = max(0, 30 - eyes_open_conf * 0.3)  # Eyes closed is bad

            # 2. Mouth closed/natural (20 pts) — only penalize if AWS is VERY confident mouth is open
            if mouth_open_value and mouth_open_conf >= 90:
                # Penalize only when mouth is clearly open (90%+ confidence)
                mouth_score = max(0, 20 - (mouth_open_conf - 90) * 2)  # At 100% → 0 pts, at 90% → 20 pts
            else:
                mouth_score = 20  # Mouth closed OR low-confidence open → natural (passive liveness allows closed mouth)
            # 3. Good sharpness (25 pts)
            sharpness_score = (sharpness / 100) * 25
            
            # 4. Good lighting (25 pts) — brightness should be ~50
            brightness_score = max(0, 25 - abs(brightness - 50) * 0.5)
            
            confidence_score = eyes_score + mouth_score + sharpness_score + brightness_score
            confidence_score = min(100, max(0, confidence_score))
            
            # Map to 0-20 scale
            score = max(1, min(20, int((confidence_score / 100) * 20)))
            is_real = confidence_score > 50  # 50 pts threshold = ~50% fairness, matches Face++ livescore > 50
            
            # Calculate breakdown scores by each component's contribution to final score
            # Max total = 30+20+25+25 = 100, maps to 0-20 scale
            # Each component's max contribution:
            # - Eyes: (30/100) * 20 = 6 pts
            # - Mouth: (20/100) * 20 = 4 pts
            # - Sharpness: (25/100) * 20 = 5 pts
            # - Brightness: (25/100) * 20 = 5 pts
            eyes_breakdown = round((eyes_score / 30) * 6, 1)
            mouth_breakdown = round((mouth_score / 20) * 4, 1)
            sharpness_breakdown = round((sharpness_score / 25) * 5, 1)
            brightness_breakdown = round((brightness_score / 25) * 5, 1)
            
            breakdown_sum = eyes_breakdown + mouth_breakdown + sharpness_breakdown + brightness_breakdown
            logger.debug(f"AWS Breakdown: Eyes={eyes_breakdown}, Mouth={mouth_breakdown}, Sharpness={sharpness_breakdown}, Brightness={brightness_breakdown}, Sum={breakdown_sum}, Score={score}")
            
            return {
                "is_real": bool(is_real),
                "confidence": round(confidence_score / 100, 2),
                "score": score,
                "breakdown": [
                    {"label": "Eyes Open", "pts": eyes_breakdown},
                    {"label": "Mouth Natural", "pts": mouth_breakdown},
                    {"label": "Sharpness", "pts": sharpness_breakdown},
                    {"label": "Brightness", "pts": brightness_breakdown}
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
