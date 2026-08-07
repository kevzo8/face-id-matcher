"""Standardized JSON output contract shared by every OCR SDK endpoint.

The contract stays identical regardless of the identity document type. Fields
that are unavailable on the submitted document are returned as ``None``/``{}``
per the API contract; unavailable scalar fields are ``None`` and never invented.
"""

from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field


class FullName(BaseModel):
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    suffix: Optional[str] = None


class FieldValue(BaseModel):
    """A single key/value field, e.g. {"label": "gender", "value": "Male"}."""

    label: str
    value: str


class IdInformation(BaseModel):
    """Per-ID information when multiple IDs are present in the images."""

    id_label: Optional[str] = None
    id_type_code: Optional[int] = None
    id_type_name: Optional[str] = None
    id_number: Optional[str] = None


class ExtractedData(BaseModel):
    """Standardized identity fields normalized from raw OCR text."""

    id_number: Optional[str] = None
    full_name: Optional[FullName] = None
    date_of_birth: Optional[str] = None
    date_issued: Optional[str] = None
    valid_until: Optional[str] = None

    # POC-style grouped detail fields.
    personal_data: list[FieldValue] = Field(default_factory=list)
    other_fields: list[FieldValue] = Field(default_factory=list)
    additional_metadata: list[FieldValue] = Field(default_factory=list)
    id_information: list[IdInformation] = Field(default_factory=list)


class OcrExtractResponse(BaseModel):
    """Successful OCR extraction response."""

    status: str = "SUCCESS"
    id_type_code: Optional[int] = None
    id_type_name: Optional[str] = None
    document_type: str
    extracted_data: ExtractedData
    raw_text_payload: str
    diagnostics: Optional[dict[str, Any]] = None


class OcrExtractError(BaseModel):
    """Standardized error response. Never leaks external API details."""

    status: str = "ERROR"
    id_type_code: Optional[int] = None
    id_type_name: Optional[str] = None
    document_type: Optional[str] = None
    extracted_data: Optional[ExtractedData] = None
    raw_text_payload: Optional[str] = None
    error_code: str
    message: str
