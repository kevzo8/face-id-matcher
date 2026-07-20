"""
SVI Biometrics Liveness Backend
===============================
Production-ready liveness detection server.

Usage:
    python run.py
    python run.py --port 8000
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.config import config
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=config.host,
        port=config.port,
        reload=config.environment == "development",
        log_level=config.log_level,
    )
