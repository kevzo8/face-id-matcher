"""
Free local face matching using InsightFace (ONNX-based).
No cloud API calls — all processing is on-device.
No CMake or C++ compiler required — uses pre-built ONNX models.
"""

import math
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


def _check_face(label: str, img, faces) -> list[str]:
    warnings: list[str] = []
    h, w = img.shape[:2]
    if w < 100 or h < 100:
        warnings.append(f"{label}: image too small ({w}x{h})")

    if not faces:
        warnings.append(f"{label}: no face detected")
        return warnings

    face = faces[0]
    det_score = getattr(face, "det_score", 1.0)
    if det_score < 0.5:
        warnings.append(f"{label}: low detection confidence ({det_score:.2f})")

    bbox = getattr(face, "bbox", None)
    if bbox is not None:
        fx1, fy1, fx2, fy2 = bbox[:4]
        face_w = fx2 - fx1
        face_h = fy2 - fy1
        face_area = face_w * face_h
        img_area = w * h
        if img_area > 0 and face_area / img_area < 0.03:
            warnings.append(f"{label}: face too small ({face_w:.0f}x{face_h:.0f}px)")

    pose = getattr(face, "pose", None)
    if pose is not None and len(pose) >= 3:
        yaw, pitch, roll = pose[0], pose[1], pose[2]
        if abs(yaw) > 30:
            warnings.append(f"{label}: face is side-view (yaw={yaw:.0f}°)")
        if abs(pitch) > 25:
            warnings.append(f"{label}: face is looking up/down (pitch={pitch:.0f}°)")
        if abs(roll) > 20:
            warnings.append(f"{label}: face is tilted (roll={roll:.0f}°)")

    landmarks = getattr(face, "landmarks", None)
    if landmarks is not None and len(landmarks) >= 2:
        le_x, le_y = landmarks[0]
        re_x, re_y = landmarks[1]
        eye_dx = re_x - le_x
        eye_dy = re_y - le_y
        eye_angle = abs(math.degrees(math.atan2(eye_dy, eye_dx)))
        if eye_angle > 15:
            warnings.append(f"{label}: face is tilted ({eye_angle:.0f}°)")

    return warnings


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

            id_warnings = _check_face("ID photo", id_img, id_faces)
            selfie_warnings = _check_face("Selfie", selfie_img, selfie_faces)
            all_warnings = id_warnings + selfie_warnings

            if not id_faces:
                return MatchResult(
                    distance=1.0, similarity=0.0, match=False,
                    error="No face detected in ID image",
                    warnings=all_warnings,
                )
            if not selfie_faces:
                return MatchResult(
                    distance=1.0, similarity=0.0, match=False,
                    error="No face detected in selfie image",
                    warnings=all_warnings,
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
                warnings=all_warnings or None,
            )
        except Exception as e:
            return MatchResult(
                distance=1.0, similarity=0.0, match=False, error=str(e),
            )