"""
Free local face matching using the face_recognition library (dlib-based).
No cloud API calls — all processing is on-device.
"""

import face_recognition
from PIL import Image
import numpy as np

from .base import BaseProvider, MatchResult


class DlibProvider(BaseProvider):
    def compare(self, id_path: str, selfie_path: str, threshold: float) -> MatchResult:
        try:
            id_img = face_recognition.load_image_file(id_path)
            selfie_img = face_recognition.load_image_file(selfie_path)

            id_encodings = face_recognition.face_encodings(id_img)
            selfie_encodings = face_recognition.face_encodings(selfie_img)

            if not id_encodings:
                return MatchResult(
                    distance=1.0, similarity=0.0, match=False,
                    error="No face detected in ID image",
                )
            if not selfie_encodings:
                return MatchResult(
                    distance=1.0, similarity=0.0, match=False,
                    error="No face detected in selfie image",
                )

            distance = face_recognition.face_distance(
                [id_encodings[0]], selfie_encodings[0]
            )[0]
            similarity = max(0.0, min(100.0, (1 - distance) * 100))
            match = distance < threshold

            return MatchResult(
                distance=float(distance),
                similarity=float(similarity),
                match=bool(match),
            )
        except Exception as e:
            return MatchResult(
                distance=1.0, similarity=0.0, match=False, error=str(e),
            )
