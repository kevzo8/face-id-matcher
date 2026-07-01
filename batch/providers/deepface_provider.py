"""
DeepFace provider — local face matching using TensorFlow-based models.
Supports multiple models (ArcFace, Facenet, etc.) and detectors (retinaface, mtcnn, opencv).
"""

import os

import numpy as np

from .base import BaseProvider, MatchResult


class DeepFaceProvider(BaseProvider):
    def __init__(self, model_name: str = "ArcFace", detector_backend: str = "retinaface"):
        self.model_name = model_name
        self.detector_backend = detector_backend

    def compare(self, id_path: str, selfie_path: str, threshold: float) -> MatchResult:
        try:
            from deepface import DeepFace

            result = DeepFace.verify(
                img1_path=os.path.abspath(id_path),
                img2_path=os.path.abspath(selfie_path),
                model_name=self.model_name,
                detector_backend=self.detector_backend,
                enforce_detection=False,
            )

            distance = float(result["distance"])
            similarity = max(0.0, min(100.0, (1.0 - distance) * 100.0))
            match = similarity >= (threshold * 100)

            return MatchResult(
                distance=distance,
                similarity=similarity,
                match=match,
            )
        except Exception as e:
            return MatchResult(
                distance=1.0, similarity=0.0, match=False, error=str(e),
            )
