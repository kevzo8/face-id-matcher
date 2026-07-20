import logging
from datetime import datetime, timezone
from uuid import uuid4

logger = logging.getLogger("svi.audit")


def log_liveness_txn(
    mode: str,
    provider: str,
    used_fallback: bool,
    status: str,
    confidence: float,
    session_id: str | None = None,
    client_app_id: str | None = None,
    error: str | None = None,
):
    txn_id = str(uuid4())
    record = {
        "txn_id": txn_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "mode": mode,
        "provider": provider,
        "used_fallback": used_fallback,
        "status": status,
        "confidence": confidence,
        "session_id": session_id or "",
        "client_app_id": client_app_id or "",
        "error": error or "",
    }
    logger.info("LIVENESS_TXN", extra={"audit": record})
    return txn_id
