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
    python main.py --provider megamatcher  # use Megamatcher (SDK or fallback)
"""

import argparse
import base64
import io
import json
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "batch"))

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from providers.insightface_provider import InsightFaceProvider
from providers.rekognition_provider import RekognitionProvider
from providers.megamatcher_provider import MegamatcherProvider

provider = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global provider
    provider_name = os.environ.get("FACE_MATCH_PROVIDER", "")
    if provider_name == "insightface":
        provider = InsightFaceProvider()
    elif provider_name == "megamatcher":
        provider = MegamatcherProvider()
    elif provider_name == "rekognition":
        provider = RekognitionProvider()
    yield


app = FastAPI(title="CPS-221 Face Match API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class CompareResponse(BaseModel):
    similarity: float
    distance: float
    match: bool
    threshold: float
    error: str | None = None
    warnings: list[str] | None = None


def decode_and_compare(id_data: bytes, selfie_data: bytes, threshold: float):
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as id_tmp:
        id_tmp.write(id_data)
        id_path = id_tmp.name
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as selfie_tmp:
        selfie_tmp.write(selfie_data)
        selfie_path = selfie_tmp.name
    try:
        result = provider.compare(id_path, selfie_path, threshold)
        return CompareResponse(
            similarity=result.similarity,
            distance=result.distance,
            match=result.match,
            threshold=threshold,
            error=result.error,
            warnings=result.warnings,
        )
    finally:
        os.unlink(id_path)
        os.unlink(selfie_path)


@app.post("/compare", response_model=CompareResponse)
async def compare_faces(request: Request):
    if provider is None:
        raise HTTPException(status_code=500, detail="Provider not initialized")

    content_type = request.headers.get("content-type", "")

    if "multipart/form-data" in content_type or "application/x-www-form-urlencoded" in content_type:
        form = await request.form()
        threshold = float(form.get("threshold", 0.6))
        id_file = form.get("id_image")
        selfie_file = form.get("selfie_image")
        if id_file and selfie_file:
            id_bytes = await id_file.read()
            selfie_bytes = await selfie_file.read()
            return decode_and_compare(id_bytes, selfie_bytes, threshold)
        id_b64 = form.get("source_image")
        selfie_b64 = form.get("target_image")
        if id_b64 and selfie_b64:
            return decode_and_compare(base64.b64decode(id_b64), base64.b64decode(selfie_b64), threshold)
        raise HTTPException(status_code=400, detail="Provide id_image+selfie_image or source_image+target_image")

    if "application/json" in content_type:
        body = await request.json()
        threshold = float(body.get("threshold", 0.6))
        id_b64 = body.get("source_image") or body.get("id_image")
        selfie_b64 = body.get("target_image") or body.get("selfie_image")
        if id_b64 and selfie_b64:
            return decode_and_compare(base64.b64decode(id_b64), base64.b64decode(selfie_b64), threshold)
        raise HTTPException(status_code=400, detail="Provide source_image+target_image in JSON body")

    raise HTTPException(status_code=400, detail="Unsupported content type")

@app.get("/health")
async def health():
    return {"status": "ok", "provider": provider.__class__.__name__ if provider else "none"}


if __name__ == "__main__":
    import uvicorn

    parser = argparse.ArgumentParser(description="CPS-221 Face Match API Server")
    parser.add_argument("--port", type=int, default=5190)
    parser.add_argument("--provider", default="rekognition", choices=["insightface", "rekognition", "megamatcher"])
    parser.add_argument("--host", default="127.0.0.1")
    args = parser.parse_args()

    if args.provider == "insightface":
        provider = InsightFaceProvider()
    elif args.provider == "megamatcher":
        provider = MegamatcherProvider()
    else:
        provider = RekognitionProvider()

    print(f"\n  CPS-221 Face Match API Server")
    print(f"  Provider: {args.provider}")
    print(f"  URL:      http://{args.host}:{args.port}")
    print(f"  Docs:     http://{args.host}:{args.port}/docs\n")

    uvicorn.run(app, host=args.host, port=args.port)
