"""
Megamatcher (Neurotechnology) face matching provider.

SVI already owns a Megamatcher license and has it integrated in the OWA
via the /biometric endpoint (Payara backend). This provider implements the
same interface for the POC.

REAL SDK: When the Megamatcher SDK (Java/.NET/C++) is available, replace the
fallback() call with the actual SDK integration. The compare() signature
remains the same.

POC FALLBACK: Uses InsightFace ONNX as a stand-in when the SDK is not installed.
"""

import logging
import os
import subprocess
import sys
from pathlib import Path

from .base import BaseProvider, MatchResult

log = logging.getLogger(__name__)

MEGAMATCHER_CLI = "NImage"  # Typical Megamatcher CLI tool name

# Lazy-loaded fallback
_fallback_provider = None


def get_fallback():
    global _fallback_provider
    if _fallback_provider is None:
        from .insightface_provider import InsightFaceProvider
        _fallback_provider = InsightFaceProvider()
    return _fallback_provider


def _megamatcher_available() -> bool:
    """Check if the Megamatcher SDK CLI is on PATH."""
    if sys.platform == "win32":
        try:
            subprocess.run(
                [MEGAMATCHER_CLI, "--version"],
                capture_output=True, timeout=5, check=False,
            )
            return True
        except (FileNotFoundError, subprocess.TimeoutExpired):
            return False
    # On Linux/macOS, check typical install paths
    for p in [
        "/usr/local/megamatcher/bin/NImage",
        "/opt/megamatcher/bin/NImage",
        os.path.expanduser("~/Megamatcher/bin/NImage"),
    ]:
        if Path(p).is_file():
            return True
    return False


class MegamatcherProvider(BaseProvider):
    def __init__(self):
        self.sdk_available = _megamatcher_available()
        if self.sdk_available:
            log.info("Megamatcher SDK detected — using real SDK")
        else:
            log.warning(
                "Megamatcher SDK not found — falling back to InsightFace "
                "(install Megamatcher SDK to use real matching)"
            )

    def compare(self, id_path: str, selfie_path: str, threshold: float) -> MatchResult:
        if self.sdk_available:
            return self._sdk_compare(id_path, selfie_path, threshold)
        return self._fallback_compare(id_path, selfie_path, threshold)

    def _sdk_compare(self, id_path: str, selfie_path: str, threshold: float) -> MatchResult:
        """Real Megamatcher SDK integration (replace with actual CLI/SDK call)."""
        try:
            result = subprocess.run(
                [MEGAMATCHER_CLI, "verify", id_path, selfie_path],
                capture_output=True, text=True, timeout=30,
            )
            if result.returncode != 0:
                return MatchResult(
                    distance=1.0, similarity=0.0, match=False,
                    error=f"Megamatcher CLI error: {result.stderr.strip()}",
                )
            # Parse output — adjust based on actual CLI output format
            import re
            match = re.search(r"similarity[=:]\s*([\d.]+)", result.stdout, re.IGNORECASE)
            if match:
                similarity = float(match.group(1))
                distance = 1.0 - (similarity / 100)
                return MatchResult(
                    distance=distance,
                    similarity=similarity,
                    match=similarity >= (threshold * 100),
                )
            return MatchResult(
                distance=1.0, similarity=0.0, match=False,
                error="Could not parse Megamatcher output",
            )
        except FileNotFoundError:
            return MatchResult(
                distance=1.0, similarity=0.0, match=False,
                error="Megamatcher CLI not found",
            )
        except subprocess.TimeoutExpired:
            return MatchResult(
                distance=1.0, similarity=0.0, match=False,
                error="Megamatcher timed out",
            )
        except Exception as e:
            return MatchResult(
                distance=1.0, similarity=0.0, match=False, error=str(e),
            )

    def _fallback_compare(self, id_path: str, selfie_path: str, threshold: float) -> MatchResult:
        """Fallback when SDK is not available — uses InsightFace."""
        provider = get_fallback()
        return provider.compare(id_path, selfie_path, threshold)
