from datetime import datetime, timedelta, timezone
from uuid import uuid4
from typing import Protocol


class SessionStore(Protocol):
    def create(self, ttl_minutes: int = 5) -> dict: ...
    def get(self, session_id: str) -> dict | None: ...
    def delete(self, session_id: str) -> None: ...


class MemorySessionStore:
    def __init__(self):
        self._sessions: dict[str, dict] = {}

    def create(self, ttl_minutes: int = 5) -> dict:
        session_id = str(uuid4())
        now = datetime.now(timezone.utc)
        session = {
            "session_id": session_id,
            "created_at": now.isoformat(),
            "expires_at": (now + timedelta(minutes=ttl_minutes)).isoformat(),
            "used": False,
        }
        self._sessions[session_id] = session
        return session

    def get(self, session_id: str) -> dict | None:
        session = self._sessions.get(session_id)
        if not session:
            return None
        expires_at = datetime.fromisoformat(session["expires_at"])
        if datetime.now(timezone.utc) > expires_at:
            self.delete(session_id)
            return None
        return session

    def delete(self, session_id: str) -> None:
        self._sessions.pop(session_id, None)


session_store = MemorySessionStore()
