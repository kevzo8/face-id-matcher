from pydantic import BaseModel
from typing import Literal


class LivenessRequest(BaseModel):
    mode: Literal["active", "passive"]
    image: str
    session_id: str
    challenge_data: dict | None = None


class LivenessResponse(BaseModel):
    passed: bool
    confidence: float
    txn_id: str
    provider: str
    used_fallback: bool
    captured_face: str | None = None
    error: str | None = None


class SessionCreateResponse(BaseModel):
    session_id: str
    expires_at: str


class ErrorResponse(BaseModel):
    error: str
    code: str
