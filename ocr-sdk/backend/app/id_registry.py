"""Identity configuration registry (from the POC).

Identity types are NOT hardcoded in application logic. They live in a
configuration registry (``id_config.json``) that can be edited to add, update,
or disable types without changing code. Each entry:

- ``id_type_code``  : unique code used in API requests (e.g. 1, 2, 3).
- ``id_type_name``  : human-readable name (e.g. PWD, Senior Citizen).
- ``is_active``     : enable/disable. Requests for inactive types are rejected.
- ``document_type`` : canonical SDK document_type string returned in output.

The registry is loaded at startup. The SDK remains document-type-agnostic about
front/back; it only maps a supplied ``id_type_code`` to a canonical output key.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Optional

_CONF_PATH = Path(__file__).resolve().parent / "id_config.json"


class RegistryEntry:
    __slots__ = ("id_type_code", "id_type_name", "is_active", "document_type")

    def __init__(
        self,
        id_type_code: int,
        id_type_name: str,
        is_active: bool,
        document_type: str,
    ) -> None:
        self.id_type_code = id_type_code
        self.id_type_name = id_type_name
        self.is_active = is_active
        self.document_type = document_type

    def to_dict(self) -> dict[str, Any]:
        return {
            "id_type_code": self.id_type_code,
            "id_type_name": self.id_type_name,
            "is_active": self.is_active,
            "document_type": self.document_type,
        }


def _load_registry() -> dict[int, RegistryEntry]:
    if not _CONF_PATH.exists():
        raise FileNotFoundError(f"Identity config registry not found: {_CONF_PATH}")
    with _CONF_PATH.open("r", encoding="utf-8") as handle:
        data = json.load(handle)

    registry: dict[int, RegistryEntry] = {}
    for item in data.get("identity_types", []):
        code = int(item["id_type_code"])
        registry[code] = RegistryEntry(
            id_type_code=code,
            id_type_name=str(item["id_type_name"]),
            is_active=bool(item.get("is_active", True)),
            document_type=str(item.get("document_type", "OTHER")),
        )
    return registry


# Loaded once at import time. Reload by calling reload_registry() after edits.
_REGISTRY: dict[int, RegistryEntry] = _load_registry()


# Generic tokens that appear across many entries and cause false auto-detect
# matches (e.g. "philippine" in document_type, "national" in id_type_name).
_STOPWORDS = {
    "philippine", "philippines", "phil", "national", "id", "card", "number",
    "pass", "insurance", "corporation", "issuing", "authority", "document",
    "type", "name", "others", "republic",
}


def _build_keywords() -> list[tuple[str, int]]:
    """Build keyword->id_type_code hints from id_config.json raw fields."""
    if not _CONF_PATH.exists():
        return []
    with _CONF_PATH.open("r", encoding="utf-8") as handle:
        data = json.load(handle)

    hints: dict[int, set[str]] = {}
    for item in data.get("identity_types", []):
        code = int(item["id_type_code"])
        words: set[str] = set()
        for field in ("id_type", "id_type_name", "issuing_authority", "document_type"):
            value = str(item.get(field) or "").strip()
            if value and value.upper() != "OTHERS":
                # Normalize alphanumeric tokens so multi-word names match OCR text.
                for w in re.split(r"[\s_\-/]+", value.lower()):
                    w = w.strip("()[]")
                    if len(w) >= 3 and w not in _STOPWORDS:
                        words.add(w)
        hints[code] = words

    ordered: list[tuple[str, int]] = []
    for code in sorted(hints.keys()):
        for word in sorted(hints[code]):
            ordered.append((word, code))
    # Longer/more specific keywords checked first.
    ordered.sort(key=lambda t: len(t[0]), reverse=True)
    return ordered


# Keyword -> code hints, derived from the raw config so auto-detection stays
# config-driven. Lowercased, checked as substrings against the OCR text.
_KEYWORDS: list[tuple[str, int]] = _build_keywords()


def detect_by_text(text_lines: list[str]) -> Optional[RegistryEntry]:
    """Best-effort auto-detection of the identity type from raw OCR text.

    Scans the concatenated text against keywords derived from the registry.
    Returns the most specific matching active entry, or ``None``. This is a
    convenience fallback used only when the app does not supply ``id_type_code``;
    an explicit app-supplied code always takes precedence.
    """
    haystack = "\n".join(text_lines).lower()
    for keyword, code in _KEYWORDS:
        if keyword in haystack:
            entry = _REGISTRY.get(code)
            if entry is not None and entry.is_active:
                return entry
    return None


def reload_registry() -> None:
    """Reload the registry from disk (call after editing id_config.json)."""
    global _REGISTRY
    _REGISTRY = _load_registry()


def is_valid_code(id_type_code: Optional[int]) -> bool:
    """True if the code exists in the registry and is active."""
    if id_type_code is None:
        return False
    entry = _REGISTRY.get(int(id_type_code))
    return entry is not None and entry.is_active


def get_entry(id_type_code: Optional[int]) -> Optional[RegistryEntry]:
    """Return the registry entry for a code, or None if absent/inactive."""
    if id_type_code is None:
        return None
    entry = _REGISTRY.get(int(id_type_code))
    if entry is None or not entry.is_active:
        return None
    return entry


def get_all_active() -> list[RegistryEntry]:
    """List all active registry entries (for enumeration endpoints)."""
    return [e for e in sorted(_REGISTRY.values(), key=lambda e: e.id_type_code) if e.is_active]


def list_types() -> list[dict[str, Any]]:
    """Public, safe enumeration of active types (no internal details leaked)."""
    return [e.to_dict() for e in get_all_active()]
