"""
CPS-221 Face Match API Server
==============================
Optional FastAPI server for the web POC when using AWS Rekognition.
The web app works standalone with face-api.js (browser-side), but this
server enables cloud-based matching with higher accuracy.

Usage:
    python main.py                    # starts on http://localhost:5190
    python main.py --port 8080        # custom port
    python main.py --provider dlib    # use local dlib instead of Rekognition
"""

import argparse
import base64
import io
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "batch"))

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from providers.insightface_provider import InsightFaceProvider
from providers.rekognition_provider import RekognitionProvider

app = FastAPI(title="CPS-221 Face Match API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

provider = None


class CompareResponse(BaseModel):
    similarity: float
    distance: float
    match: bool
    threshold: float
    error: str | None = None


@app.post("/compare", response_model=CompareResponse)
async def compare_faces(
    id_image: UploadFile = File(...),
    selfie_image: UploadFile = File(...),
    threshold: float = 0.6,
):
    if provider is None:
        raise HTTPException(status_code=500, detail="Provider not initialized")

    id_bytes = await id_image.read()
    selfie_bytes = await selfie_image.read()

    import tempfile, os
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as id_tmp:
        id_tmp.write(id_bytes)
        id_path = id_tmp.name
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as selfie_tmp:
        selfie_tmp.write(selfie_bytes)
        selfie_path = selfie_tmp.name

    try:
        result = provider.compare(id_path, selfie_path, threshold)
        return CompareResponse(
            similarity=result.similarity,
            distance=result.distance,
            match=result.match,
            threshold=threshold,
            error=result.error,
        )
    finally:
        os.unlink(id_path)
        os.unlink(selfie_path)


@app.get("/health")
async def health():
    return {"status": "ok", "provider": provider.__class__.__name__ if provider else "none"}


if __name__ == "__main__":
    import uvicorn

    parser = argparse.ArgumentParser(description="CPS-221 Face Match API Server")
    parser.add_argument("--port", type=int, default=5190)
    parser.add_argument("--provider", default="rekognition", choices=["insightface", "rekognition"])
    parser.add_argument("--host", default="127.0.0.1")
    args = parser.parse_args()

    if args.provider == "insightface":
        provider = InsightFaceProvider()
    else:
        provider = RekognitionProvider()

    print(f"\n  CPS-221 Face Match API Server")
    print(f"  Provider: {args.provider}")
    print(f"  URL:      http://{args.host}:{args.port}")
    print(f"  Docs:     http://{args.host}:{args.port}/docs\n")

    uvicorn.run(app, host=args.host, port=args.port)
