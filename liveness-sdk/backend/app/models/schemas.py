from pydantic import BaseModel, Field
from typing import Literal
from uuid import UUID


class LivenessRequest(BaseModel):
    mode: Literal["active", "passive"]
    image: str
    session_id: str
    challenge_data: dict | None = None


class LivenessResponse(BaseModel):
    passed: bool
    confidence: float
    # Raw provider score on its native scale — compare against threshold.
    score: float = Field(description="Raw score (passive: 0-16, active: 0-100)")
    # Cut-off actually applied: passed is (score >= threshold).
    threshold: float = Field(description="Pass threshold on the score scale")
    # Scale ceiling, so callers can interpret score/threshold without guessing.
    max_score: float = Field(description="Maximum achievable score")
    # Unique transaction identifier (UUIDv4) — one per liveness check.
    transaction_id: UUID = Field(description="Unique UUIDv4 for this liveness transaction")
    # Echoed back so callers can correlate logs by both IDs.
    session_id: str = Field(description="Session this transaction belongs to")
    provider: str
    used_fallback: bool
    captured_face: str | None = None
    error: str | None = None
    # Why a photo was rejected (no face / spoof labels / low score). None on pass.
    rejection_reason: str | None = None
    # Labels behind the verdict: Face/Person evidence + spoof hits with confidences.
    detected_labels: list[dict] | None = None


class SessionCreateResponse(BaseModel):
    session_id: str
    expires_at: str


class ErrorResponse(BaseModel):
    error: str
    code: str
