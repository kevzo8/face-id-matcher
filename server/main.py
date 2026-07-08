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
import requests as http_requests
from contextlib import asynccontextmanager
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "batch"))

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

providers = {}
default_provider = None
liveness_passive = None
liveness_faceplusplus = None
liveness_aws = None


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
    
    # Initialize passive liveness providers
    global liveness_passive, liveness_faceplusplus, liveness_aws
    
    # Heuristic passive liveness (always try)
    try:
        from providers.liveness_passive import LivenessPassiveProvider
        liveness_passive = LivenessPassiveProvider()
        print("LivenessPassiveProvider (heuristic) initialized")
    except ModuleNotFoundError:
        try:
            from server.providers.liveness_passive import LivenessPassiveProvider
            liveness_passive = LivenessPassiveProvider()
            print("LivenessPassiveProvider (heuristic) initialized (server.providers)")
        except Exception as e:
            print(f"LivenessPassiveProvider not available: {e}")
    except Exception as e:
        print(f"LivenessPassiveProvider not available: {e}")
    
    # Face++ liveness (if credentials available)
    try:
        from providers.liveness_faceplusplus import LivenessFacePlusPlusProvider
        liveness_faceplusplus = LivenessFacePlusPlusProvider()
        print("Face++ Liveness Provider initialized")
    except ModuleNotFoundError:
        try:
            from server.providers.liveness_faceplusplus import LivenessFacePlusPlusProvider
            liveness_faceplusplus = LivenessFacePlusPlusProvider()
            print("Face++ Liveness Provider initialized (server.providers)")
        except Exception as e:
            print(f"Face++ Liveness not available: {e}")
    except Exception as e:
        print(f"Face++ Liveness not available: {e}")
    
    # AWS Rekognition liveness (if credentials available)
    try:
        from providers.liveness_aws_rekognition import LivenessAWSRekognitionProvider
        liveness_aws = LivenessAWSRekognitionProvider()
        print("AWS Rekognition Liveness Provider initialized")
    except ModuleNotFoundError:
        try:
            from server.providers.liveness_aws_rekognition import LivenessAWSRekognitionProvider
            liveness_aws = LivenessAWSRekognitionProvider()
            print("AWS Rekognition Liveness Provider initialized (server.providers)")
        except Exception as e:
            print(f"AWS Rekognition Liveness not available: {e}")
    except Exception as e:
        print(f"AWS Rekognition Liveness not available: {e}")

    print(f"Available providers: {list(providers.keys())}")
    print(f"Liveness providers: face++={bool(liveness_faceplusplus)}, aws={bool(liveness_aws)}, heuristic={bool(liveness_passive)}")
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


class DetectFacesResponse(BaseModel):
    face_detected: bool
    confidence: float
    eyes_open: bool
    eyes_open_confidence: float
    quality_brightness: float
    quality_sharpness: float
    score: int
    error: str | None = None


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

@app.post("/liveness/detect-faces", response_model=DetectFacesResponse)
async def detect_faces_liveness(request: Request):
    body = await request.json()
    image_b64 = body.get("image")
    if not image_b64:
        raise HTTPException(status_code=400, detail="No image provided")

    try:
        import boto3
        rekognition = boto3.client("rekognition", region_name=os.environ.get("AWS_DEFAULT_REGION", "ap-southeast-1"))
        response = rekognition.detect_faces(
            Image={"Bytes": base64.b64decode(image_b64)},
            Attributes=["ALL"],
        )

        if not response["FaceDetails"]:
            return DetectFacesResponse(
                face_detected=False, confidence=0, eyes_open=False, eyes_open_confidence=0,
                quality_brightness=0, quality_sharpness=0, score=0,
            )

        face = response["FaceDetails"][0]
        confidence = face.get("Confidence", 0)
        eyes_open = face.get("EyesOpen", {}).get("Value", False)
        eyes_open_conf = face.get("EyesOpen", {}).get("Confidence", 0)
        quality = face.get("Quality", {})
        brightness = quality.get("Brightness", 0)
        sharpness = quality.get("Sharpness", 0)

        score = 0
        if confidence > 90: score += 5
        if eyes_open and eyes_open_conf > 80: score += 5
        if brightness > 40: score += 5
        if sharpness > 40: score += 5

        return DetectFacesResponse(
            face_detected=True, confidence=confidence, eyes_open=eyes_open,
            eyes_open_confidence=eyes_open_conf,
            quality_brightness=brightness, quality_sharpness=sharpness,
            score=score,
        )
    except Exception as e:
        return DetectFacesResponse(
            face_detected=False, confidence=0, eyes_open=False, eyes_open_confidence=0,
            quality_brightness=0, quality_sharpness=0, score=0, error=str(e),
        )


class PassiveLivenessResponse(BaseModel):
    is_real: bool
    confidence: float
    score: int
    error: str | None = None
    details: str | None = None
    breakdown: list[dict] | None = None


@app.post("/liveness/passive")
async def passive_liveness(request: Request):
    global liveness_passive, liveness_faceplusplus, liveness_aws
    
    body = await request.json()
    image_b64 = body.get("image")
    bbox = body.get("bbox")
    provider = body.get("provider", "faceplusplus")  # Default to Face++

    if not image_b64:
        raise HTTPException(status_code=400, detail="No image provided")

    try:
        image_bytes = base64.b64decode(image_b64)
        
        # Try requested provider with fallback chain
        result = None
        provider_used = None
        
        if provider == "faceplusplus" and liveness_faceplusplus:
            result = liveness_faceplusplus.predict(image_bytes, bbox)
            provider_used = "Face++ Liveness"
        elif provider == "aws" and liveness_aws:
            result = liveness_aws.predict(image_bytes, bbox)
            provider_used = "AWS Rekognition"
        elif provider == "heuristic" and liveness_passive:
            result = liveness_passive.predict(image_bytes, bbox)
            provider_used = "Heuristic Liveness"
        else:
            # Fallback chain: Face++ → AWS → Heuristic
            if liveness_faceplusplus:
                result = liveness_faceplusplus.predict(image_bytes, bbox)
                provider_used = "Face++ Liveness (fallback)"
            elif liveness_aws:
                result = liveness_aws.predict(image_bytes, bbox)
                provider_used = "AWS Rekognition (fallback)"
            elif liveness_passive:
                result = liveness_passive.predict(image_bytes, bbox)
                provider_used = "Heuristic Liveness (fallback)"
            else:
                return PassiveLivenessResponse(is_real=False, confidence=0, score=0, error="No liveness provider available")
        
        if result:
            # Add provider info
            result["provider"] = provider_used
            return result
        else:
            return PassiveLivenessResponse(is_real=False, confidence=0, score=0, error="Liveness check failed")
            
    except Exception as e:
        return PassiveLivenessResponse(is_real=False, confidence=0, score=0, error=str(e))


class OpenBiometricsResponse(BaseModel):
    is_live: bool
    confidence: float
    score: int
    error: str | None = None


@app.post("/liveness/openbiometrics", response_model=OpenBiometricsResponse)
async def openbiometrics_liveness(request: Request):
    body = await request.json()
    image_b64 = body.get("image")
    ob_url = body.get("ob_url", "http://localhost:8000")

    if not image_b64:
        raise HTTPException(status_code=400, detail="No image provided")

    try:
        image_bytes = base64.b64decode(image_b64)
        files = {"image": ("frame.jpg", image_bytes, "image/jpeg")}
        resp = http_requests.post(f"{ob_url.rstrip('/')}/api/v1/detect", files=files, timeout=10)
        data = resp.json()

        if not data.get("faces"):
            return OpenBiometricsResponse(is_live=False, confidence=0, score=0, error="No face detected")

        face = data["faces"][0]
        det = face.get("detection", {})
        det_confidence = det.get("confidence", 0)

        liveness = face.get("liveness")
        if liveness:
            is_live = liveness.get("is_live", False)
            liv_score = liveness.get("score", 0)
        else:
            is_live = det_confidence > 0.5
            liv_score = det_confidence

        score = round(liv_score * 20, 1)

        quality = face.get("quality", {})
        if quality.get("is_acceptable"):
            score += 3
        if quality.get("sharpness", 0) > 30:
            score += 2
        score = min(max(score, 0), 20)

        return OpenBiometricsResponse(
            is_live=is_live,
            confidence=liv_score,
            score=int(score) if score == int(score) else score,
        )
    except Exception as e:
        return OpenBiometricsResponse(is_live=False, confidence=0, score=0, error=str(e))


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
