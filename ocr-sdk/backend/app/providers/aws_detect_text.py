"""AWS Rekognition DetectText raw text extraction provider.

Extracts raw text lines from one or more identity document images. The provider
is image-order agnostic: it never determines whether an image is a front or back
of an identity document. The consuming application supplies the images and their
order via the request payload.

``DetectText`` is called once per image. Individual image failures are reported
in ``per_image`` diagnostics without aborting the whole request, enabling partial
extraction when only a subset of images process successfully.
"""

from __future__ import annotations

import logging
import os
from typing import Any

import boto3

logger = logging.getLogger(__name__)

DEFAULT_REGION = os.environ.get("AWS_DEFAULT_REGION", "ap-southeast-1")


def _decode_image(image: str) -> bytes:
    """Decode a base64 image payload, raising ValueError on malformed input."""
    import base64

    try:
        return base64.b64decode(image, validate=True)
    except Exception as exc:  # noqa: BLE001 - normalize all decode errors
        raise ValueError(f"Invalid base64 image payload: {exc}") from exc


def extract_text(images: list[str]) -> tuple[list[str], dict[str, Any]]:
    """Run Rekognition DetectText over all provided images.

    Args:
        images: list of base64-encoded identity document images.

    Returns:
        (text_lines, diagnostics) where ``text_lines`` is the concatenated list
        of recognized text lines across all images and ``diagnostics`` contains
        per-image status information used for partial-extraction reporting.
    """
    client = boto3.client("rekognition", region_name=DEFAULT_REGION)

    all_lines: list[str] = []
    diagnostics: dict[str, Any] = {"images_processed": 0, "images_failed": 0, "per_image": []}

    for idx, image in enumerate(images):
        entry: dict[str, Any] = {"index": idx}
        try:
            image_bytes = _decode_image(image)
            response = client.detect_text(Image={"Bytes": image_bytes})
            lines = [
                item["DetectedText"]
                for item in response.get("TextDetections", [])
                if item.get("Type") == "LINE"
            ]
            all_lines.extend(lines)
            entry["status"] = "ok"
            entry["lines"] = len(lines)
            diagnostics["images_processed"] += 1
        except ValueError as exc:
            # Client-side payload problem; report, keep processing the rest.
            entry["status"] = "error"
            entry["error_code"] = "INVALID_IMAGE"
            entry["detail"] = str(exc)
            diagnostics["images_failed"] += 1
        except Exception as exc:  # noqa: BLE001 - external service failures
            logger.warning("DetectText failed for image %s: %s", idx, exc)
            entry["status"] = "error"
            entry["error_code"] = "OCR_FAILED"
            entry["detail"] = "Image could not be processed."
            diagnostics["images_failed"] += 1
        diagnostics["per_image"].append(entry)

    return all_lines, diagnostics
