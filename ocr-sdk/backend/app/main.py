"""SVI Reusable ID OCR backend wrapper (CPS-381).

Responsible for:
- receiving one or more identity document images from the frontend SDK,
- calling AWS Rekognition DetectText for raw text extraction,
- calling GROQ to normalize the text into the standardized JSON contract,
- returning a clean, consistent response.

Identity types are configurable via the ``id_config.json`` registry. Requests
reference ``id_type_code``; any code not in the registry or marked inactive is
rejected. The registry can be edited to add/update/disable types without code
changes.

Security: the frontend never reaches AWS/GROQ directly. Credentials and API
tokens live only in the server environment. All responses are sanitized and
never leak external service details.
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

# Load secrets from backend/.env (if present) before any module reads them.
from pathlib import Path

from dotenv import load_dotenv

_ENV_PATH = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=_ENV_PATH, override=False)

from . import id_registry
from .id_registry import detect_by_text, get_entry, list_types
from .providers.aws_detect_text import extract_text
from .providers.groq_parser import normalize_text
from .schemas import ExtractedData, IdInformation, OcrExtractError, OcrExtractResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

CONTEXT_ROOT = "/id-ocr"

app = FastAPI(
    title="SVI ID OCR SDK API",
    version="1.0.0",
    description="Reusable ID OCR backend wrapper (CPS-381).",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Consumer origins are validated by the reverse proxy.
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


class ImageInput(BaseModel):
    """A single identity document image supplied by the consuming application."""

    image: str = Field(..., description="Base64-encoded image bytes.")
    label: Optional[str] = Field(None, description="Optional per-image label (e.g. 'front', 'back').")


class OcrExtractRequest(BaseModel):
    """Request payload for /id-ocr/ocr/extract."""

    images: list[ImageInput] = Field(..., min_length=1, description="One or more ID images.")
    id_type_code: Optional[int] = Field(
        None,
        description="Identity type code from the registry (e.g. 1..14). Rejected if absent/inactive.",
    )
    document_type: Optional[str] = Field(
        None, description="Optional legacy document type hint (BATAENO_PASS_ID, etc.). Ignored when id_type_code is set."
    )

    @field_validator("images")
    @classmethod
    def _validate_images(cls, images: list[ImageInput]) -> list[ImageInput]:
        if len(images) > 20:
            raise ValueError("A maximum of 20 images per request is allowed.")
        return images


@app.get(f"{CONTEXT_ROOT}/identity/types")
async def identity_types() -> dict[str, object]:
    """Return the active identity configuration registry (safe enumeration)."""
    active_types = list_types()
    return {
        "count": len(active_types),
        "items": active_types,
    }


@app.post(f"{CONTEXT_ROOT}/ocr/extract", response_model=OcrExtractResponse, responses={400: {"model": OcrExtractError}, 502: {"model": OcrExtractError}})
async def ocr_extract(request: Request, payload: OcrExtractRequest) -> OcrExtractResponse:
    """Extract and normalize identity data from one or more ID images."""
    # Validate id_type_code against the registry if provided. Any value other
    # than a registered/active code must be rejected.
    registry_entry = get_entry(payload.id_type_code) if payload.id_type_code is not None else None
    if payload.id_type_code is not None and registry_entry is None:
        raise HTTPException(
            status_code=400,
            detail={
                "status": "ERROR",
                "error_code": "INVALID_ID_TYPE",
                "message": f"Unknown or inactive id_type_code: {payload.id_type_code}.",
            },
        )

    images = [item.image for item in payload.images]

    text_lines, diagnostics = extract_text(images)

    if diagnostics["images_failed"] == len(images):
        # Every image failed to process. Surface enough to diagnose without
        # exposing internal implementation details.
        raise HTTPException(
            status_code=502,
            detail={
                "status": "ERROR",
                "error_code": "OCR_FAILED",
                "message": "None of the supplied images could be processed.",
                "diagnostics": diagnostics,
            },
        )

    raw_text = "\n".join(text_lines)

    # Resolve output metadata, in priority order:
    #   1. App-supplied id_type_code (validated against the registry).
    #   2. Auto-detection from the raw OCR text (config-driven keywords).
    #   3. Legacy app-supplied document_type string.
    #   4. UNKNOWN fallback.
    if registry_entry is not None:
        document_type = registry_entry.document_type
        id_type_code = registry_entry.id_type_code
        id_type_name = registry_entry.id_type_name
    else:
        detected = detect_by_text(text_lines)
        if detected is not None:
            document_type = detected.document_type
            id_type_code = detected.id_type_code
            id_type_name = detected.id_type_name
        else:
            document_type = payload.document_type or "UNKNOWN"
            id_type_code = None
            id_type_name = None

    extracted_fields = normalize_text(raw_text, document_type, id_type_name)
    extracted_data = ExtractedData(**extracted_fields)
    _prune_id_information(extracted_data, document_type, id_type_name)

    return OcrExtractResponse(
        status="SUCCESS",
        id_type_code=id_type_code,
        id_type_name=id_type_name,
        document_type=document_type,
        extracted_data=extracted_data,
        raw_text_payload=raw_text,
        diagnostics=diagnostics,
    )


@app.get(f"{CONTEXT_ROOT}/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    # Standardize validation and partial-failure responses, preserving status code.
    detail = exc.detail if isinstance(exc.detail, dict) else {}
    body = OcrExtractError(
        status="ERROR",
        id_type_code=None,
        id_type_name=None,
        document_type=None,
        extracted_data=None,
        raw_text_payload=None,
        error_code=str(detail.get("error_code", "VALIDATION_ERROR")),
        message=str(detail.get("message", exc.detail)),
    )
    return JSONResponse(status_code=exc.status_code, content=body.model_dump())


def list_registry() -> list[dict]:
    """Proxy to id_registry.list_types (kept for readability)."""
    return id_registry.list_types()


def _prune_id_information(
    extracted_data: ExtractedData,
    document_type: str,
    id_type_name: Optional[str],
) -> None:
    """Drop redundant ``id_information`` entries.

    ``id_information`` is only useful when it describes an identity *different*
    from the primary document already reported at the top level. An entry is
    redundant (and removed) when it matches the primary document by number or by
    type name. If all entries are redundant, the list is emptied.
    """
    if not extracted_data.id_information:
        return

    primary_number = (extracted_data.id_number or "").strip().lower()
    primary_type = (document_type or "").strip().lower()
    primary_name = (id_type_name or "").strip().lower()

    kept: list[IdInformation] = []
    for info in extracted_data.id_information:
        num = (info.id_number or "").strip().lower()
        type_name = (info.id_type_name or "").strip().lower()

        # Same number as primary -> clearly redundant.
        if primary_number and num == primary_number:
            continue
        # Same type name as primary and no number of its own -> redundant.
        if primary_name and type_name == primary_name and not num:
            continue
        # Same canonical type but same number as primary -> redundant.
        if primary_type and type_name and type_name in primary_type and num == primary_number:
            continue
        kept.append(info)

    extracted_data.id_information = kept