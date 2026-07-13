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
    age_low: int | None = None
    age_high: int | None = None
    gender: str | None = None
    expression: str | None = None
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

        age_range = face.get("AgeRange", {})
        gender = face.get("Gender", {}).get("Value")
        emotions = face.get("Emotions", [])
        expression = max(emotions, key=lambda e: e.get("Confidence", 0)).get("Type") if emotions else None

        score = 0
        breakdown_items = {"Face Confidence": 0, "Eyes Open": 0, "Lighting": 0, "Sharpness": 0}
        if confidence > 90: breakdown_items["Face Confidence"] = 5
        if eyes_open and eyes_open_conf > 80: breakdown_items["Eyes Open"] = 5
        if brightness > 40: breakdown_items["Lighting"] = 5
        if sharpness > 40: breakdown_items["Sharpness"] = 5
        score = sum(breakdown_items.values())

        return DetectFacesResponse(
            face_detected=True, confidence=confidence, eyes_open=eyes_open,
            eyes_open_confidence=eyes_open_conf,
            quality_brightness=brightness, quality_sharpness=sharpness,
            age_low=age_range.get("Low"), age_high=age_range.get("High"),
            gender=gender, expression=expression,
            score=score,
        )
    except Exception as e:
        return DetectFacesResponse(
            face_detected=False, confidence=0, eyes_open=False, eyes_open_confidence=0,
            quality_brightness=0, quality_sharpness=0, score=0, error=str(e),
        )


class DetectObjectsResponse(BaseModel):
    spoof_objects_detected: list[dict]
    has_phone: bool
    has_hand: bool
    has_screen: bool
    has_photo: bool
    has_id: bool
    spoof_risk: str
    raw_labels: list[dict] = []
    snapshot: str | None = None
    error: str | None = None


@app.post("/liveness/detect-objects", response_model=DetectObjectsResponse)
async def detect_objects_liveness(request: Request):
    body = await request.json()
    image_b64 = body.get("image")
    if not image_b64:
        raise HTTPException(status_code=400, detail="No image provided")

    try:
        import boto3
        rekognition = boto3.client("rekognition", region_name=os.environ.get("AWS_DEFAULT_REGION", "ap-southeast-1"))
        response = rekognition.detect_labels(
            Image={"Bytes": base64.b64decode(image_b64)},
            MaxLabels=50,
            MinConfidence=70,
        )

        # Objects that strongly suggest a phone/screen presentation attack.
        # NOTE: Generic labels (Device, Electronics, Gadget, Camera, Lens, Arm, Finger)
        # are intentionally EXCLUDED or gated — AWS detect_labels returns them for almost
        # any normal photo. "Hand" is kept but ONLY counts when combined with a screen/phone
        # at high confidence (see risk logic below), since a hand gripping a device is a
        # strong replay signal.
        spoof_indicators = {
            # Phone/device (specific, not generic "Device")
            "Mobile Phone": 0, "Cell Phone": 0, "Smartphone": 0, "Phone": 0,
            # Hand holding a device (only meaningful with a screen/phone present)
            "Hand": 0, "Finger": 0,
            # Screen showing a replayed face
            "Screen": 0, "Display": 0, "Monitor": 0, "Television": 0, "TV": 0,
            # Photo/print indicators
            "Photo": 0, "Photograph": 0, "Picture": 0, "Picture Frame": 0,
            "Frame": 0, "Border": 0, "Paper": 0, "Printed Material": 0,
            "Flat": 0, "Two-Dimensional": 0, "Poster": 0, "Print": 0,
            # ID/document indicators
            "ID Card": 0, "Identification Card": 0, "Driver's License": 0,
            "Passport": 0, "License": 0, "Credit Card": 0, "Card": 0,
            "Identification": 0, "Document": 0, "ID": 0,
        }
        detected_spoof_objects = []

        for label in response.get("Labels", []):
            name = label.get("Name", "")
            confidence = label.get("Confidence", 0)
            # Require high confidence to avoid false positives from generic labels
            if name in spoof_indicators and confidence >= 80:
                spoof_indicators[name] = confidence
                detected_spoof_objects.append({"label": name, "confidence": confidence})

        # Check for phone-like rectangular objects with high confidence
        has_phone = any(v > 0 for k, v in spoof_indicators.items() if k in ["Mobile Phone", "Cell Phone", "Smartphone", "Phone"])
        has_hand = any(v > 0 for k, v in spoof_indicators.items() if k in ["Hand", "Finger", "Arm"])
        has_screen = any(v > 0 for k, v in spoof_indicators.items() if k in ["Screen", "Display", "Monitor", "Television", "TV"])
        has_photo = any(v > 0 for k, v in spoof_indicators.items() if k in ["Photo", "Photograph", "Picture", "Picture Frame", "Frame", "Border", "Paper", "Printed Material", "Flat", "Two-Dimensional", "Poster", "Print"])
        has_id = any(v > 0 for k, v in spoof_indicators.items() if k in ["ID Card", "Identification Card", "Driver's License", "Passport", "License", "Credit Card", "Card", "Identification", "Document", "ID"])

        # Determine risk:
        #   - phone present            -> high (clear replay device)
        #   - hand gripping a screen    -> high (holding a device showing a face)
        #   - photo / ID document       -> high (printed attack)
        #   - screen alone (no hand)     -> medium (ambiguous, not definitive)
        # All indicators require >=80% confidence, so a casual hand in a normal selfie
        # (typically ~50%) will NOT trip this.
        spoof_risk = "low"
        if has_phone or (has_hand and has_screen) or has_photo or has_id:
            spoof_risk = "high"
        elif has_screen:
            spoof_risk = "medium"

        # Capture all raw AWS labels for debugging/verification.
        raw_labels = [
            {"label": label.get("Name", ""), "confidence": label.get("Confidence", 0)}
            for label in response.get("Labels", [])
        ]

        return DetectObjectsResponse(
            spoof_objects_detected=detected_spoof_objects,
            has_phone=has_phone,
            has_hand=has_hand,
            has_screen=has_screen,
            has_photo=has_photo,
            has_id=has_id,
            spoof_risk=spoof_risk,
            raw_labels=raw_labels,
            snapshot=f"data:image/jpeg;base64,{image_b64}",
        )
    except Exception as e:
        return DetectObjectsResponse(
            spoof_objects_detected=[],
            has_phone=False, has_hand=False, has_screen=False, has_photo=False, has_id=False,
            spoof_risk="unknown", raw_labels=[], snapshot=None, error=str(e)
        )


class PassiveLivenessResponse(BaseModel):
    is_real: bool
    confidence: float
    score: int
    error: str | None = None
    details: str | None = None
    breakdown: list[dict] | None = None
    info: list[dict] | None = None


class OcrDetectResponse(BaseModel):
    id_type: str | None = None
    labels: list[dict] = []
    text_lines: list[str] = []
    error: str | None = None


@app.post("/ocr/detect", response_model=OcrDetectResponse)
async def ocr_detect(request: Request):
    body = await request.json()
    image_b64 = body.get("image")
    provider = body.get("provider", "aws_rekognition_ocr")
    if not image_b64:
        raise HTTPException(status_code=400, detail="No image provided")
    try:
        import boto3
        image_bytes = base64.b64decode(image_b64)
        rekognition = boto3.client("rekognition", region_name=os.environ.get("AWS_DEFAULT_REGION", "ap-southeast-1"))
        
        # DetectLabels to identify ID document type (always use Rekognition for this)
        label_response = rekognition.detect_labels(
            Image={"Bytes": image_bytes},
            MaxLabels=50,
            MinConfidence=70,
        )
        
        id_type = None
        id_labels = []
        for label in label_response.get("Labels", []):
            name = label.get("Name", "")
            conf = label.get("Confidence", 0)
            id_labels.append({"label": name, "confidence": conf})
            if name in ["ID Card", "Identification Card", "Driver's License", "Passport", "License", "ID"] and conf >= 70:
                if not id_type:
                    id_type = name

        # OCR text extraction based on provider
        text_lines = []
        if provider == "textract":
            textract = boto3.client("textract", region_name=os.environ.get("AWS_DEFAULT_REGION", "ap-southeast-1"))
            text_response = textract.detect_document_text(Document={"Bytes": image_bytes})
            text_lines = [item["DetectedText"] for item in text_response.get("Blocks", []) if item["BlockType"] == "LINE"]
        elif provider == "bedrock":
            try:
                bedrock = boto3.client("bedrock-runtime", region_name=os.environ.get("AWS_DEFAULT_REGION", "ap-southeast-1"))
                body = json.dumps({
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": 4096,
                    "messages": [{
                        "role": "user",
                        "content": [
                            {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": image_b64}},
                            {"type": "text", "text": "Extract all visible text from this ID document image. Return only the extracted text lines, one per line. Do not add any explanation or formatting."}
                        ]
                    }]
                })
                response = bedrock.invoke_model(modelId="anthropic.claude-3-sonnet-20240229-v1:0", body=body)
                result = json.loads(response["body"].read())
                text_content = ""
                for block in result.get("content", []):
                    if block.get("type") == "text":
                        text_content += block.get("text", "")
                text_lines = [l.strip() for l in text_content.strip().split("\n") if l.strip()]
            except Exception as e:
                text_lines = [f"Bedrock error: {e}"]
        else:
            # Default: use Rekognition DetectText
            text_response = rekognition.detect_text(Image={"Bytes": image_bytes})
            text_lines = [item["DetectedText"] for item in text_response.get("TextDetections", []) if item["Type"] == "LINE"]

        return OcrDetectResponse(
            id_type=id_type,
            labels=id_labels,
            text_lines=text_lines,
        )
    except Exception as e:
        return OcrDetectResponse(error=str(e))


@app.post("/liveness/passive")
async def passive_liveness(request: Request):
    global liveness_passive, liveness_faceplusplus, liveness_aws
    
    body = await request.json()
    image_b64 = body.get("image")
    bbox = body.get("bbox")
    provider = body.get("provider", "heuristic")  # Default to heuristic

    if not image_b64:
        raise HTTPException(status_code=400, detail="No image provided")

    try:
        image_bytes = base64.b64decode(image_b64)
        
        # Try requested provider with fallback chain
        result = None
        provider_used = None
        
        if provider == "faceplusplus" and liveness_faceplusplus:
            # Standalone Face++ heuristic
            result = liveness_faceplusplus.predict(image_bytes, bbox)
            provider_used = "Face++ Liveness"
        elif provider == "faceplusplus_hybrid" and liveness_faceplusplus and liveness_passive:
            # Hybrid: merge Face++ cloud attributes (40%) with pixel-level analysis (60%)
            fpp_result = liveness_faceplusplus.predict(image_bytes, bbox)
            heuristic_result = liveness_passive.predict(image_bytes, bbox)

            if fpp_result.get("error"):
                result = heuristic_result
                provider_used = "Heuristic Liveness (Face++ unavailable)"
            elif heuristic_result.get("error"):
                result = fpp_result
                provider_used = "Face++ Liveness (heuristic unavailable)"
            else:
                combined_conf = fpp_result.get("confidence", 0) * 0.40 + heuristic_result.get("confidence", 0) * 0.60
                score = max(1, min(20, int(combined_conf * 20)))
                is_real = combined_conf > 0.75

                result = {
                    "is_real": is_real,
                    "confidence": round(combined_conf, 4),
                    "score": score,
                    "breakdown": (fpp_result.get("breakdown") or []) + (heuristic_result.get("breakdown") or []),
                    "info": fpp_result.get("info") or [],
                    "error": None,
                }
                provider_used = "Face++ + Heuristic"
        elif provider == "aws" and liveness_aws:
            # Standalone AWS DetectFaces heuristic
            result = liveness_aws.predict(image_bytes, bbox)
            provider_used = "AWS Rekognition"
        elif provider == "aws_hybrid" and liveness_aws and liveness_passive:
            # Hybrid: merge AWS face attributes (40%) with pixel-level analysis (60%)
            aws_result = liveness_aws.predict(image_bytes, bbox)
            heuristic_result = liveness_passive.predict(image_bytes, bbox)

            if aws_result.get("error"):
                result = heuristic_result
                provider_used = "Heuristic Liveness (AWS unavailable)"
            elif heuristic_result.get("error"):
                result = aws_result
                provider_used = "AWS Rekognition (heuristic unavailable)"
            else:
                combined_conf = aws_result.get("confidence", 0) * 0.40 + heuristic_result.get("confidence", 0) * 0.60
                score = max(1, min(20, int(combined_conf * 20)))
                is_real = combined_conf > 0.75

                result = {
                    "is_real": is_real,
                    "confidence": round(combined_conf, 4),
                    "score": score,
                    "breakdown": (aws_result.get("breakdown") or []) + (heuristic_result.get("breakdown") or []),
                    "info": aws_result.get("info") or [],
                    "error": None,
                }
                provider_used = "AWS Rekognition + Heuristic"
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
