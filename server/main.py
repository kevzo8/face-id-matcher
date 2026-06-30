"""
CPS-221 Face Match API Server
==============================
Multi-provider face matching server supporting:
- AWS Rekognition (cloud)
- Face++ / Megvii (cloud)
- InsightFace (self-hosted)
- Megamatcher / Neurotechnology (self-hosted)

The server can run in two modes:
1. Single-provider mode: Set FACE_MATCH_PROVIDER env var (legacy)
2. Multi-provider mode: Client sends "provider" field in request body

Usage:
    python main.py                    # starts on http://localhost:5190
    python main.py --port 8080        # custom port
    python main.py --multi            # enable multi-provider mode
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

providers = {}
default_provider = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global providers, default_provider
    
    # Try to initialize all available providers
    provider_name = os.environ.get("FACE_MATCH_PROVIDER", "")
    
    # Always try to initialize Rekognition if AWS credentials are available
    try:
        from providers.rekognition_provider import RekognitionProvider
        providers["rekognition"] = RekognitionProvider()
    except Exception as e:
        print(f"Rekognition not available: {e}")
    
    # Always try to initialize Face++ if credentials are available
    try:
        from providers.faceplusplus_provider import FacePlusPlusProvider
        providers["faceplusplus"] = FacePlusPlusProvider()
    except Exception as e:
        print(f"Face++ not available: {e}")
    
    # Initialize other providers based on env var (legacy single-provider mode)
    if provider_name == "insightface":
        try:
            from providers.insightface_provider import InsightFaceProvider
            providers["insightface"] = InsightFaceProvider()
        except Exception as e:
            print(f"InsightFace not available: {e}")
    elif provider_name == "megamatcher":
        try:
            from providers.megamatcher_provider import MegamatcherProvider
            providers["megamatcher"] = MegamatcherProvider()
        except Exception as e:
            print(f"Megamatcher not available: {e}")
    elif provider_name == "dlib":
        try:
            from providers.dlib_provider import DlibProvider
            providers["dlib"] = DlibProvider()
        except Exception as e:
            print(f"Dlib not available: {e}")
    
    # Set default provider
    if provider_name and provider_name in providers:
        default_provider = providers[provider_name]
    elif providers:
        # Use first available provider as default
        default_provider = next(iter(providers.values()))
    
    print(f"Available providers: {list(providers.keys())}")
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
    provider: str | None = None
    error: str | None = None
    warnings: list[str] | None = None


def decode_and_compare(id_data: bytes, selfie_data: bytes, threshold: float, provider_instance=None):
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as id_tmp:
        id_tmp.write(id_data)
        id_path = id_tmp.name
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as selfie_tmp:
        selfie_tmp.write(selfie_data)
        selfie_path = selfie_tmp.name
    try:
        result = provider_instance.compare(id_path, selfie_path, threshold)
        return CompareResponse(
            similarity=result.similarity,
            distance=result.distance,
            match=result.match,
            threshold=threshold,
            provider=provider_instance.__class__.__name__,
            error=result.error,
            warnings=result.warnings,
        )
    finally:
        os.unlink(id_path)
        os.unlink(selfie_path)


@app.post("/compare", response_model=CompareResponse)
async def compare_faces(request: Request):
    if not providers and default_provider is None:
        raise HTTPException(status_code=500, detail="No providers initialized")

    content_type = request.headers.get("content-type", "")
    requested_provider = None

    if "multipart/form-data" in content_type or "application/x-www-form-urlencoded" in content_type:
        form = await request.form()
        threshold = float(form.get("threshold", 0.6))
        requested_provider = form.get("provider")
        id_file = form.get("id_image")
        selfie_file = form.get("selfie_image")
        if id_file and selfie_file:
            id_bytes = await id_file.read()
            selfie_bytes = await selfie_file.read()
            provider_instance = providers.get(requested_provider, default_provider) if requested_provider else default_provider
            if provider_instance is None:
                raise HTTPException(status_code=500, detail=f"Provider '{requested_provider}' not available")
            return decode_and_compare(id_bytes, selfie_bytes, threshold, provider_instance)
        id_b64 = form.get("source_image")
        selfie_b64 = form.get("target_image")
        if id_b64 and selfie_b64:
            provider_instance = providers.get(requested_provider, default_provider) if requested_provider else default_provider
            if provider_instance is None:
                raise HTTPException(status_code=500, detail=f"Provider '{requested_provider}' not available")
            return decode_and_compare(base64.b64decode(id_b64), base64.b64decode(selfie_b64), threshold, provider_instance)
        raise HTTPException(status_code=400, detail="Provide id_image+selfie_image or source_image+target_image")

    if "application/json" in content_type:
        body = await request.json()
        threshold = float(body.get("threshold", 0.6))
        requested_provider = body.get("provider")
        id_b64 = body.get("source_image") or body.get("id_image")
        selfie_b64 = body.get("target_image") or body.get("selfie_image")
        if id_b64 and selfie_b64:
            provider_instance = providers.get(requested_provider, default_provider) if requested_provider else default_provider
            if provider_instance is None:
                raise HTTPException(status_code=500, detail=f"Provider '{requested_provider}' not available")
            return decode_and_compare(base64.b64decode(id_b64), base64.b64decode(selfie_b64), threshold, provider_instance)
        raise HTTPException(status_code=400, detail="Provide source_image+target_image in JSON body")

    raise HTTPException(status_code=400, detail="Unsupported content type")

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "providers": list(providers.keys()),
        "default": default_provider.__class__.__name__ if default_provider else "none"
    }


if __name__ == "__main__":
    import uvicorn

    parser = argparse.ArgumentParser(description="CPS-221 Face Match API Server")
    parser.add_argument("--port", type=int, default=5190)
    parser.add_argument("--provider", default="rekognition", choices=["insightface", "rekognition", "megamatcher", "faceplusplus"])
    parser.add_argument("--host", default="127.0.0.1")
    args = parser.parse_args()

    # Set env var for legacy single-provider mode
    os.environ["FACE_MATCH_PROVIDER"] = args.provider

    print(f"\n  CPS-221 Face Match API Server")
    print(f"  Default provider: {args.provider}")
    print(f"  URL:      http://{args.host}:{args.port}")
    print(f"  Docs:     http://{args.host}:{args.port}/docs\n")

    uvicorn.run(app, host=args.host, port=args.port)
