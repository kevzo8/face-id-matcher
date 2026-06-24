"""
Free local face matching using InsightFace (ONNX-based).
No cloud API calls — all processing is on-device.
No CMake or C++ compiler required — uses pre-built ONNX models.
"""

import numpy as np
from insightface.app import FaceAnalysis

from .base import BaseProvider, MatchResult

_provider = None


def get_provider():
    global _provider
    if _provider is None:
        _provider = FaceAnalysis(
            name="buffalo_l",
            providers=["CPUExecutionProvider"],
        )
        _provider.prepare(ctx_id=0, det_size=(640, 640))
    return _provider


class InsightFaceProvider(BaseProvider):
    def compare(self, id_path: str, selfie_path: str, threshold: float) -> MatchResult:
        try:
            import cv2

            app = get_provider()

            id_img = cv2.imread(id_path)
            if id_img is None:
                return MatchResult(
                    distance=1.0, similarity=0.0, match=False,
                    error=f"Could not read ID image: {id_path}",
                )
            selfie_img = cv2.imread(selfie_path)
            if selfie_img is None:
                return MatchResult(
                    distance=1.0, similarity=0.0, match=False,
                    error=f"Could not read selfie image: {selfie_path}",
                )

            id_faces = app.get(id_img)
            selfie_faces = app.get(selfie_img)

            if not id_faces:
                return MatchResult(
                    distance=1.0, similarity=0.0, match=False,
                    error="No face detected in ID image",
                )
            if not selfie_faces:
                return MatchResult(
                    distance=1.0, similarity=0.0, match=False,
                    error="No face detected in selfie image",
                )

            id_embedding = id_faces[0].normed_embedding
            selfie_embedding = selfie_faces[0].normed_embedding

            cosine_sim = float(np.dot(id_embedding, selfie_embedding))
            distance = float(1.0 - cosine_sim)
            similarity = max(0.0, min(100.0, cosine_sim * 100))
            match = cosine_sim > (1 - threshold)

            return MatchResult(
                distance=distance,
                similarity=similarity,
                match=bool(match),
            )
        except Exception as e:
            return MatchResult(
                distance=1.0, similarity=0.0, match=False, error=str(e),
            )
