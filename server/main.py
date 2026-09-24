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


class OcrParseResponse(BaseModel):
    id_type_code: int | None = None
    id_type_name: str | None = None
    personal_data: list[dict] = []
    other_fields: list[dict] = []
    id_information: list[dict] = []
    error: str | None = None


@app.post("/ocr/parse", response_model=OcrParseResponse)
async def ocr_parse(request: Request):
    body = await request.json()
    texts = body.get("texts", [])  # array of {label: string, text: string}
    provider = body.get("provider", "groq")
    if not texts:
        raise HTTPException(status_code=400, detail="No text provided")
    try:
        api_key = body.get("api_key") or os.environ.get(f"{provider.upper()}_API_KEY")
        if not api_key:
            return OcrParseResponse(error=f"{provider.upper()}_API_KEY env var not set")
        
        text_block = "\n\n".join([f"[{t['label']}]\n{t['text']}" for t in texts])
        
        prompt = f"""You are an AI ID document parser for the Philippines. Extract structured information from the following ID document text(s).

PHILIPPINES ID TYPE REGISTRY (use id_type_code for responses):
0 = Other (specify what was detected)
1 = Philippines Passport
2 = Philippines National ID (ePhilID)
3 = Philippines National ID (PhilID Card)
4 = Philippines UMID
5 = Philippines PRC ID
6 = Philippines SSS ID
7 = Philippines GSIS ID
8 = Philippines TIN Card
9 = Philippines PWD ID
10 = Philippines Senior Citizen ID
11 = Philippines PhilHealth ID
12 = Philippines Postal ID
13 = Philippines Driver's License

Return ONLY valid JSON with no markdown or explanation. Format:
{{"id_type_code": <integer>, "id_type_name": "<full name from registry>", "personal_data": [{{"label": "<variable_name>", "value": "<value>"}}], "other_fields": [{{"label": "<variable_name>", "value": "<value>"}}], "id_information": [{{"id_label": "ID 1", "id_type_code": <int>, "id_type_name": "<str>", "id_number": "<str>"}}]}}

Extract ALL visible fields. Omit any field with an empty value.
CRITICAL: Only extract values that literally appear in the OCR text above. NEVER invent, guess, or assume a value. If a field is not present in the OCR text, omit it entirely. Do not default to any value.

Group into three categories. Validate field values intelligently using common abbreviations:
- blood_type: only A, B, AB, O (with optional +/-). Must literally appear in OCR text — do not guess or default.
- gender: Male/Female (also accept M/F, MALE/FEMALE). Must literally appear in OCR text.
- civil_status: Single/Married/Divorced/Widowed (also accept S/M/D/W). Must literally appear in OCR text.
- birth_date: yyyy-mm-dd format. Must literally appear in OCR text.

1. personal_data — name and birth. Exact: first_name, middle_name, last_name, birth_date
2. other_fields — everything else: id_number, gender, nationality, address, expiry_date, issue_date, blood_type, religion, civil_status, occupation, mother_maiden_name, father_name, place_of_birth, height, weight, eye_color, restrictions
3. id_information — per-ID info when multiple IDs uploaded. Format: [{{"id_label":"ID 1","id_type_code":1,"id_type_name":"Philippines Passport","id_number":"P123456"}}]

If text from multiple sides/IDs is provided, cross-reference and reconcile any discrepancies. Use the most complete/correct data. Put shared/cross-referenced fields in personal_data or other_fields, and per-ID specific data in id_information.

OCR Text:
{text_block}"""
        
        if provider == "gemini":
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            model_instance = genai.GenerativeModel("gemini-2.0-flash")
            response = model_instance.generate_content(f"{prompt}\n\n---\n{text_block}")
            content = response.text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        else:
            base_url = "https://api.groq.com/openai/v1" if provider == "groq" else "https://api.openai.com/v1"
            model = "llama-3.3-70b-versatile" if provider == "groq" else "gpt-4o-mini"
            
            res = http_requests.post(f"{base_url}/chat/completions", json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1,
            }, headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            }, timeout=30)
            
            data = res.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            if not content:
                return OcrParseResponse(error=f"Empty response from {provider}. Check API key and model access.")
        
        import re
        json_str = re.sub(r'```json|```', '', content).strip()
        parsed = json.loads(json_str)
        return OcrParseResponse(
            id_type_code=parsed.get("id_type_code"),
            id_type_name=parsed.get("id_type_name"),
            personal_data=parsed.get("personal_data", []),
            other_fields=parsed.get("other_fields", []),
            id_information=parsed.get("id_information", []),
        )
    except Exception as e:
        return OcrParseResponse(error=str(e))


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


class DocumentQualityResponse(BaseModel):
    is_usable: bool
    verdict: str  # "PASS" | "RETAKE"
    score: int  # 0-100
    sharpness: float  # Laplacian variance
    sharpness_label: str  # "sharp" | "marginal" | "blurry"
    brightness: float  # mean gray 0-255
    contrast: float  # std gray
    resolution_mp: float
    glare_detected: bool
    text_lines: int = 0
    text_words: int = 0
    avg_confidence: float = 0
    low_conf_ratio: float = 0
    real_words: int = 0
    real_word_ratio: float = 0
    fragment_ratio: float = 0
    text_coverage: float = 0
    text_mp: float = 0
    camera_max_mp: float | None = None
    text_sample: list[str] = []
    full_text: list[str] = []
    reasons: list[str] = []
    breakdown: list[dict] = []
    aws_checked: bool = False
    error: str | None = None


def _analyze_document_local(image_bytes: bytes) -> dict:
    """Local (free, offline) document quality signals with numpy+PIL.

    Same Laplacian-variance technique already proven in
    server/providers/liveness_passive.py, retuned for documents
    (text edges need higher sharpness than faces).
    """
    import io as _io
    import numpy as _np
    from PIL import Image as _Image

    pil = _Image.open(_io.BytesIO(image_bytes)).convert("RGB")
    w, h = pil.size
    arr = _np.array(pil, dtype=_np.uint8)
    gray = arr.mean(axis=2).astype(_np.float64)

    # Sharpness: Laplacian variance
    lap = (
        -gray[1:-1, 1:-1] * 4
        + gray[:-2, 1:-1]
        + gray[2:, 1:-1]
        + gray[1:-1, :-2]
        + gray[1:-1, 2:]
    )
    lap_var = float(_np.var(lap))

    # Edge strength (mean gradient)
    eh = _np.abs(_np.diff(gray, axis=1))
    ev = _np.abs(_np.diff(gray, axis=0))
    edge = float((eh.mean() + ev.mean()) / 2)

    brightness = float(gray.mean())
    contrast = float(gray.std())
    mp = round((w * h) / 1_000_000, 2)

    # Glare: saturated near-white pixels with low color spread (screen/paper reflection)
    max_rgb = _np.max(arr, axis=2)
    mean_rgb = _np.mean(arr, axis=2)
    glare_mask = (max_rgb > 240) & ((max_rgb - mean_rgb) > 30)
    glare_ratio = float(_np.sum(glare_mask)) / (h * w)

    if lap_var < 25:
        sharp_label = "blurry"
    elif lap_var < 80:
        sharp_label = "marginal"
    else:
        sharp_label = "sharp"

    return {
        "width": w, "height": h,
        "lap_var": lap_var, "edge": edge,
        "brightness": brightness, "contrast": contrast,
        "resolution_mp": mp, "glare_ratio": glare_ratio,
        "glare": glare_ratio > 0.02,
        "sharp_label": sharp_label,
    }


def _analyze_text_content(lines: list[dict]) -> dict:
    """Content-level garbage detection on DetectText LINEs.

    Confidence alone passes crisp garbage ("B", "-", ". -" fragments from
    card graphics). Real readable text has multi-char tokens, few fragment
    lines, and covers a meaningful share of the frame.
    """
    import re as _re

    texts = [str(d.get("DetectedText", "")) for d in lines]
    # Real words: tokens with 3+ alnum chars ("Republic", "P1234567", "1990-01-31",
    # "Pilipinas" all count; "B", "M", "-" do not). Script-based, not a
    # dictionary — Filipino/Tagalog counts identically to English.
    real_words = sum(
        1 for t in texts for tok in _re.split(r"\s+", t) if _re.search(r"[A-Za-z0-9]{3,}", tok)
    )
    # Fragment lines: <3 alnum chars in the whole line
    frag = sum(1 for t in texts if len(_re.sub(r"[^A-Za-z0-9]", "", t)) < 3)
    fragment_ratio = round(frag / len(texts), 2) if texts else 1.0
    # Frame coverage: summed LINE bbox areas (relative coords) — a document
    # photographed from too far away yields tiny text boxes
    coverage = 0.0
    for d in lines:
        box = (d.get("Geometry") or {}).get("BoundingBox") or {}
        try:
            coverage += float(box.get("Width", 0)) * float(box.get("Height", 0))
        except (TypeError, ValueError):
            continue
    return {
        "real_words": real_words,
        "fragment_ratio": fragment_ratio,
        "coverage": round(min(1.0, coverage), 4),
    }


@app.post("/document/quality", response_model=DocumentQualityResponse)
async def document_quality(request: Request):
    """KYCB-787 POC: detect blurry documents + unreadable text.

    Combines free local blur analysis (Laplacian variance, brightness,
    contrast, resolution, glare) with AWS Rekognition DetectText
    confidence + content analysis (real words, fragment ratio, frame
    coverage). Works without AWS creds — returns local-only verdict
    with aws_checked=false.
    """
    body = await request.json()
    image_b64 = body.get("image")
    check_text = body.get("check_text", True)
    # Optional: browser-reported camera max (from track.getCapabilities()).
    # Lets the endpoint tell "too far" (fixable now) apart from "camera maxed
    # out" (fixable only by switching camera / uploading a file).
    camera_max_mp: float | None = None
    try:
        if body.get("camera_max_mp"):
            camera_max_mp = float(body.get("camera_max_mp"))
    except (TypeError, ValueError):
        camera_max_mp = None
    if not image_b64:
        raise HTTPException(status_code=400, detail="No image provided")

    try:
        image_bytes = base64.b64decode(image_b64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 image")

    # TIFF support: browsers can't preview it and Rekognition only takes
    # JPEG/PNG, so normalize server-side — first page, RGB JPEG.
    tiff_note: str | None = None
    try:
        from PIL import Image as _PILImage
        with _PILImage.open(io.BytesIO(image_bytes)) as _im:
            if (_im.format or "").upper() in ("TIFF", "TIF"):
                try:
                    _im.seek(0)
                except Exception:
                    pass
                _buf = io.BytesIO()
                _im.convert("RGB").save(_buf, format="JPEG", quality=92)
                image_bytes = _buf.getvalue()
                tiff_note = "TIFF input converted to JPEG (first page) for analysis"
    except Exception:
        pass  # not PIL-readable — downstream decode errors surface normally

    try:
        local = _analyze_document_local(image_bytes)
    except Exception as e:
        return DocumentQualityResponse(
            is_usable=False, verdict="RETAKE", score=0,
            sharpness=0, sharpness_label="blurry",
            brightness=0, contrast=0, resolution_mp=0,
            glare_detected=False, reasons=[f"Could not decode image: {e}"],
        )

    lap_var = local["lap_var"]
    brightness = local["brightness"]
    contrast = local["contrast"]
    mp = local["resolution_mp"]
    glare = local["glare"]
    sharp_label = local["sharp_label"]

    def clamp(v, lo, hi):
        return max(0.0, min(1.0, (v - lo) / (hi - lo)))

    # Local sub-scores (resolution scored after AWS: what matters is pixels
    # ON TEXT, not sensor megapixels — a 0.3MP frame-filling shot beats a
    # 12MP shot from across the room)
    s_sharp = clamp(lap_var, 10, 150)          # 0-1 -> 30 pts
    # Document-tuned ideals (faces meter darker; white paper meters ~175).
    # Calibrated against excellent real capture: mean 169, std 36, 24KP text.
    s_bright = 1.0 - clamp(abs(brightness - 175), 0, 120)  # paper ≈175 -> 10 pts
    if brightness < 80 or brightness > 235:
        s_bright *= 0.4  # severely under/over-exposed
    s_contrast = clamp(contrast, 10, 45)       # 0-1 -> 10 pts (docs are flatter than faces)

    reasons: list[str] = []
    if tiff_note:
        reasons.append(tiff_note)
    if sharp_label == "blurry":
        reasons.append(f"Blurry (sharpness {lap_var:.1f} < 25) — hold steady, tap to focus, clean lens")
    elif sharp_label == "marginal":
        reasons.append(f"Slightly soft (sharpness {lap_var:.1f}) — hold steadier / move closer")
    if brightness < 80:
        reasons.append(f"Too dark (brightness {brightness:.0f}) — add light, avoid shadows")
    elif brightness > 235:
        reasons.append(f"Overexposed (brightness {brightness:.0f}) — reduce glare / move out of direct light")
    if contrast < 25:
        reasons.append(f"Low contrast ({contrast:.0f}) — improve lighting, flatten document")
    if glare:
        reasons.append("Glare detected — tilt document away from light source")
    # Sanity floor only (thumbnails/icons). Whether it warns is decided after
    # the AWS block below, once we know if content evidence exists: with AWS,
    # readable text is readable text regardless of megapixels.
    resolution_ok = mp >= 0.15

    # AWS readability + content check (DetectText)
    text_lines, text_words = 0, 0
    avg_conf, low_conf_ratio = 0.0, 0.0
    real_words, real_word_ratio, fragment_ratio, text_coverage = 0, 0.0, 1.0, 0.0
    text_sample: list[str] = []
    full_text: list[str] = []
    aws_checked = False
    aws_error: str | None = None
    if check_text:
        try:
            import boto3
            rekognition = boto3.client("rekognition", region_name=os.environ.get("AWS_DEFAULT_REGION", "ap-southeast-1"))
            resp = rekognition.detect_text(Image={"Bytes": image_bytes})
            lines = [d for d in resp.get("TextDetections", []) if d.get("Type") == "LINE"]
            words = [d for d in resp.get("TextDetections", []) if d.get("Type") == "WORD"]
            text_lines = len(lines)
            text_words = len(words)
            aws_checked = True
            if words:
                confs = [w.get("Confidence", 0) for w in words]
                avg_conf = round(sum(confs) / len(confs), 1)
                low = sum(1 for c in confs if c < 80)
                low_conf_ratio = round(low / len(confs), 2)
                text_sample = [str(d.get("DetectedText", "")) for d in lines[:5]]
                full_text = [str(d.get("DetectedText", "")) for d in lines]
            if lines:
                content = _analyze_text_content(lines)
                real_words = content["real_words"]
                fragment_ratio = content["fragment_ratio"]
                text_coverage = content["coverage"]
                # Word-level share: how much of what AWS found is language.
                # Catches mixed captures (clear half + garbage half) that pass
                # line-level checks — e.g. "Dela Cruz X Q 7" is not a fragment
                # line, but half its words are junk.
                real_word_ratio = round(real_words / text_words, 2) if text_words else 0.0
        except Exception as e:
            aws_error = str(e)

    if not resolution_ok and not aws_checked:
        reasons.append(f"Too tiny ({mp} MP) — capture at higher quality or upload a photo")

    # Detail that matters: megapixels actually ON TEXT (camera-independent).
    # 0.15MP of text detail ≈ full marks; scored 0-1 -> 5 pts.
    text_mp = round(mp * text_coverage, 4) if aws_checked else 0.0
    if aws_checked:
        # Calibrated: an excellent real capture carries ~24KP of text detail
        s_res = clamp(text_mp, 0.003, 0.025)
    else:
        s_res = clamp(mp, 0.2, 2.0)

    # Text sub-score (45 pts when AWS available)
    if aws_checked:
        if text_lines == 0:
            s_text = 0.0
            reasons.append("No readable text detected — fill frame with document, focus, add light")
        else:
            s_text = clamp(avg_conf, 50, 95)  # 0-1
            if text_lines < 3:
                s_text *= 0.6
                reasons.append(f"Only {text_lines} text line(s) found — capture full document, not cropped")
            if avg_conf < 70:
                reasons.append(f"Text unclear (avg confidence {avg_conf}%) — retake sharper / better lit")
            elif low_conf_ratio > 0.4:
                reasons.append(f"{int(low_conf_ratio * 100)}% of words low-confidence — retake sharper")
            # Crisp garbage (card graphics read as fragments) scores confidence
            # but has no language content — discount by blended content factor
            # (fragment share + real-word share averaged: good docs ≈1.0,
            # half-garbage ≈0.5, pure fragments ≈0.1)
            content_factor = ((1.0 - fragment_ratio) + real_word_ratio) / 2
            s_text *= content_factor
            if real_word_ratio < 0.5:
                reasons.append(f"Only {int(real_word_ratio * 100)}% real words ({real_words}/{text_words}) — part of the text is unreadable, retake closer and steadier")
            elif real_words < 5:
                reasons.append(f"Only {real_words} readable word(s) — text is fragments, move closer and hold steady")
            if fragment_ratio > 0.5:
                reasons.append(f"{int(fragment_ratio * 100)}% fragment lines (single chars/symbols) — not real text, retake closer")
            if text_coverage < 0.01:
                reasons.append("Text covers <1% of frame — document too far/small, fill the frame")
        score = int(round(s_sharp * 30 + s_bright * 10 + s_contrast * 10 + s_res * 5 + s_text * 45))
    else:
        s_text = 0.0
        reasons.append(f"Text check skipped ({aws_error or 'AWS unavailable'}) — verdict from sharpness/lighting only")
        score = int(round((s_sharp * 30 + s_bright * 10 + s_contrast * 10 + s_res * 5) / 55 * 100))

    score = max(0, min(100, score))

    # Verdict: PASS needs score>=70 AND not blurry AND readable language
    # content that fills the frame (or AWS skipped + sharp + sane size).
    # NOTE: no sensor-megapixel floor — a small sensor with the document
    # filling the frame is judged on its text, not its spec sheet.
    if aws_checked:
        text_ok = (
            text_lines >= 3 and avg_conf >= 70 and low_conf_ratio <= 0.4
            and real_words >= 5 and real_word_ratio >= 0.5
            and fragment_ratio <= 0.5 and text_coverage >= 0.01
        )
        is_usable = score >= 70 and sharp_label != "blurry" and text_ok
    else:
        is_usable = score >= 70 and sharp_label == "sharp" and resolution_ok

    # Camera-aware guidance: "move closer" only helps when the camera has
    # headroom. At max sensor quality with failing content, the fix is a
    # different camera or an uploaded (phone-gallery) photo.
    at_max = bool(camera_max_mp) and mp >= float(camera_max_mp) * 0.9
    if aws_checked and not text_ok:
        if at_max and (camera_max_mp or 0) < 1.0:
            reasons.append(f"Camera maxed out at {mp} MP and text still unreadable — switch camera or use Upload File (phone photos are usually 8MP+)")
        elif text_coverage < 0.03:
            reasons.append("Document looks small in frame — move closer before switching cameras")

    verdict = "PASS" if is_usable else "RETAKE"

    # Every row carries its raw evidence + threshold so points are auditable:
    # no more mystery gaps between "2234", "<25" and "30/30".
    if aws_checked:
        detail_res = f"{text_mp * 1000:.0f}KP on text (full ≈25KP)"
        detail_text = f"avg {avg_conf}% · share {int(real_word_ratio * 100)}% · frag {int(fragment_ratio * 100)}%"
    else:
        detail_res = f"{mp}MP captured"
        detail_text = "skipped (no AWS)"
    breakdown = [
        {"label": "Sharpness", "pts": round(s_sharp * 30, 1), "max": 30,
         "detail": f"laplacian {lap_var:.0f} (sharp ≥80)"},
        {"label": "Lighting", "pts": round(s_bright * 10, 1), "max": 10,
         "detail": f"mean {brightness:.0f} (paper ≈175)"},
        {"label": "Contrast", "pts": round(s_contrast * 10, 1), "max": 10,
         "detail": f"std {contrast:.0f} (good ≥25)"},
        {"label": "Text detail", "pts": round(s_res * 5, 1), "max": 5,
         "detail": detail_res},
        {"label": "Text readability", "pts": round(s_text * 45, 1) if aws_checked else 0, "max": 45,
         "detail": detail_text},
    ]

    return DocumentQualityResponse(
        is_usable=is_usable, verdict=verdict, score=score,
        sharpness=round(lap_var, 1), sharpness_label=sharp_label,
        brightness=round(brightness, 1), contrast=round(contrast, 1),
        resolution_mp=mp, glare_detected=glare,
        text_lines=text_lines, text_words=text_words,
        avg_confidence=avg_conf, low_conf_ratio=low_conf_ratio,
        real_words=real_words, real_word_ratio=real_word_ratio,
        fragment_ratio=fragment_ratio, text_coverage=text_coverage,
        text_mp=text_mp, camera_max_mp=camera_max_mp,
        text_sample=text_sample, full_text=full_text, reasons=reasons,
        breakdown=breakdown, aws_checked=aws_checked,
        error=aws_error,
    )


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
