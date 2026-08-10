import os
from dataclasses import dataclass, field


@dataclass
class Config:
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8000"))
    environment: str = os.getenv("ENVIRONMENT", "development")
    log_level: str = os.getenv("LOG_LEVEL", "info")

    aws_access_key_id: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    aws_secret_access_key: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    aws_region: str = os.getenv("AWS_DEFAULT_REGION", "ap-southeast-1")

    api_keys: list[str] = field(default_factory=lambda: [k.strip() for k in os.getenv("API_KEYS", "").split(",") if k.strip()])

    session_ttl_minutes: int = int(os.getenv("SESSION_TTL_MINUTES", "5"))

    rate_limit_per_minute: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "10"))

    audit_log_table: str = os.getenv("AUDIT_LOG_TABLE", "liveness_audit")

    sdk_cdn_url: str = os.getenv("SDK_CDN_URL", "")
    sdk_min_version: str = os.getenv("SDK_MIN_VERSION", "1.0.0")


config = Config()
