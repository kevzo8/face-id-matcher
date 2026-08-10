import logging

logger = logging.getLogger("svi.liveness.fallback")


class FallbackChain:
    def __init__(self, name: str, primary, fallback=None):
        self.name = name
        self.primary = primary
        self.fallback = fallback

    def execute(self, predict_fn, *args, **kwargs) -> tuple[dict, str, bool]:
        try:
            result = predict_fn(self.primary, *args, **kwargs)
            if result.get("error") is None:
                return result, self.name, False
            logger.warning("Primary %s failed: %s", self.name, result["error"])
        except Exception as e:
            logger.warning("Primary %s exception: %s", self.name, e)

        if self.fallback is None:
            msg = f"{self.name} unavailable"
            return {"is_real": False, "confidence": 0, "score": 0, "error": msg}, self.name, False

        try:
            result = predict_fn(self.fallback, *args, **kwargs)
            if result.get("error") is None:
                return result, f"{self.name} (fallback)", True
            logger.warning("Fallback also failed: %s", result["error"])
        except Exception as e:
            logger.warning("Fallback exception: %s", e)

        msg = "All providers failed"
        return {"is_real": False, "confidence": 0, "score": 0, "error": msg}, self.name, False
