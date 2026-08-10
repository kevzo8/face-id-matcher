import base64
import logging
from fastapi import APIRouter, HTTPException, Header, Request

from ..models.schemas import LivenessRequest, LivenessResponse, SessionCreateResponse, ErrorResponse
from ..core.session import session_store
from ..core.audit import log_liveness_txn
from ..config import config
from ..liveness.engine import LivenessEngine

logger = logging.getLogger("svi.api")
router = APIRouter()
engine = LivenessEngine()


def verify_auth(authorization: str | None):
    if config.environment == "development":
        return "dev_app"
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid auth scheme")
    if token not in config.api_keys:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return token


def check_sdk_version(x_sdk_version: str | None):
    if x_sdk_version and config.sdk_min_version:
        try:
            min_parts = [int(p) for p in config.sdk_min_version.split(".")]
            sdk_parts = [int(p) for p in x_sdk_version.split(".")]
            for m, s in zip(min_parts, sdk_parts):
                if s < m:
                    raise HTTPException(
                        status_code=400,
                        detail=f"SDK version {x_sdk_version} is outdated. Minimum: {config.sdk_min_version}. Upgrade at {config.sdk_cdn_url}",
                    )
        except (ValueError, IndexError):
            pass


# ─── New API (session-based, v1) ────────────────────────────────────────────


@router.post("/session/create", response_model=SessionCreateResponse)
async def create_session(authorization: str = Header(None)):
    verify_auth(authorization)
    session = session_store.create(ttl_minutes=config.session_ttl_minutes)
    return SessionCreateResponse(
        session_id=session["session_id"],
        expires_at=session["expires_at"],
    )


@router.post("/liveness", response_model=LivenessResponse)
async def run_liveness(
    req: LivenessRequest,
    request: Request,
    authorization: str = Header(None),
    x_sdk_version: str = Header(None),
):
    client_app_id = verify_auth(authorization)
    check_sdk_version(x_sdk_version)

    session = session_store.get(req.session_id)
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    if session["used"]:
        raise HTTPException(status_code=400, detail="Session already used")
    session["used"] = True

    used_fallback = False

    try:
        image_bytes = base64.b64decode(req.image)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 image")

    if req.mode == "active":
        result, provider, used_fallback = engine.process_active(image_bytes, req.challenge_data)
    elif req.mode == "passive":
        result, provider, used_fallback = engine.process_passive(image_bytes)
    else:
        raise HTTPException(status_code=400, detail="Invalid mode. Use 'active' or 'passive'")

    status = "passed" if result.get("is_real") else "failed" if result.get("error") is None else "error"
    txn_id = log_liveness_txn(
        mode=req.mode,
        provider=provider,
        used_fallback=used_fallback,
        status=status,
        confidence=result.get("confidence", 0),
        session_id=req.session_id,
        client_app_id=client_app_id,
        error=result.get("error"),
    )

    return LivenessResponse(
        passed=result.get("is_real", False),
        confidence=result.get("confidence", 0),
        txn_id=txn_id,
        provider=provider,
        used_fallback=used_fallback,
        captured_face=req.image if result.get("is_real") else None,
        error=result.get("error"),
    )


# ─── Backward-compatible POC endpoints (no prefix, no auth) ────────────────

poc_router = APIRouter()


@poc_router.post("/liveness/passive")
async def passive_liveness(request: Request):
    body = await request.json()
    image_b64 = body.get("image")
    if not image_b64:
        raise HTTPException(status_code=400, detail="No image provided")

    try:
        image_bytes = base64.b64decode(image_b64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 image")

    result, provider, used_fallback = engine.process_passive(image_bytes)

    response = {
        "is_real": result.get("is_real", False),
        "confidence": result.get("confidence", 0),
        "score": result.get("score", 0),
        "details": "Passed" if result.get("is_real") else "Failed",
        "provider": provider,
        "error": result.get("error"),
    }

    if result.get("breakdown"):
        response["breakdown"] = result["breakdown"]
    if result.get("info"):
        response["info"] = result["info"]

    return response


@poc_router.post("/liveness/detect-faces")
async def detect_faces_liveness(request: Request):
    body = await request.json()
    image_b64 = body.get("image")
    if not image_b64:
        raise HTTPException(status_code=400, detail="No image provided")

    try:
        image_bytes = base64.b64decode(image_b64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 image")

    if engine.aws_detect_faces and engine.aws_detect_faces.is_available():
        result = engine.aws_detect_faces.predict(image_bytes)
        return {
            "face_detected": result.get("face_detected", False),
            "confidence": result.get("confidence", 0),
            "eyes_open": result.get("eyes_open", False),
            "eyes_open_confidence": result.get("eyes_open_confidence", 0),
            "quality_brightness": result.get("quality_brightness", 0),
            "quality_sharpness": result.get("quality_sharpness", 0),
            "score": result.get("score", 0),
            "age_low": result.get("age_low"),
            "age_high": result.get("age_high"),
            "gender": result.get("gender"),
            "expression": result.get("expression"),
            "error": None,
        }
    else:
        return {"error": "AWS DetectFaces not available"}


@poc_router.post("/liveness/detect-objects")
async def detect_objects_liveness(request: Request):
    body = await request.json()
    image_b64 = body.get("image")
    if not image_b64:
        raise HTTPException(status_code=400, detail="No image provided")

    try:
        image_bytes = base64.b64decode(image_b64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 image")

    if engine.aws_detect_labels and engine.aws_detect_labels.is_available():
        result = engine.aws_detect_labels.predict(image_bytes)
        return {
            "spoof_objects_detected": result.get("spoof_objects_detected", []),
            "has_phone": result.get("has_phone", False),
            "has_hand": result.get("has_hand", False),
            "has_screen": result.get("has_screen", False),
            "has_photo": result.get("has_photo", False),
            "has_id": result.get("has_id", False),
            "spoof_risk": result.get("spoof_risk", "low"),
            "raw_labels": result.get("raw_labels", []),
            "error": None,
        }
    else:
        return {"error": "AWS DetectLabels not available"}


@poc_router.get("/health")
async def health():
    return {
        "status": "ok",
        "environment": config.environment,
        "providers": engine.get_status(),
    }

