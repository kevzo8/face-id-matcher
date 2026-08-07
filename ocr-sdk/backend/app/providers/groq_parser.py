"""GROQ-based text normalization provider.

Takes raw OCR text lines from one or more identity document images and asks GROQ
to normalize them into the standardized ``ExtractedData`` schema. All secrets and
endpoints stay server-side; the frontend SDK never calls GROQ directly.
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any, Optional

import requests

logger = logging.getLogger(__name__)

GROQ_BASE_URL = "https://api.groq.com/openai/v1"
DEFAULT_MODEL = "llama-3.3-70b-versatile"

# The GROQ API token is read exclusively from the server environment. It must
# never be accepted from a client request body.
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

SYSTEM_PROMPT = """You are an identity document field normalizer for the Philippines.

You receive raw OCR text lines extracted from one or more identity document
images. Normalize them into the exact JSON schema below.

Rules:
- Return ONLY valid JSON with no markdown, code fences, or explanation.
- Only extract values that literally appear in the OCR text. NEVER invent,
  guess, or assume a value. If a field is absent, use null.
- Normalize dates to ISO yyyy-mm-dd when the month name or unambiguous parts
  are present; otherwise null.
- full_name: split into first_name, middle_name, last_name, suffix (e.g. JR,
  SR, III). Use null for any missing part.
- id_number: the document/identification number.
- date_of_birth, date_issued, valid_until: ISO yyyy-mm-dd or null.
- personal_data: name + birth. Exact: first_name, middle_name, last_name,
  birth_date.
- other_fields: KNOWN, structured demographic/identity attributes as
  {"label","value"} pairs. Use ONLY canonical labels from this fixed set:
  gender, nationality, address, expiry_date, issue_date, blood_type, religion,
  marital_status, occupation, mother_maiden_name, father_name, place_of_birth,
  height, weight, eye_color, restrictions, id_number. Do not invent new labels.
- additional_metadata: UNSTRUCTURED leftovers that do NOT fit any canonical
  other_fields label (e.g. hotline numbers, website, QR/region codes, card
  serials, OR the raw value of a label not in the canonical set). Preserve them
  as {"label","value"} pairs so no OCR data is lost. Do NOT put canonical
  demographic attributes here.
- id_information: per-ID info when multiple IDs are present. Each entry:
  {"id_label": "ID 1", "id_type_code": 1, "id_type_name": "Passport", "id_number": "P123456"}.
- Do not leak OCR confidence or AWS details into the output.

Respond with this exact shape:
{"id_number": null, "full_name": {"first_name": null, "middle_name": null, "last_name": null, "suffix": null}, "date_of_birth": null, "date_issued": null, "valid_until": null, "personal_data": [], "other_fields": [], "additional_metadata": [], "id_information": []}
"""


def _clean_model_json(content: str) -> str:
    """Strip markdown fences and stray braces around the model's JSON reply."""
    cleaned = re.sub(r"```(?:json)?", "", content).strip()
    # Find the first top-level JSON object.
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        return match.group(0)
    return cleaned


def normalize_text(raw_text: str, document_type: str, id_type_name: Optional[str] = None) -> dict[str, Any]:
    """Send raw OCR text to GROQ and return normalized ``ExtractedData`` fields.

    Args:
        raw_text: concatenated OCR text lines from all submitted images.
        document_type: canonical document_type (e.g. BATAENO_PASS_ID) used only
            as context in the prompt.

    Returns:
        A dict matching ``ExtractedData`` (with nested ``full_name``) or an
        empty dict if the payload is empty / GROQ is unavailable, in which case
        partial extraction still returns successfully with null fields.
    """
    text_block = raw_text.strip()
    if not text_block:
        return _empty_extracted()

    if not GROQ_API_KEY:
        logger.warning("GROQ_API_KEY not set; returning partial extraction with no normalized fields.")
        return _empty_extracted()

    doc_context = id_type_name or document_type
    user_prompt = (
        f"Document type hint: {doc_context}.\n"
        "Normalize the following OCR text lines into the required JSON schema. "
        "Use null for missing fields. Never invent values. If text from multiple "
        "sides/IDs is provided, cross-reference and reconcile discrepancies.\n\n"
        f"{text_block}"
    )

    try:
        response = requests.post(
            f"{GROQ_BASE_URL}/chat/completions",
            json={
                "model": DEFAULT_MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.1,
                "response_format": {"type": "json_object"},
            },
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {GROQ_API_KEY}",
            },
            timeout=45,
        )
        response.raise_for_status()
        data = response.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        if not content:
            logger.warning("GROQ returned empty content; returning partial extraction.")
            return _empty_extracted()

        parsed = json.loads(_clean_model_json(content))
        return _sanitize_extracted(parsed)
    except json.JSONDecodeError as exc:
        logger.warning("GROQ returned malformed JSON: %s", exc)
        return _empty_extracted()
    except Exception as exc:  # noqa: BLE001 - external provider failures
        logger.warning("GROQ normalization failed: %s", exc)
        # Partial extraction: return empty normalized fields rather than erroring.
        return _empty_extracted()


def _empty_extracted() -> dict[str, Any]:
    return {
        "id_number": None,
        "full_name": {"first_name": None, "middle_name": None, "last_name": None, "suffix": None},
        "date_of_birth": None,
        "date_issued": None,
        "valid_until": None,
        "additional_metadata": [],
        "personal_data": [],
        "other_fields": [],
        "id_information": [],
    }


def _as_field_list(value: Any) -> list[dict[str, str]]:
    """Coerce a GROQ group into a list of {"label","value"} dicts."""
    if not isinstance(value, list):
        return []
    cleaned: list[dict[str, str]] = []
    for item in value:
        if isinstance(item, dict):
            label = item.get("label")
            val = item.get("value")
            if label is not None and val is not None and str(val).strip():
                cleaned.append({"label": str(label).strip(), "value": str(val).strip()})
    return cleaned


def _as_id_information(value: Any) -> list[dict[str, Any]]:
    """Coerce a GROQ id_information group into a safe list."""
    if not isinstance(value, list):
        return []
    cleaned: list[dict[str, Any]] = []
    for item in value:
        if isinstance(item, dict):
            entry: dict[str, Any] = {"id_label": None, "id_type_code": None, "id_type_name": None, "id_number": None}
            entry["id_label"] = str(item.get("id_label")) if item.get("id_label") is not None else None
            if item.get("id_type_code") is not None:
                try:
                    entry["id_type_code"] = int(item["id_type_code"])
                except (TypeError, ValueError):
                    entry["id_type_code"] = None
            entry["id_type_name"] = str(item.get("id_type_name")) if item.get("id_type_name") is not None else None
            entry["id_number"] = str(item.get("id_number")) if item.get("id_number") is not None else None
            cleaned.append(entry)
    return cleaned


def _sanitize_extracted(parsed: dict[str, Any]) -> dict[str, Any]:
    """Coerce the model output into the exact ExtractedData shape."""
    base = _empty_extracted()

    for key in ("id_number", "date_of_birth", "date_issued", "valid_until"):
        value = parsed.get(key)
        base[key] = value if isinstance(value, str) and value.strip() else None

    full_name = parsed.get("full_name")
    if isinstance(full_name, dict):
        for part in ("first_name", "middle_name", "last_name", "suffix"):
            value = full_name.get(part)
            base["full_name"][part] = value if isinstance(value, str) and value.strip() else None

    base["personal_data"] = _as_field_list(parsed.get("personal_data"))
    base["other_fields"] = _as_field_list(parsed.get("other_fields"))
    base["additional_metadata"] = _as_field_list(parsed.get("additional_metadata"))
    base["id_information"] = _as_id_information(parsed.get("id_information"))

    return base
