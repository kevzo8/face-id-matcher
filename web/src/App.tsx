import React, { useState, useRef, useCallback, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { ImageCapture } from './components/ImageCapture';
import { MatchResult } from './components/MatchResult';
import { BatchMatcher } from './components/BatchMatcher';
import { CsvViewer } from './components/CsvViewer';
import Presentation from './components/Presentation';
import LivenessCheck from './components/LivenessCheck';
import PassiveLivenessCheck from './components/PassiveLivenessCheck';

type ImageData = {
  url: string;
  element: HTMLImageElement;
  width: number;
  height: number;
  size: number;
} | null;

type DetectionModel = 'fast' | 'accurate';
type IdToFaceProvider = 'local' | 'rekognition' | 'megamatcher' | 'insightface' | 'faceplusplus';
type OcrProvider = 'bedrock' | 'textract' | 'verihubs' | 'zoloz' | 'tencent' | 'google_docai' | 'mindee' | 'azure_di';
type LivenessProvider = 'aws_rekognition' | 'aws_detect_faces' | 'faceplusplus' | 'azure_face' | 'hyperverge' | 'didit' | 'iproov' | 'open_face_liveness' | 'openbiometrics';
type FaceBox = { x: number; y: number; width: number; height: number; score: number };

function checkOrientation(detection: faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>): string | null {
  const landmarks = detection.landmarks;
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();
  if (!leftEye.length || !rightEye.length) return null;
  const lx = leftEye.reduce((s, p) => s + p.x, 0) / leftEye.length;
  const ly = leftEye.reduce((s, p) => s + p.y, 0) / leftEye.length;
  const rx = rightEye.reduce((s, p) => s + p.x, 0) / rightEye.length;
  const ry = rightEye.reduce((s, p) => s + p.y, 0) / rightEye.length;
  const angle = Math.abs(Math.atan2(ry - ly, rx - lx) * (180 / Math.PI));
  if (angle < 10 || angle > 170) return null;
  if (angle > 30 && angle < 150) return 'Face is tilted — try a more upright photo';
  return null;
}

export default function App() {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [idImage, setIdImage] = useState<ImageData>(null);
  const [selfieImage, setSelfieImage] = useState<ImageData>(null);
  const [matching, setMatching] = useState(false);
  const [result, setResult] = useState<{
    distance: number;
    similarity: number;
    match: boolean;
    threshold: number;
    error?: string;
    warnings?: string[];
  } | null>(null);
  const [threshold, setThreshold] = useState(0.7);
  const [detectionModel, setDetectionModel] = useState<DetectionModel>('accurate');
  const [idToFaceProvider, setIdToFaceProvider] = useState<IdToFaceProvider>('rekognition');
  const [serverUrl, setServerUrl] = useState('https://face-id-matcher.onrender.com');
  const [ocrProvider, setOcrProvider] = useState<OcrProvider>('verihubs');
  const [ocrServerUrl, setOcrServerUrl] = useState('https://face-id-matcher.onrender.com');
  const [livenessProvider, setLivenessProvider] = useState<LivenessProvider>('open_face_liveness');
  const [livenessServerUrl, setLivenessServerUrl] = useState('https://face-id-matcher.onrender.com');
  const [obServerUrl, setObServerUrl] = useState('https://openbiometrics.onrender.com');
  const [feature, setFeature] = useState<'id_to_face' | 'liveness' | 'ocr'>('id_to_face');
  const [mode, setMode] = useState<'single' | 'batch' | 'csv'>('single');
  const [showInfo, setShowInfo] = useState(false);
  const [showTips, setShowTips] = useState(true);
  const [showLivenessHow, setShowLivenessHow] = useState(false);
  const [showLivenessFails, setShowLivenessFails] = useState(false);
  const [showPresentation, setShowPresentation] = useState(false);
  const [initialSlide, setInitialSlide] = useState(0);
  const [idFaceBox, setIdFaceBox] = useState<FaceBox | null>(null);
  const [selfieFaceBox, setSelfieFaceBox] = useState<FaceBox | null>(null);
  const [livenessRunning, setLivenessRunning] = useState(false);
  const [livenessPassed, setLivenessPassed] = useState(false);
  const [livenessResult, setLivenessResult] = useState<{ pass: boolean; score: number; details: string } | null>(null);
  const [livenessTestStarted, setLivenessTestStarted] = useState(false);
  const [livenessTestResult, setLivenessTestResult] = useState<{ pass: boolean; score: number; details: string; recordingUrl?: string; breakdown?: { label: string; pts: number }[] } | null>(null);
  const [livenessTestVideo, setLivenessTestVideo] = useState<HTMLVideoElement | null>(null);
  const [livenessTestMode, setLivenessTestMode] = useState<'active' | 'passive' | 'upload' | null>(null);
  const [passiveLivenessResult, setPassiveLivenessResult] = useState<{ is_real: boolean; confidence: number; score: number; snapshotUrl?: string; details?: string; error?: string; breakdown?: { label: string; pts: number }[] } | null>(null);
  const [passiveLivenessProvider, setPassiveLivenessProvider] = useState<'faceplusplus' | 'aws' | 'heuristic'>('faceplusplus');
  const livenessTestVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    function handleRoute() {
      const presMatch = window.location.pathname.match(/^\/(face-id|liveness|ocr)\/presentation\/(\d+)$/);
      if (presMatch) {
        const feat = presMatch[1] === 'face-id' ? 'id_to_face' : presMatch[1] === 'liveness' ? 'liveness' : 'ocr';
        setFeature(feat);
        setShowPresentation(true);
        setInitialSlide(parseInt(presMatch[2], 10));
        return;
      }
      setShowPresentation(false);
      const routeMap: Record<string, 'id_to_face' | 'liveness' | 'ocr'> = {
        '/face-id': 'id_to_face',
        '/liveness': 'liveness',
        '/ocr': 'ocr',
      };
      const feat = routeMap[window.location.pathname];
      if (feat) setFeature(feat);
    }
    handleRoute();
    window.addEventListener('popstate', handleRoute);
    return () => window.removeEventListener('popstate', handleRoute);
  }, []);

  useEffect(() => {
    async function loadModels() {
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
      } catch (e) {
        setLoadError(
          'Failed to load face recognition models. Download model weights first (see README).',
        );
      }
    }
    loadModels();
  }, []);

  useEffect(() => {
    if (idToFaceProvider === 'rekognition' || idToFaceProvider === 'faceplusplus') {
      setServerUrl('https://face-id-matcher.onrender.com');
    } else if (idToFaceProvider === 'insightface' || idToFaceProvider === 'megamatcher') {
      setServerUrl('https://kvega-cps221-face-match.hf.space');
    }
  }, [idToFaceProvider]);

  const handleMatch = useCallback(async () => {
    if (!idImage || !selfieImage || !modelsLoaded) return;
    setMatching(true);
    setResult(null);

    try {
      if (idToFaceProvider !== 'local') {
        const canvas = document.createElement('canvas');
        const toBase64 = (img: HTMLImageElement) => {
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext('2d')!.drawImage(img, 0, 0);
          return canvas.toDataURL('image/jpeg').split(',')[1];
        };

        const res = await fetch(`${serverUrl}/compare`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_image: toBase64(idImage.element),
            target_image: toBase64(selfieImage.element),
            threshold,
            provider: idToFaceProvider,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || `Server error: ${res.status}`);
        }

        const data = await res.json();
        setResult({
          distance: data.distance ?? 1,
          similarity: data.similarity ?? 0,
          match: data.match ?? false,
          threshold: data.threshold ?? 0.6,
          error: data.error ?? undefined,
          warnings: data.warnings ?? undefined,
        });

        const detOpts = detectionModel === 'fast'
          ? new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.1 })
          : new faceapi.SsdMobilenetv1Options({ minConfidence: 0.1 });
        const [idDets, selfDets] = await Promise.all([
          faceapi.detectAllFaces(idImage.element, detOpts),
          faceapi.detectAllFaces(selfieImage.element, detOpts),
        ]);
        const pickLargest = (dets: faceapi.FaceDetection[]) => {
          if (!dets.length) return null;
          return dets.reduce((max, d) => d.box.area > max.box.area ? d : max, dets[0]);
        };
        const idDet = pickLargest(idDets);
        const selfDet = pickLargest(selfDets);
        if (idDet) setIdFaceBox({ x: idDet.box.x, y: idDet.box.y, width: idDet.box.width, height: idDet.box.height, score: idDet.score });
        if (selfDet) setSelfieFaceBox({ x: selfDet.box.x, y: selfDet.box.y, width: selfDet.box.width, height: selfDet.box.height, score: selfDet.score });

        setMatching(false);
        return;
      }

      const detectorOptions =
        detectionModel === 'fast'
          ? new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.1 })
          : new faceapi.SsdMobilenetv1Options({ minConfidence: 0.1 });

      const [allIdDetections, allSelfieDetections] = await Promise.all([
        faceapi.detectAllFaces(idImage.element, detectorOptions).withFaceLandmarks().withFaceDescriptors(),
        faceapi.detectAllFaces(selfieImage.element, detectorOptions).withFaceLandmarks().withFaceDescriptors(),
      ]);

      const pickLargest = (dets: faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>>[]) => {
        if (!dets.length) return null;
        return dets.reduce((max, d) => d.detection.box.area > max.detection.box.area ? d : max, dets[0]);
      };

      const idDetection = pickLargest(allIdDetections);
      const selfieDetection = pickLargest(allSelfieDetections);

      if (!idDetection) {
        setResult({ distance: 1, similarity: 0, match: false, threshold, error: 'No face detected in the ID photo. ID photo might be too small or face might not be clear — make sure to take the photos clearly, with good lighting and face directly facing the camera.' });
        setMatching(false);
        return;
      }

      if (!selfieDetection) {
        setResult({ distance: 1, similarity: 0, match: false, threshold, error: 'No face detected in the selfie. Make sure the photo is clear, with good lighting and face directly facing the camera.' });
        setMatching(false);
        return;
      }

      setIdFaceBox({ x: idDetection.detection.box.x, y: idDetection.detection.box.y, width: idDetection.detection.box.width, height: idDetection.detection.box.height, score: idDetection.detection.score });
      setSelfieFaceBox({ x: selfieDetection.detection.box.x, y: selfieDetection.detection.box.y, width: selfieDetection.detection.box.width, height: selfieDetection.detection.box.height, score: selfieDetection.detection.score });

      const idOrient = checkOrientation(idDetection);
      const selfieOrient = checkOrientation(selfieDetection);
      const warnings: string[] = [];
      if (idOrient) warnings.push('ID: ' + idOrient);
      if (selfieOrient) warnings.push('Selfie: ' + selfieOrient);
      if (warnings.length) alert(warnings.join('\n'));

      const distance = faceapi.euclideanDistance(
        idDetection.descriptor,
        selfieDetection.descriptor,
      );

      const similarity = Math.max(0, Math.min(100, (1 - distance) * 100));
      const match = distance < threshold;

      setResult({ distance, similarity, match, threshold, error: warnings.length ? warnings.join('; ') : undefined });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Match failed';
      setResult({ distance: 1, similarity: 0, match: false, threshold, error: msg });
      alert(msg);
    }
    setMatching(false);
  }, [idImage, selfieImage, modelsLoaded, threshold, detectionModel, idToFaceProvider, serverUrl]);

  const handleIdCapture = useCallback((data: ImageData) => {
    setIdImage(data);
    setIdFaceBox(null);
    setResult(null);
  }, []);

  const handleSelfieCapture = useCallback((data: ImageData) => {
    setSelfieImage(data);
    setSelfieFaceBox(null);
    setResult(null);
  }, []);

  const handleLivenessComplete = useCallback((result: { pass: boolean; score: number; details: string }) => {
    setLivenessResult(result);
    setLivenessPassed(result.pass);
    setLivenessRunning(false);
  }, []);

  const handleReset = () => {
    setIdImage(null);
    setSelfieImage(null);
    setResult(null);
    setIdFaceBox(null);
    setSelfieFaceBox(null);
    setLivenessPassed(false);
    setLivenessResult(null);
  };

  if (loadError) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h1 style={{ color: '#ef4444', marginBottom: 16 }}>Model Load Error</h1>
        <p style={{ color: '#94a3b8' }}>{loadError}</p>
        <p style={{ color: '#64748b', marginTop: 16, fontSize: 14 }}>
          Run the download script: <code style={{ background: '#1e293b', padding: '2px 8px', borderRadius: 4 }}>npm run download-models</code>
        </p>
      </div>
    );
  }

  if (showPresentation) {
    return <Presentation feature={feature} initialSlide={initialSlide} onClose={() => { setShowPresentation(false); window.history.pushState(null, '', '/' + ({ id_to_face: 'face-id', liveness: 'liveness', ocr: 'ocr' })[feature]); }} />;
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 16 }}>
      {/* Header */}
      <header style={{ marginBottom: 12, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <button
            onClick={() => {
              const path = feature === 'id_to_face' ? 'face-id' : feature === 'liveness' ? 'liveness' : 'ocr';
              const slide = feature === 'id_to_face' ? 0 : feature === 'liveness' ? 1 : 2;
              window.history.pushState(null, '', '/' + path + '/presentation/' + slide);
              setShowPresentation(true);
              setInitialSlide(slide);
            }}
            style={{
              padding: '6px 14px', fontSize: 12, fontWeight: 600,
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              color: '#fff', border: 'none', borderRadius: 6,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 4 }}><polygon points="5 3 19 12 5 21 5 3" /></svg> Present Slides
          </button>
          <a
            href="https://screenrec.com/share/irItDuPKEv"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              marginLeft: 8,
              padding: '6px 14px', fontSize: 12, fontWeight: 600,
              background: 'linear-gradient(135deg, #ef4444, #f97316)',
              color: '#fff', border: 'none', borderRadius: 6,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
              textDecoration: 'none',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 4 }}><circle cx="12" cy="12" r="10" fill="currentColor"/><circle cx="12" cy="12" r="4" fill="#0f172a"/></svg> Demo Video
          </a>
        </div>
        <div style={{ fontSize: 'clamp(20px, 5vw, 28px)', fontWeight: 700, marginBottom: 2 }}>Face ID Matcher POC</div>
        <p style={{ color: '#94a3b8', fontSize: 13 }}>
          Compare any two face photos — selfie vs ID, selfie vs selfie, or ID vs ID — with 1:1 face matching
        </p>
      </header>

      {!modelsLoaded && (
        <p style={{ color: '#f59e0b', textAlign: 'center', marginBottom: 12, fontSize: 13 }}>Loading face recognition models...</p>
      )}

      {/* Three-column layout */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

        {/* === Left: Feature Menu === */}
        <div style={{ flex: '0 0 130px', background: '#1e293b', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          <div style={{ padding: '10px 10px 4px', fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 1 }}>Applications</div>

          {([
            { key: 'id_to_face' as const, label: 'ID to Face', color: '#a855f7', icon: '\u2696' },
            { key: 'liveness' as const, label: 'Liveness Test', color: '#f97316', icon: '\u25C9' },
            { key: 'ocr' as const, label: 'OCR & ID Type', color: '#22c55e', icon: '\u2630' },
          ]).map((f) => (
            <button
              key={f.key}
              onClick={() => { setShowPresentation(false); setFeature(f.key); window.history.pushState(null, '', '/' + ({ id_to_face: 'face-id', liveness: 'liveness', ocr: 'ocr' })[f.key]); }}
              style={{
                width: '100%', textAlign: 'left', padding: '10px 10px', fontSize: 12, fontWeight: 600,
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                background: !showPresentation && feature === f.key ? '#334155' : 'transparent',
                color: !showPresentation && feature === f.key ? f.color : '#64748b',
                borderLeft: `3px solid ${!showPresentation && feature === f.key ? f.color : 'transparent'}`,
              }}
            >
              <span>{f.icon}</span>
              <span>{f.label}</span>
            </button>
          ))}

          <div style={{ padding: '12px 10px 4px', fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 1 }}>Presentations</div>

          {([
            { key: 'id_to_face' as const, label: 'ID to Face', color: '#a855f7', icon: '\u2696', slide: 0, path: 'face-id' },
            { key: 'liveness' as const, label: 'Liveness Test', color: '#f97316', icon: '\u25C9', slide: 1, path: 'liveness' },
            { key: 'ocr' as const, label: 'OCR & ID Type', color: '#22c55e', icon: '\u2630', slide: 2, path: 'ocr' },
          ]).map((f) => (
            <button
              key={'p-' + f.key}
              onClick={() => { window.history.pushState(null, '', '/' + f.path + '/presentation/' + f.slide); setShowPresentation(true); setInitialSlide(f.slide); setFeature(f.key); }}
              style={{
                width: '100%', textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 500,
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                background: showPresentation && feature === f.key ? '#334155' : 'transparent',
                color: showPresentation && feature === f.key ? f.color : '#475569',
                borderLeft: `3px solid ${showPresentation && feature === f.key ? f.color : 'transparent'}`,
              }}
            >
              <span>{f.icon}</span>
              <span>{f.label}</span>
            </button>
          ))}
        </div>

        {/* === Center: Main content === */}
        <div style={{ flex: '1 1 0', minWidth: 280 }}>

          {/* ==================== ID TO FACE ==================== */}
          <div style={{ display: feature === 'id_to_face' ? 'block' : 'none' }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
              {(['single', 'batch', 'csv'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    flex: 1, padding: '5px 12px', fontSize: 12, fontWeight: 600,
                    border: 'none', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap',
                    background: mode === m ? '#a855f7' : '#1e293b',
                    color: mode === m ? '#fff' : '#64748b',
                  }}
                >
                  {m === 'single' ? '\u2696 Single Compare' : m === 'batch' ? '\u2630 Batch' : '\u2630 CSV'}
                </button>
              ))}
            </div>

            {mode === 'batch' && (
              <BatchMatcher
                detectionModel={detectionModel}
                provider={idToFaceProvider}
                serverUrl={serverUrl}
                threshold={threshold}
                onBack={() => setMode('single')}
              />
            )}
            {mode === 'csv' && <CsvViewer />}
            {mode === 'single' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12, marginBottom: 12 }}>
                  <ImageCapture title="1. ID Photo" subtitle="Upload or take a photo of an ID card" image={idImage} onCapture={handleIdCapture} facingMode="environment" accentColor="#22c55e" icon="card" faceBox={idFaceBox} />
                  <ImageCapture title="2. Selfie" subtitle="Take a selfie, upload a photo, or use another ID" image={selfieImage} onCapture={handleSelfieCapture} facingMode="user" accentColor="#3b82f6" icon="person" faceBox={selfieFaceBox} />
                </div>

                {selfieImage && !livenessRunning && !livenessResult && (
                  <div style={{ textAlign: 'center', marginBottom: 10 }}>
                    <button onClick={() => { setLivenessRunning(true); setLivenessResult(null); }}
                      style={{ padding: '8px 20px', fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'linear-gradient(135deg, #f97316, #ef4444)', color: '#fff' }}>
                      Start Liveness Check
                    </button>
                    <div style={{ color: '#64748b', fontSize: 10, marginTop: 4 }}>Required before face comparison</div>
                  </div>
                )}
                {livenessRunning && (
                  <div style={{ background: '#1e293b', borderRadius: 8, padding: 12, marginBottom: 10, border: '1px solid #475569' }}>
                    <LivenessCheck onComplete={handleLivenessComplete} provider={livenessProvider} serverUrl={livenessServerUrl} />
                  </div>
                )}
                {livenessResult && (
                  <div style={{ textAlign: 'center', marginBottom: 10, padding: '8px 12px', borderRadius: 6,
                    background: livenessResult.pass ? '#064e3b' : '#450a0a',
                    border: `1px solid ${livenessResult.pass ? '#22c55e' : '#ef4444'}` }}>
                    <div style={{ color: livenessResult.pass ? '#86efac' : '#fca5a5', fontSize: 13, fontWeight: 600 }}>
                      {livenessResult.pass ? 'Liveness Passed' : 'Liveness Failed'}
                    </div>
                    <div style={{ color: livenessResult.pass ? '#86efac' : '#fca5a5', fontSize: 11, marginTop: 2 }}>Score: {livenessResult.score}/100 &mdash; {livenessResult.details}</div>
                    {livenessResult.pass && <div style={{ color: '#86efac', fontSize: 10, marginTop: 2 }}>Face comparison now available</div>}
                    {!livenessResult.pass && (
                      <button onClick={() => { setLivenessRunning(true); setLivenessResult(null); }}
                        style={{ marginTop: 6, padding: '4px 14px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 4, cursor: 'pointer', background: '#ef4444', color: '#fff' }}>
                        Retry Liveness Check
                      </button>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
                  <button onClick={handleMatch}
                    disabled={!idImage || !selfieImage || matching || !modelsLoaded || (selfieImage && !livenessPassed)}
                    style={{ padding: '10px 28px', fontSize: 15, fontWeight: 600, border: 'none', borderRadius: 8,
                      cursor: idImage && selfieImage && !matching && modelsLoaded && livenessPassed ? 'pointer' : 'not-allowed',
                      background: idImage && selfieImage && !matching && modelsLoaded && livenessPassed ? '#a855f7' : '#334155', color: '#fff' }}>
                    {matching ? 'Matching...' : '\u2696 Compare Faces'}
                  </button>
                  <button onClick={handleReset} style={{ padding: '10px 20px', fontSize: 13, border: '1px solid #475569', borderRadius: 8, cursor: 'pointer', background: 'transparent', color: '#94a3b8' }}>Reset</button>
                </div>
                {result && <MatchResult result={result} />}
              </>
            )}
          </div>

          {/* ==================== LIVENESS ==================== */}
          <div style={{ display: feature === 'liveness' ? 'block' : 'none' }}>
            <div style={{ maxWidth: 480, margin: '0 auto' }}>
              <h3 style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 15, marginBottom: 8, textAlign: 'center' }}>Liveness Detection Test</h3>
              <video ref={livenessTestVideoRef} style={{ display: 'none' }} playsInline muted />
              {!livenessTestStarted && !livenessTestResult && !livenessTestMode && !passiveLivenessResult && (
                <>
                  <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>Choose a test type:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
                     <button onClick={() => { setLivenessTestResult(null); setPassiveLivenessResult(null); setLivenessTestMode('active'); }}
                      style={{ width: '100%', maxWidth: 320, padding: '12px 20px', fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 8, cursor: 'pointer', background: 'linear-gradient(135deg, #581c87, #7c3aed)', color: '#e9d5ff', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>&#9654;</span>
                      <span><strong>Active Liveness</strong><br /><span style={{ fontSize: 11, opacity: 0.7 }}>Challenge-response: follow on-screen prompts</span></span>
                    </button>
                    <button onClick={() => { setLivenessTestResult(null); setPassiveLivenessResult(null); setLivenessTestMode('passive'); }}
                      style={{ width: '100%', maxWidth: 320, padding: '12px 20px', fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 8, cursor: 'pointer', background: 'linear-gradient(135deg, #14532d, #16a34a)', color: '#bbf7d0', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>&#9725;</span>
                      <span><strong>Passive Liveness</strong><br /><span style={{ fontSize: 11, opacity: 0.7 }}>Snap & detect — no action needed, server-side analysis</span></span>
                    </button>
                    <label style={{ width: '100%', maxWidth: 320, padding: '12px 20px', fontSize: 14, fontWeight: 600, border: '2px dashed #f97316', borderRadius: 8, cursor: 'pointer', background: 'transparent', color: '#f97316', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, boxSizing: 'border-box' }}>
                      <span style={{ fontSize: 20 }}>&#128247;</span>
                      <span><strong>Upload Video</strong><br /><span style={{ fontSize: 11, opacity: 0.8 }}>Test with a recorded video or photo</span></span>
                      <input type="file" accept="video/*" style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setLivenessTestMode('upload');
                          const video = livenessTestVideoRef.current;
                          if (!video) return;
                          video.src = URL.createObjectURL(file);
                          video.load();
                          video.oncanplay = () => { setLivenessTestVideo(video); setLivenessTestStarted(true); };
                        }} />
                    </label>
                  </div>
                </>
              )}
              {livenessTestMode === 'active' && !livenessTestResult && (
                <div style={{ background: '#1e293b', borderRadius: 8, padding: 16, border: '1px solid #475569', marginTop: 12 }}>
                  <LivenessCheck onComplete={(r) => { setLivenessTestResult(r as { pass: boolean; score: number; details: string; recordingUrl?: string }); setLivenessTestStarted(false); setLivenessTestMode(null); }} autoStart={true} provider={livenessProvider} serverUrl={livenessServerUrl} obServerUrl={obServerUrl} />
                </div>
              )}
              {livenessTestMode === 'passive' && !passiveLivenessResult && (
                <div style={{ background: '#1e293b', borderRadius: 8, padding: 16, border: '1px solid #3b82f6', marginTop: 12 }}>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, color: '#94a3b8', marginRight: 8 }}>Passive Provider:</label>
                    <select value={passiveLivenessProvider} onChange={(e) => setPassiveLivenessProvider(e.target.value as any)} style={{ padding: '6px 8px', background: '#0f172a', color: '#e2e8f0', border: '1px solid #475569', borderRadius: 4, fontSize: 12 }}>
                      <option value="faceplusplus">Face++ Passive ($0.00019/check)</option>
                      <option value="aws">AWS DetectFaces ($0.001/check)</option>
                      <option value="heuristic">Heuristic Passive ($0)</option>
                    </select>
                  </div>
                  <PassiveLivenessCheck serverUrl={livenessServerUrl} provider={passiveLivenessProvider} onComplete={(r) => { setPassiveLivenessResult(r); setLivenessTestMode(null); }} />
                </div>
              )}
              {livenessTestStarted && !livenessTestResult && livenessTestMode === 'upload' && (
                <div style={{ background: '#1e293b', borderRadius: 8, padding: 16, border: '1px solid #475569', marginTop: 12 }}>
                  <LivenessCheck onComplete={(r) => { setLivenessTestResult(r as { pass: boolean; score: number; details: string; recordingUrl?: string }); setLivenessTestStarted(false); setLivenessTestMode(null); }} externalVideo={livenessTestVideo} autoStart={true} provider={livenessProvider} serverUrl={livenessServerUrl} obServerUrl={obServerUrl} />
                </div>
              )}
              {livenessTestResult && (
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <div style={{ padding: '14px 16px', borderRadius: 8,
                    background: livenessTestResult.pass ? '#064e3b' : '#450a0a',
                    border: `1px solid ${livenessTestResult.pass ? '#22c55e' : '#ef4444'}`, marginBottom: 12 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: livenessTestResult.pass ? '#86efac' : '#fca5a5', marginBottom: 4 }}>
                      {livenessTestResult.pass ? 'ACTIVE LIVENESS PASSED' : 'ACTIVE LIVENESS FAILED'}
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: livenessTestResult.pass ? '#bbf7d0' : '#fecaca', marginBottom: 4 }}>{livenessTestResult.score}/100</div>
                    <div style={{ color: livenessTestResult.pass ? '#86efac' : '#fca5a5', fontSize: 12 }}>{livenessTestResult.details}</div>
                    {livenessTestResult.breakdown && (
                      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 3, textAlign: 'left' }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Score Breakdown</div>
                        {livenessTestResult.breakdown.map((b, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#cbd5e1', padding: '2px 6px', background: 'rgba(0,0,0,0.2)', borderRadius: 3 }}>
                            <span>{b.label}</span>
                            <span style={{ fontWeight: 600, color: b.pts > 0 ? '#86efac' : '#fca5a5' }}>{b.pts > 0 ? '+' : ''}{b.pts}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {livenessTestResult.recordingUrl && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Playback</div>
                      <video src={livenessTestResult.recordingUrl} controls
                        style={{ width: '100%', maxWidth: 280, borderRadius: 6, display: 'block', margin: '0 auto' }} />
                    </div>
                  )}
                  <button onClick={() => {
                    if (livenessTestResult.recordingUrl?.startsWith('blob:')) URL.revokeObjectURL(livenessTestResult.recordingUrl);
                    setLivenessTestStarted(false); setLivenessTestResult(null); setLivenessTestVideo(null); setLivenessTestMode(null);
                    if (livenessTestVideoRef.current) { livenessTestVideoRef.current.src = ''; livenessTestVideoRef.current.load(); }
                  }}
                    style={{ padding: '8px 20px', fontSize: 13, fontWeight: 600, border: '1px solid #475569', borderRadius: 6, cursor: 'pointer', background: 'transparent', color: '#e2e8f0' }}>
                    &#8634; Reset
                  </button>
                </div>
              )}
              {passiveLivenessResult && (
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  {passiveLivenessResult.snapshotUrl && (
                    <div style={{ marginBottom: 12 }}>
                      <img src={passiveLivenessResult.snapshotUrl} alt="Captured face"
                        style={{ width: '100%', maxWidth: 320, borderRadius: 8, objectFit: 'contain', border: '1px solid #475569' }} />
                    </div>
                  )}
                  <div style={{ padding: '14px 16px', borderRadius: 8,
                    background: passiveLivenessResult.is_real ? '#064e3b' : '#450a0a',
                    border: `1px solid ${passiveLivenessResult.is_real ? '#22c55e' : '#ef4444'}`, marginBottom: 12 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: passiveLivenessResult.is_real ? '#86efac' : '#fca5a5', marginBottom: 4 }}>
                      {passiveLivenessResult.is_real ? 'PASSIVE LIVENESS PASSED' : 'PASSIVE LIVENESS FAILED'}
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: passiveLivenessResult.is_real ? '#bbf7d0' : '#fecaca', marginBottom: 4 }}>
                      {Math.round(passiveLivenessResult.confidence * 100)}%
                    </div>
                    <div style={{ color: passiveLivenessResult.is_real ? '#86efac' : '#fca5a5', fontSize: 12 }}>
                      Score: {passiveLivenessResult.score}/20 &mdash; {passiveLivenessResult.details || passiveLivenessResult.error || (passiveLivenessResult.is_real ? 'Real face detected' : 'Spoof detected')}
                    </div>
                    {passiveLivenessResult.breakdown && (
                      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 3, textAlign: 'left' }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Score Breakdown</div>
                        {passiveLivenessResult.breakdown.map((b, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#cbd5e1', padding: '2px 6px', background: 'rgba(0,0,0,0.2)', borderRadius: 3 }}>
                            <span>{b.label}</span>
                            <span style={{ fontWeight: 600, color: b.pts > 0 ? '#86efac' : '#fca5a5' }}>+{b.pts.toFixed(1)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => { setPassiveLivenessResult(null); setLivenessTestMode(null); }}
                    style={{ padding: '8px 20px', fontSize: 13, fontWeight: 600, border: '1px solid #475569', borderRadius: 6, cursor: 'pointer', background: 'transparent', color: '#e2e8f0' }}>
                    &#8634; Reset
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ==================== OCR ==================== */}
          <div style={{ display: feature === 'ocr' ? 'block' : 'none' }}>
            <div style={{ textAlign: 'center', padding: 40 }}>
              <h3 style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 15, marginBottom: 8 }}>OCR &amp; Auto-Detect ID Type</h3>
              <p style={{ color: '#64748b', fontSize: 13 }}>Provider selected in the right sidebar. Implementation coming soon.</p>
            </div>
          </div>

        </div>

        {/* === Right: Sidebar (feature-aware) === */}
        <div style={{ flex: '0 0 260px', background: '#1e293b', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {feature === 'id_to_face' && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#a855f7' }}>ID TO FACE PROVIDER</div>
                <select value={idToFaceProvider} onChange={(e) => setIdToFaceProvider(e.target.value as IdToFaceProvider)}
                  style={{ width: '100%', padding: '5px 8px', borderRadius: 4, border: '1px solid #475569', background: '#0f172a', color: '#e2e8f0', fontSize: 12 }}>
                  <option value="rekognition">AWS Rekognition (cloud)</option>
                  <option value="insightface">InsightFace (server)</option>
                  <option value="faceplusplus">Face++ (cloud)</option>
                  <option value="megamatcher">Megamatcher (server)</option>
                  <option value="local">face-api.js (browser)</option>
                </select>
                {idToFaceProvider === 'local' && (
                  <select value={detectionModel} onChange={(e) => setDetectionModel(e.target.value as DetectionModel)}
                    style={{ width: '100%', padding: '5px 8px', borderRadius: 4, border: '1px solid #475569', background: '#0f172a', color: '#e2e8f0', fontSize: 12 }}>
                    <option value="accurate">SSD MobileNet (accurate)</option>
                    <option value="fast">TinyFaceDetector (fast)</option>
                  </select>
                )}
                {idToFaceProvider !== 'local' && (
                  <input type="text" value={serverUrl} onChange={(e) => setServerUrl(e.target.value)}
                    style={{ width: '100%', padding: '5px 8px', borderRadius: 4, border: '1px solid #475569', background: '#0f172a', color: '#e2e8f0', fontSize: 12, boxSizing: 'border-box' }} />
                )}
                <div style={{ borderTop: '1px solid #334155', paddingTop: 10 }}>
                  {idToFaceProvider === 'local' && (
                    <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
                      <strong style={{ color: '#e2e8f0' }}>face-api.js (browser)</strong><br />
                      Runs entirely in your browser. No data leaves your PC.<br />
                      Uses {detectionModel === 'fast' ? 'TinyFaceDetector' : 'SSD MobileNet'} with 128-dim face descriptors.<br />
                      <em style={{ color: '#64748b' }}>Fast (instant), free, good for quick testing.</em>
                    </div>
                  )}
                  {idToFaceProvider === 'insightface' && (
                    <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
                      <strong style={{ color: '#e2e8f0' }}>InsightFace (server)</strong><br />
                      ONNX-based ArcFace model running on the server. ~95-98% accuracy.<br />
                      <em style={{ color: '#64748b' }}>Good balance of free quality and speed. Needs server deployment.</em>
                    </div>
                  )}
                  {idToFaceProvider === 'rekognition' && (
                    <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
                      <strong style={{ color: '#e2e8f0' }}>AWS Rekognition (cloud)</strong><br />
                      Amazon's face comparison API. ~99% accuracy. $0.001 per comparison.<br />
                      <em style={{ color: '#64748b' }}>Reliable, low-cost, but requires AWS credentials.</em>
                    </div>
                  )}
                  {idToFaceProvider === 'megamatcher' && (
                    <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
                      <strong style={{ color: '#e2e8f0' }}>Megamatcher (server)</strong><br />
                      Neurotechnology's commercial SDK. ISO-compliant, high accuracy.<br />
                      <em style={{ color: '#64748b' }}>Enterprise-grade, needs license and server.</em>
                    </div>
                  )}
                  {idToFaceProvider === 'faceplusplus' && (
                    <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
                      <strong style={{ color: '#e2e8f0' }}>Face++ (cloud)</strong><br />
                      Megvii's face comparison API. $0.00019 per comparison, very cheap.<br />
                      <em style={{ color: '#64748b' }}>Cost-effective, fully integrated, ~95-97% acc.</em>
                    </div>
                  )}
                </div>
                <div style={{ borderTop: '1px solid #334155', paddingTop: 10 }}>
                  <label style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6 }}>THRESHOLD</label>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
                      <span style={{ color: '#94a3b8', fontSize: 11, textAlign: 'right', flex: 1 }}>
                        <strong>Strict</strong><br /><span style={{ fontSize: 9, color: '#64748b' }}>Fewer</span>
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <input type="range" min="0.5" max="0.9" step="0.05" value={threshold} onChange={(e) => setThreshold(parseFloat(e.target.value))} style={{ width: 90 }} />
                        <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>{threshold.toFixed(2)}</span>
                      </div>
                      <span style={{ color: '#94a3b8', fontSize: 11, textAlign: 'left', flex: 1 }}>
                        <strong>Lenient</strong><br /><span style={{ fontSize: 9, color: '#64748b' }}>More</span>
                      </span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', height: 6, width: '100%', borderRadius: 3, background: 'linear-gradient(to right, #ef4444, #eab308, #22c55e)', position: 'relative' }}>
                      <div style={{ position: 'absolute', left: `${((threshold - 0.5) / 0.4) * 100}%`, transform: 'translateX(-50%)', width: 10, height: 10, borderRadius: '50%', background: '#e2e8f0', border: '2px solid #0f172a', transition: 'left 0.15s' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: 11, color: '#64748b' }}>
                      <span style={{ color: '#ef4444' }}>Different</span>
                      <span style={{ color: '#eab308' }}>Unsure</span>
                      <span style={{ color: '#22c55e' }}>Same person</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                    <strong style={{ color: '#ef4444' }}>Strict</strong> (lower threshold) = fewer matches, reduces false accepts. <strong style={{ color: '#22c55e' }}>Lenient</strong> (higher threshold) = more matches, reduces false rejects.
                  </div>
                </div>
              </div>
              {/* Footer items */}
              <div style={{ borderTop: '1px solid #334155', paddingTop: 10 }}>
                <button onClick={() => setShowInfo(!showInfo)}
                  style={{ width: '100%', textAlign: 'left', padding: '2px 0', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', background: 'transparent', color: '#94a3b8' }}>
                  <span style={{ color: '#f59e0b' }}>{showInfo ? '\u25BC' : '\u25B6'} HOW IT WORKS</span>
                </button>
                {showInfo && (
                  <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, marginTop: 6 }}>
                    1. Upload/take two photos (ID + selfie)<br />
                    2. App creates a unique <strong style={{ color: '#e2e8f0' }}>faceprint</strong> for each<br />
                    3. Measures the <strong style={{ color: '#e2e8f0' }}>distance</strong> between them<br />
                    4. <strong style={{ color: '#e2e8f0' }}>Smaller distance</strong> = same person
                  </div>
                )}
              </div>
              <div style={{ borderTop: '1px solid #334155', paddingTop: 10 }}>
                <button onClick={() => setShowTips(!showTips)}
                  style={{ width: '100%', textAlign: 'left', padding: '2px 0', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', background: 'transparent', color: '#94a3b8' }}>
                  <span style={{ color: '#f59e0b' }}>{showTips ? '\u25BC' : '\u25B6'} TIPS</span>
                </button>
                {showTips && (
                  <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.8, marginTop: 6, paddingLeft: 4 }}>
                    <div><span style={{ color: '#22c55e' }}>&#10003;</span> Good lighting, face clearly visible</div>
                    <div><span style={{ color: '#22c55e' }}>&#10003;</span> Straight orientation, not tilted</div>
                    <div><span style={{ color: '#22c55e' }}>&#10003;</span> Similar pose in both photos</div>
                    <div><span style={{ color: '#22c55e' }}>&#10003;</span> No blur, shadows, or obstructions</div>
                    <div><span style={{ color: '#22c55e' }}>&#10003;</span> Image at least 300px / 100KB</div>
                  </div>
                )}
              </div>
            </>
          )}

          {feature === 'liveness' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

              <div style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa' }}>ACTIVE LIVENESS PROVIDER</div>
              <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>Used when you click "Active Liveness"</div>
              <select value={livenessProvider} onChange={(e) => setLivenessProvider(e.target.value as LivenessProvider)}
                style={{ width: '100%', padding: '5px 8px', borderRadius: 4, border: '1px solid #475569', background: '#0f172a', color: '#e2e8f0', fontSize: 12 }}>
                <option value="open_face_liveness">open-face-liveness (browser)</option>
                <option value="aws_detect_faces">AWS DetectFaces (server)</option>
                <option value="aws_rekognition">AWS Rekog Liveness KVS (later)</option>
                <option value="faceplusplus">Face++ Liveness</option>
                <option value="azure_face">Azure Face Liveness</option>
                <option value="hyperverge">HyperVerge</option>
                <option value="didit">Didit</option>
                <option value="iproov">iProov</option>
                <option value="openbiometrics">OpenBiometrics (server)</option>
              </select>
              {livenessProvider !== 'open_face_liveness' && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Server URL</div>
                  <input type="text" value={livenessServerUrl} onChange={(e) => setLivenessServerUrl(e.target.value)}
                    style={{ width: '100%', padding: '5px 8px', borderRadius: 4, border: '1px solid #475569', background: '#0f172a', color: '#e2e8f0', fontSize: 12, boxSizing: 'border-box' }} />
                </>
              )}
              {livenessProvider === 'openbiometrics' && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>OpenBiometrics URL</div>
                  <input type="text" value={obServerUrl} onChange={(e) => setObServerUrl(e.target.value)}
                    style={{ width: '100%', padding: '5px 8px', borderRadius: 4, border: '1px solid #475569', background: '#0f172a', color: '#e2e8f0', fontSize: 12, boxSizing: 'border-box' }} />
                </>
              )}
              <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
                {livenessProvider === 'open_face_liveness' && <><strong style={{ color: '#94a3b8' }}>open-face-liveness</strong> &mdash; Browser-only, $0, MIT. Uses face-api.js for blink detection (EAR) &amp; head-turn challenges entirely in-browser. No server call.</>}
                {livenessProvider === 'aws_detect_faces' && <><strong style={{ color: '#94a3b8' }}>AWS DetectFaces</strong> &mdash; $0.001/check, face attributes, NOT true liveness.</>}
                {livenessProvider === 'aws_rekognition' && <><strong style={{ color: '#94a3b8' }}>AWS Rekog Liveness</strong> &mdash; iBeta L1+L2, ~$0.015/check. Requires KVS + WebSocket setup.</>}
                {livenessProvider === 'faceplusplus' && <><strong style={{ color: '#94a3b8' }}>Face++</strong> &mdash; $0.00019/check, cheapest cloud.</>}
                {livenessProvider === 'azure_face' && <><strong style={{ color: '#94a3b8' }}>Azure Face</strong> &mdash; $0.015/check, 30K free/mo.</>}
                {livenessProvider === 'hyperverge' && <><strong style={{ color: '#94a3b8' }}>HyperVerge</strong> &mdash; ISO 30107-3 L2.</>}
                {livenessProvider === 'didit' && <><strong style={{ color: '#94a3b8' }}>Didit</strong> &mdash; iBeta L1, 500 free/mo.</>}
                {livenessProvider === 'iproov' && <><strong style={{ color: '#94a3b8' }}>iProov</strong> &mdash; Govt-grade, iBeta L2.</>}
                {livenessProvider === 'openbiometrics' && <><strong style={{ color: '#94a3b8' }}>OpenBiometrics</strong> &mdash; Self-hosted platform, MiniFASNet passive + 6 active presets, $0.</>}
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #334155', margin: '4px 0' }} />

              <div style={{ fontSize: 11, fontWeight: 700, color: '#4ade80' }}>PASSIVE LIVENESS</div>
              <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>Always uses heuristic analysis on the backend</div>
              <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
                Captures one frame &rarr; sends to <strong style={{ color: '#e2e8f0' }}>/liveness/passive</strong> &rarr; analyzes sharpness (Laplacian variance), edges (gradient), color depth (channel variance), tonal range (histogram spread), &amp; detail (FFT frequency ratio). Built from scratch — original MiniFASNet ONNX model was broken (identical output for any input), rewrote as pure numpy/PIL heuristics. Needs backend for compute-intensive operations unavailable in-browser. Score 0–20, threshold: <strong style={{ color: '#4ade80' }}>&gt;6</strong> (<strong style={{ color: '#4ade80' }}>&gt;30%</strong>).
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #334155', margin: '4px 0' }} />

              <button onClick={() => setShowLivenessHow(!showLivenessHow)}
                style={{ width: '100%', textAlign: 'left', padding: '2px 0', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', background: 'transparent', color: '#94a3b8' }}>
                <span style={{ color: '#f59e0b' }}>{showLivenessHow ? '\u25BC' : '\u25B6'} HOW LIVENESS DETECTION WORKS</span>
              </button>
              {showLivenessHow && (
                <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.6, marginBottom: 8, marginTop: 4 }}>
                  <strong style={{ color: '#a78bfa' }}>Active</strong>: Tracks blinks &amp; head motion (turn left/right, look up/down). Scores: face size, texture, motion, challenges, blinks. Threshold: <strong style={{ color: '#f59e0b' }}>70/100</strong>.<br />
                  <strong style={{ color: '#4ade80' }}>Passive</strong>: Single-frame heuristic analysis of sharpness, edges, color depth, tonal range &amp; frequency. Score: 0–20. Confidence = score/20. Threshold: <strong style={{ color: '#4ade80' }}>score &gt; 6</strong> (<strong style={{ color: '#4ade80' }}>&gt;30%</strong>).
                </div>
              )}

              <hr style={{ border: 'none', borderTop: '1px solid #334155', margin: '4px 0' }} />

              <button onClick={() => setShowLivenessFails(!showLivenessFails)}
                style={{ width: '100%', textAlign: 'left', padding: '2px 0', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', background: 'transparent', color: '#94a3b8' }}>
                <span style={{ color: '#ef4444' }}>{showLivenessFails ? '\u25BC' : '\u25B6'} WHY LIVENESS FAILS</span>
              </button>
              {showLivenessFails && (
                <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.7, marginTop: 4 }}>
                  <div><span style={{ color: '#ef4444' }}>&#10007;</span> Static photo / printed face &mdash; no micro-movements</div>
                  <div><span style={{ color: '#ef4444' }}>&#10007;</span> Video replay on another screen &mdash; screen artifacts, no texture</div>
                  <div><span style={{ color: '#ef4444' }}>&#10007;</span> Deepfake / real-time face swap &mdash; frame boundary mismatch</div>
                  <div><span style={{ color: '#ef4444' }}>&#10007;</span> Low-res / compressed image &mdash; below 80px face width</div>
                  <div><span style={{ color: '#ef4444' }}>&#10007;</span> No face detected &mdash; occluded, too dark, or no camera</div>
                  <div><span style={{ color: '#ef4444' }}>&#10007;</span> Frozen / static feed &mdash; frame-to-frame delta is zero</div>
                </div>
              )}

            </div>
          )}

          {feature === 'ocr' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#22c55e' }}>OCR PROVIDER</div>
              <select value={ocrProvider} onChange={(e) => setOcrProvider(e.target.value as OcrProvider)}
                style={{ width: '100%', padding: '5px 8px', borderRadius: 4, border: '1px solid #475569', background: '#0f172a', color: '#e2e8f0', fontSize: 12 }}>
                <option value="verihubs">Verihubs OCR (PH IDs)</option>
                <option value="bedrock">Amazon Bedrock Claude</option>
                <option value="textract">AWS Textract</option>
                <option value="zoloz">ZOLOZ eKYC</option>
                <option value="tencent">Tencent Cloud OCR</option>
                <option value="google_docai">Google Document AI</option>
                <option value="mindee">Mindee International OCR</option>
                <option value="azure_di">Azure Document Intelligence</option>
              </select>
              <input type="text" value={ocrServerUrl} onChange={(e) => setOcrServerUrl(e.target.value)}
                style={{ width: '100%', padding: '5px 8px', borderRadius: 4, border: '1px solid #475569', background: '#0f172a', color: '#e2e8f0', fontSize: 12, boxSizing: 'border-box' }} />
              <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
                {ocrProvider === 'verihubs' && <><strong style={{ color: '#94a3b8' }}>Verihubs</strong> &mdash; 9+ PH IDs, auto-detect.</>}
                {ocrProvider === 'bedrock' && <><strong style={{ color: '#94a3b8' }}>Bedrock Claude</strong> &mdash; any ID via prompt.</>}
                {ocrProvider === 'textract' && <><strong style={{ color: '#94a3b8' }}>Textract</strong> &mdash; AWS OCR, limited PH support.</>}
                {ocrProvider === 'zoloz' && <><strong style={{ color: '#94a3b8' }}>ZOLOZ</strong> &mdash; Full eKYC, 11+ PH IDs.</>}
                {ocrProvider === 'tencent' && <><strong style={{ color: '#94a3b8' }}>Tencent</strong> &mdash; Separate APIs per PH ID.</>}
                {ocrProvider === 'google_docai' && <><strong style={{ color: '#94a3b8' }}>Google Doc AI</strong> &mdash; Custom PH extractor.</>}
                {ocrProvider === 'mindee' && <><strong style={{ color: '#94a3b8' }}>Mindee</strong> &mdash; International ID OCR.</>}
                {ocrProvider === 'azure_di' && <><strong style={{ color: '#94a3b8' }}>Azure DI</strong> &mdash; Fast custom model training.</>}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
