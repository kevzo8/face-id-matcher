import json


class OpenFaceLivenessProvider:
    """
    Open Face Liveness runs in-browser via the SDK.
    This provider validates the challenge responses sent from the SDK
    and calculates the final score server-side for audit integrity.
    """

    def validate_active(self, challenge_data: dict) -> dict:
        score = 0
        breakdown = []

        face_size = challenge_data.get("face_size_score", 0)
        texture = challenge_data.get("texture_score", 0)
        motion = challenge_data.get("motion_score", 0)
        challenges = challenge_data.get("challenge_score", 0)
        blinks = challenge_data.get("blink_score", 0)
        flash = challenge_data.get("flash_score", 0)

        breakdown.append({"label": "Face Size", "pts": face_size})
        breakdown.append({"label": "Texture", "pts": texture})
        breakdown.append({"label": "Motion", "pts": motion})
        breakdown.append({"label": "Challenges", "pts": challenges})
        breakdown.append({"label": "Blinks", "pts": blinks})
        breakdown.append({"label": "Flash", "pts": flash})

        score = min(100, face_size + texture + motion + challenges + blinks + flash)
        passed = score >= 75

        return {
            "is_real": passed,
            "confidence": round(score / 100.0, 4),
            "score": score,
            "breakdown": breakdown,
            "error": None,
        }

    def validate_passive(self, image_bytes: bytes) -> dict:
        from .heuristic import HeuristicProvider
        heuristic = HeuristicProvider()
        return heuristic.predict(image_bytes)

    def is_available(self) -> bool:
        return True
