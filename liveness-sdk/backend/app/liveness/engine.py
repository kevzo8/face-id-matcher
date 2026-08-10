import base64
import logging

from .fallback import FallbackChain
from .providers.open_face_liveness import OpenFaceLivenessProvider
from .providers.heuristic import HeuristicProvider

logger = logging.getLogger("svi.liveness.engine")


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
        open_face_available = True

        if open_face_available:
            result = self.open_face.validate_passive(image_bytes)
            if result.get("error") is None:
                used_fallback = False
                provider = "Open Face Liveness"
                if self.aws_detect_labels is not None and self.aws_detect_labels.is_available():
                    labels_result = self.aws_detect_labels.predict(image_bytes)
                    if labels_result.get("spoof_risk") in ("high", "medium"):
                        penalty = 0.3
                        score = result.get("score", 0)
                        result["score"] = max(0, int(score * (1 - penalty)))
                        result["is_real"] = result["score"] > 14
                        result["breakdown"] = result.get("breakdown", []) + [
                            {"label": f"Spoof penalty ({labels_result['spoof_risk']})", "pts": score - result["score"]}
                        ]
                        provider = "Open Face + AWS DetectLabels"
                return result, provider, used_fallback

        chain = FallbackChain("Open Face Liveness", self.open_face, self.heuristic)
        return chain.execute(self._predict_passive_fallback, image_bytes)

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
