import base64
import logging

from .fallback import FallbackChain
from .providers.heuristic import PASSIVE_MAX_SCORE, PASSIVE_MIN_SCORE
from .providers.open_face_liveness import OpenFaceLivenessProvider
from .providers.heuristic import HeuristicProvider

logger = logging.getLogger("svi.liveness.engine")

# ---- AWS-primary passive path (0–16 score scale, PASSIVE_MIN_SCORE to pass) ----
AWS_FACE_MIN_CONFIDENCE = 80       # DetectLabels "Face" required at/above this
AWS_PERSON_FALLBACK_CONFIDENCE = 90  # "Person" accepted only at/above this
AWS_PENALTY_HARD = 6               # phone / photo-print / ID / hand+screen
AWS_PENALTY_SCREEN_ALONE = 3       # screen with no hand holding it
AWS_PENALTY_CAP = 10


class LivenessEngine:
    def __init__(self):
        self.open_face = OpenFaceLivenessProvider()
        self.heuristic = HeuristicProvider()
        self.aws_detect_faces = None
        self.aws_detect_labels = None
        self._init_aws()

    def _init_aws(self):
        try:
            from .providers.aws_detect_faces import AWSDetectFacesProvider
            self.aws_detect_faces = AWSDetectFacesProvider()
        except Exception as e:
            logger.warning("AWS DetectFaces not available: %s", e)

        try:
            from .providers.aws_detect_labels import AWSDetectLabelsProvider
            self.aws_detect_labels = AWSDetectLabelsProvider()
        except Exception as e:
            logger.warning("AWS DetectLabels not available: %s", e)

    def process_active(self, image_bytes: bytes, challenge_data: dict | None = None) -> tuple[dict, str, bool]:
        aws_available = self.aws_detect_faces is not None and self.aws_detect_faces.is_available()

        if aws_available:
            chain = FallbackChain("AWS Rekognition Face Liveness", self.aws_detect_faces, self.open_face)
            return chain.execute(self._predict_active_aws, image_bytes, challenge_data)
        else:
            result = self.open_face.validate_active(challenge_data or {})
            return result, "Open Face Liveness", False

    def process_passive(self, image_bytes: bytes) -> tuple[dict, str, bool]:
        labels_ok = self.aws_detect_labels is not None and self.aws_detect_labels.is_available()
        faces_ok = self.aws_detect_faces is not None and self.aws_detect_faces.is_available()

        if labels_ok and faces_ok:
            # AWS Rekognition is the PRIMARY provider.
            result = self._predict_passive_aws(image_bytes)
            if result.pop("__aws_unavailable", False):
                # AWS itself is down — OpenFace heuristic is the fallback.
                chain = FallbackChain("Open Face Liveness", self.open_face, self.heuristic)
                return chain.execute(self._predict_passive_fallback, image_bytes)
            # Verdicts (pass / no-face / spoof / low score) are final and
            # must never fall through to a weaker provider.
            return result, "AWS Rekognition", False

        chain = FallbackChain("Open Face Liveness", self.open_face, self.heuristic)
        return chain.execute(self._predict_passive_fallback, image_bytes)

    def _predict_passive_aws(self, image_bytes: bytes) -> dict:
        """AWS primary: DetectLabels gate (face required, spoof penalized) +
        DetectFaces attribute scoring, normalized to the 0–16 passive scale."""
        labels_result = self.aws_detect_labels.predict(image_bytes)
        if labels_result.get("error"):
            return {
                "is_real": False, "confidence": 0, "score": 0,
                "error": labels_result["error"], "__aws_unavailable": True,
            }

        raw = {
            r.get("label", ""): float(r.get("confidence", 0))
            for r in labels_result.get("raw_labels", [])
        }
        face_conf = raw.get("Face", 0)
        person_conf = raw.get("Person", 0)
        face_evidence = [
            {"label": n, "confidence": round(c, 1)}
            for n, c in (("Face", face_conf), ("Person", person_conf))
            if c > 0
        ]
        if not (face_conf >= AWS_FACE_MIN_CONFIDENCE or person_conf >= AWS_PERSON_FALLBACK_CONFIDENCE):
            closest = max((("Face", face_conf), ("Person", person_conf)), key=lambda kv: kv[1])
            return {
                "is_real": False, "confidence": 0, "score": 0,
                "error": "No face detected",
                "rejection_reason": (
                    "No face detected in frame "
                    f"(closest person-like label: {closest[0]} {closest[1]:.0f}%, "
                    f"need Face ≥{AWS_FACE_MIN_CONFIDENCE}% or Person ≥{AWS_PERSON_FALLBACK_CONFIDENCE}%)"
                ),
                "detected_labels": face_evidence,
            }

        spoof_hits = labels_result.get("spoof_objects_detected", []) or []
        penalty = 0
        penalty_parts = []
        if labels_result.get("has_phone"):
            penalty += AWS_PENALTY_HARD
            penalty_parts.append("phone/device")
        if labels_result.get("has_photo"):
            penalty += AWS_PENALTY_HARD
            penalty_parts.append("photo/print")
        if labels_result.get("has_id"):
            penalty += AWS_PENALTY_HARD
            penalty_parts.append("ID document")
        if labels_result.get("has_hand") and labels_result.get("has_screen"):
            penalty += AWS_PENALTY_HARD
            penalty_parts.append("hand holding screen")
        elif labels_result.get("has_screen"):
            penalty += AWS_PENALTY_SCREEN_ALONE
            penalty_parts.append("screen alone")
        penalty = min(penalty, AWS_PENALTY_CAP)

        faces_result = self.aws_detect_faces.predict(image_bytes)
        faces_error = faces_result.get("error")
        if faces_error:
            if faces_error == "No face detected":
                return {
                    "is_real": False, "confidence": 0, "score": 0,
                    "error": "No face detected",
                    "rejection_reason": (
                        "Scene labels suggest a face but no face could be verified — "
                        "likely a picture of a picture"
                    ),
                    "detected_labels": face_evidence + spoof_hits,
                }
            return {
                "is_real": False, "confidence": 0, "score": 0,
                "error": faces_error, "__aws_unavailable": True,
            }

        # Occlusion policy: pure face only. Anything covering the face —
        # hand, glasses, obstruction — fails outright. No partial credit
        # for occluded frames.
        occ = float(faces_result.get("face_occluded_confidence", 0)) if faces_result.get("face_occluded") else 0.0
        occ_labels = [{"label": "Occluded", "confidence": round(occ, 1)}] if occ >= 70 else []
        if occ >= 70:
            hand_conf = max(raw.get("Hand", 0), raw.get("Finger", 0))
            covering = f"hand (Hand {hand_conf:.0f}%)" if hand_conf >= 70 else "glasses/covering"
            return {
                "is_real": False, "confidence": 0, "score": 0,
                "breakdown": [],
                "info": list(faces_result.get("info") or []),
                "rejection_reason": (
                    f"Face is occluded ({occ:.0f}% — {covering}). "
                    "Remove glasses and uncover your face, then retry"
                ),
                "detected_labels": face_evidence + spoof_hits + occ_labels,
                "error": None,
            }

        norm_breakdown = [
            {"label": b.get("label"), "pts": round(float(b.get("pts", 0)) / 20 * PASSIVE_MAX_SCORE, 1)}
            for b in (faces_result.get("breakdown") or [])
        ]
        # Base recomputed from the breakdown so the 0–16 scale stays exact;
        # threshold math (PASSIVE_MIN_SCORE) unchanged.
        base_16 = round(sum(float(b.get("pts", 0)) for b in norm_breakdown if b.get("pts", 0) > 0), 1)
        final = max(0.0, round(base_16 - penalty, 1))
        is_real = final >= PASSIVE_MIN_SCORE

        if penalty:
            norm_breakdown.append({"label": f"Scene spoof penalty ({', '.join(penalty_parts)})", "pts": -penalty})

        rejection_reason = None
        if not is_real:
            if penalty:
                shown = ", ".join(f"{h.get('label')} {round(h.get('confidence', 0))}%" for h in (spoof_hits + occ_labels))
                rejection_reason = (
                    f"Spoof indicators penalized {penalty} pts "
                    f"({', '.join(penalty_parts)}: {shown}); "
                    f"base {base_16:.1f}/16 → final {final:.1f}/16 "
                    f"(need ≥{PASSIVE_MIN_SCORE})"
                )
            else:
                rejection_reason = (
                    f"Liveness score {final:.1f}/16 below {PASSIVE_MIN_SCORE} threshold "
                    f"(no spoof labels; face attributes too weak)"
                )

        info = list(faces_result.get("info") or [])
        for h in spoof_hits:
            info.append({"label": "spoof_object", "value": f"{h.get('label')} {round(h.get('confidence', 0), 1)}%"})

        return {
            "is_real": bool(is_real),
            "confidence": round(final / PASSIVE_MAX_SCORE, 4),
            "score": final,
            "breakdown": norm_breakdown,
            "info": info,
            "rejection_reason": rejection_reason,
            "detected_labels": face_evidence + spoof_hits + occ_labels,
            "error": None,
        }

    def _predict_active_aws(self, provider, image_bytes: bytes, challenge_data: dict | None):
        return provider.predict(image_bytes)

    def _predict_passive_fallback(self, provider, image_bytes: bytes):
        return provider.validate_passive(image_bytes)

    def get_status(self) -> dict:
        return {
            "open_face": True,
            "heuristic": True,
            "aws_detect_faces": self.aws_detect_faces is not None and self.aws_detect_faces.is_available(),
            "aws_detect_labels": self.aws_detect_labels is not None and self.aws_detect_labels.is_available(),
        }
