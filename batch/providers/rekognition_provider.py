"""
AWS Rekognition face matching provider.
Requires AWS credentials configured via `aws configure` or env vars.
"""

import os
import boto3
import base64

from .base import BaseProvider, MatchResult


class RekognitionProvider(BaseProvider):
    def __init__(self, region: str | None = None):
        if region is None:
            region = os.environ.get("AWS_DEFAULT_REGION", "ap-southeast-1")
        self.client = boto3.client("rekognition", region_name=region)

    def compare(self, id_path: str, selfie_path: str, threshold: float) -> MatchResult:
        try:
            with open(id_path, "rb") as f:
                id_bytes = f.read()
            with open(selfie_path, "rb") as f:
                selfie_bytes = f.read()

            similarity_threshold = max(0, min(100, int(threshold * 100)))

            response = self.client.compare_faces(
                SourceImage={"Bytes": id_bytes},
                TargetImage={"Bytes": selfie_bytes},
                SimilarityThreshold=similarity_threshold,
            )

            if not response["FaceMatches"]:
                return MatchResult(
                    distance=1.0,
                    similarity=0.0,
                    match=False,
                )

            best = response["FaceMatches"][0]
            similarity = float(best["Similarity"])
            distance = 1 - (similarity / 100)
            match = similarity >= (threshold * 100)

            return MatchResult(
                distance=float(distance),
                similarity=float(similarity),
                match=bool(match),
            )
        except Exception as e:
            error_msg = str(e)
            if "No faces" in error_msg or "no faces" in error_msg:
                return MatchResult(
                    distance=1.0, similarity=0.0, match=False,
                    error="No face detected in one or both images",
                )
            return MatchResult(
                distance=1.0, similarity=0.0, match=False, error=error_msg,
            )
