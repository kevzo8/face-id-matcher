"""
Face matching using Neurotechnology Megamatcher SDK (pynsdk).
Requires: pip install pynsdk-2025.1.1-py3-none-any.whl
Trial license: NLicenseManager.set_trial_mode(True) — requires internet.

Auto-rotates images when the SDK's face detector fails (0 faces)
or returns suspicious results (>2 faces, indicating rotation confusion from
landscape photos where the subject is ~90° rotated).
"""

import os
import tempfile
from pathlib import Path

from .base import BaseProvider, MatchResult

_sdk_available = False
_sdk_import_error = None

try:
    from nsdk.licensing import NLicenseManager, NLicense
    from nsdk.media import NImage
    from nsdk.biometrics import FaceEngine, NBiometricOperations
    _sdk_available = True
except ImportError as e:
    _sdk_import_error = f"Megamatcher SDK not installed: {e}"

try:
    import cv2
    _cv2_available = True
except ImportError:
    _cv2_available = False


_engine = None
_engine_error = None
_sdk_matching_threshold = 48
_temp_dir = None


def _ensure_engine():
    global _engine, _engine_error, _sdk_matching_threshold, _temp_dir
    if _engine is not None:
        return True
    if not _sdk_available:
        _engine_error = _sdk_import_error
        return False

    try:
        NLicenseManager.set_trial_mode(True)
        for lic in ["FaceMatcher", "FaceClient", "FaceExtractor"]:
            NLicense.obtain("/local", 5000, lic)

        fe = FaceEngine()
        be = fe.biometric_engine
        be.faces_confidence_threshold = 0
        be.faces_quality_threshold = 0
        _sdk_matching_threshold = be.matching_threshold or 48
        _engine = fe
        _engine_error = None
        _temp_dir = Path(tempfile.mkdtemp(prefix="megamatcher_"))
        return True
    except Exception as e:
        _engine_error = f"Megamatcher init failed: {e}"
        return False


def _detect_with_fallback(path: str, label: str) -> tuple:
    """
    Detect faces with auto-rotation fallback.
    - If original detects exactly 1 face: use it (fast path).
    - If 0 faces: try 90° CW rotation (landscape correction).
    - If >2 faces (rotation confusion): try 90° CW rotation.
    Returns (faces, templates, warnings).
    """
    warnings: list[str] = []

    # Fast path: try original
    nimg = NImage(path)
    faces, templates = _engine.detect_faces(
        nimg, operation=NBiometricOperations.create_template,
    )

    n = len(faces)
    if n == 1:
        return faces, templates, warnings  # ideal, fast path
    if n == 0 or n > 2:
        # Try 90° CW (landscape → portrait correction)
        if not _cv2_available:
            if n == 0:
                warnings.append(f"{label}: no face detected")
            return faces, templates, warnings

        cv_img = cv2.imread(path)
        if cv_img is not None and (cv_img.shape[1] > cv_img.shape[0]):
            # Landscape image: rotate 90° CW
            rotated = cv2.rotate(cv_img, cv2.ROTATE_90_CLOCKWISE)
            rot_path = os.path.join(str(_temp_dir), f"{Path(path).stem}_rot90.jpg")
            if cv2.imwrite(rot_path, rotated, [cv2.IMWRITE_JPEG_QUALITY, 95]):
                rot_nimg = NImage(rot_path)
                rot_faces, rot_templates = _engine.detect_faces(
                    rot_nimg, operation=NBiometricOperations.create_template,
                )
                if len(rot_faces) == 1:
                    warnings.append(f"{label}: face detected after 90° CW rotation (was {n} faces in original)")
                    try:
                        os.remove(rot_path)
                    except OSError:
                        pass
                    return rot_faces, rot_templates, warnings
                try:
                    os.remove(rot_path)
                except OSError:
                    pass

    if n == 0:
        warnings.append(f"{label}: no face detected")
    elif n > 2:
        warnings.append(f"{label}: suspicious detection ({n} faces) — match may be unreliable")

    return faces, templates, warnings


class MegamatcherProvider(BaseProvider):
    def compare(self, id_path: str, selfie_path: str, threshold: float) -> MatchResult:
        if not _ensure_engine():
            return MatchResult(
                distance=1.0, similarity=0.0, match=False,
                error=_engine_error or "Megamatcher SDK unavailable",
            )

        if not _cv2_available:
            return MatchResult(
                distance=1.0, similarity=0.0, match=False,
                error="Megamatcher requires OpenCV (cv2) for auto-rotation support",
            )

        try:
            id_faces, id_templates, id_warnings = _detect_with_fallback(id_path, "ID photo")
            selfie_faces, selfie_templates, selfie_warnings = _detect_with_fallback(selfie_path, "Selfie")
            all_warnings = id_warnings + selfie_warnings

            if not id_faces:
                return MatchResult(
                    distance=1.0, similarity=0.0, match=False,
                    error="No face detected in ID photo (with auto-rotation fallback)",
                    warnings=all_warnings or None,
                )
            if not selfie_faces:
                return MatchResult(
                    distance=1.0, similarity=0.0, match=False,
                    error="No face detected in selfie (with auto-rotation fallback)",
                    warnings=all_warnings or None,
                )

            score = _engine.match_templates(id_templates[0], selfie_templates[0])

            # Map SDK score to 0-100 similarity:
            #   score = sdk_threshold → similarity = 50% (neutral boundary)
            #   score = 2 * sdk_threshold → similarity = 100% (perfect match cap)
            similarity = min(100.0, score * 50.0 / _sdk_matching_threshold)

            # Match decision uses user threshold with same semantics as InsightFace:
            #   threshold = 0.6 → match when similarity >= 40 (lenient)
            #   threshold = 0.5 → match when similarity >= 50 (stricter)
            #   threshold = 0.9 → match when similarity >= 10 (very lenient)
            match_cutoff = (1 - threshold) * 100
            match = similarity >= match_cutoff

            distance = max(0.0, 1.0 - similarity / 100.0)

            return MatchResult(
                distance=distance,
                similarity=similarity,
                match=bool(match),
                warnings=all_warnings or None,
            )
        except Exception as e:
            import traceback
            return MatchResult(
                distance=1.0, similarity=0.0, match=False,
                error=f"Megamatcher error: {e}\n{traceback.format_exc()}",
            )
