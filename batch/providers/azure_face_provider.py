"""
Azure Face API provider for face matching.
Requires AZURE_FACE_ENDPOINT and AZURE_FACE_KEY environment variables.
"""

import os
import requests
from typing import Optional
from .base import BaseProvider, MatchResult


class AzureFaceProvider(BaseProvider):
    def __init__(self):
        self.endpoint = os.environ.get("AZURE_FACE_ENDPOINT")
        self.key = os.environ.get("AZURE_FACE_KEY")
        
        if not self.endpoint or not self.key:
            raise ValueError("AZURE_FACE_ENDPOINT and AZURE_FACE_KEY must be set")
        
        # Remove trailing slash if present
        self.endpoint = self.endpoint.rstrip("/")
        
    def detect_face(self, image_path: str) -> Optional[str]:
        """Detect face in image and return faceId."""
        url = f"{self.endpoint}/face/v1.0/detect"
        headers = {
            "Ocp-Apim-Subscription-Key": self.key,
            "Content-Type": "application/octet-stream"
        }
        params = {
            "returnFaceId": "true",
            "returnFaceAttributes": ""
        }
        
        with open(image_path, "rb") as f:
            image_data = f.read()
        
        response = requests.post(url, headers=headers, params=params, data=image_data, timeout=30)
        
        if response.status_code != 200:
            return None
        
        faces = response.json()
        if not faces:
            return None
        
        return faces[0]["faceId"]
    
    def compare(self, id_path: str, selfie_path: str, threshold: float) -> MatchResult:
        """Compare two faces using Azure Face API."""
        try:
            # Detect faces in both images
            id_face_id = self.detect_face(id_path)
            if not id_face_id:
                return MatchResult(
                    similarity=0.0,
                    distance=1.0,
                    match=False,
                    error="No face detected in ID image"
                )
            
            selfie_face_id = self.detect_face(selfie_path)
            if not selfie_face_id:
                return MatchResult(
                    similarity=0.0,
                    distance=1.0,
                    match=False,
                    error="No face detected in selfie image"
                )
            
            # Verify the two faces
            url = f"{self.endpoint}/face/v1.0/verify"
            headers = {
                "Ocp-Apim-Subscription-Key": self.key,
                "Content-Type": "application/json"
            }
            body = {
                "faceId1": id_face_id,
                "faceId2": selfie_face_id
            }
            
            response = requests.post(url, headers=headers, json=body, timeout=30)
            
            if response.status_code != 200:
                return MatchResult(
                    similarity=0.0,
                    distance=1.0,
                    match=False,
                    error=f"Azure API error: {response.status_code}"
                )
            
            result = response.json()
            confidence = result.get("confidence", 0.0)
            is_identical = result.get("isIdentical", False)
            
            # Azure confidence is 0-1, convert to percentage
            similarity = confidence * 100
            distance = 1.0 - confidence
            match = confidence >= threshold
            
            return MatchResult(
                similarity=similarity,
                distance=distance,
                match=match
            )
            
        except Exception as e:
            return MatchResult(
                similarity=0.0,
                distance=1.0,
                match=False,
                error=str(e)
            )
