"""
Face++ (Megvii) face matching provider.
Requires FACEPLUSPLUS_API_KEY and FACEPLUSPLUS_API_SECRET env vars.
"""

import os
import time
import base64
import requests

from .base import BaseProvider, MatchResult


class FacePlusPlusProvider(BaseProvider):
    def __init__(self):
        self.api_key = os.environ.get("FACEPLUSPLUS_API_KEY")
        self.api_secret = os.environ.get("FACEPLUSPLUS_API_SECRET")
        if not self.api_key or not self.api_secret:
            raise ValueError("FACEPLUSPLUS_API_KEY and FACEPLUSPLUS_API_SECRET env vars required")
        self.endpoint = "https://api-us.faceplusplus.com/facepp/v3/compare"

    def compare(self, id_path: str, selfie_path: str, threshold: float) -> MatchResult:
        try:
            with open(id_path, "rb") as f:
                id_bytes = f.read()
            with open(selfie_path, "rb") as f:
                selfie_bytes = f.read()

            id_b64 = base64.b64encode(id_bytes).decode()
            selfie_b64 = base64.b64encode(selfie_bytes).decode()

            for attempt in range(3):
                response = requests.post(
                    self.endpoint,
                    data={
                        "api_key": self.api_key,
                        "api_secret": self.api_secret,
                        "image_base64_1": id_b64,
                        "image_base64_2": selfie_b64,
                    },
                    timeout=30,
                )

                if response.status_code == 403 and "CONCURRENCY_LIMIT" in response.text:
                    time.sleep(1.5 * (attempt + 1))
                    continue

                break

            if response.status_code != 200:
                return MatchResult(
                    distance=1.0, similarity=0.0, match=False,
                    error=f"Face++ API error: {response.status_code} - {response.text}",
                )

            data = response.json()

            if "error_message" in data:
                return MatchResult(
                    distance=1.0, similarity=0.0, match=False,
                    error=f"Face++ error: {data['error_message']}",
                )

            confidence = float(data.get("confidence", 0))
            similarity = confidence
            distance = 1 - (confidence / 100)
            match = confidence >= (threshold * 100)

            return MatchResult(
                distance=distance,
                similarity=similarity,
                match=match,
            )

        except Exception as e:
            return MatchResult(
                distance=1.0, similarity=0.0, match=False, error=str(e),
            )
