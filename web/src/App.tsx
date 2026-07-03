import React, { useState, useRef, useCallback, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { ImageCapture } from './components/ImageCapture';
import { MatchResult } from './components/MatchResult';
import { BatchMatcher } from './components/BatchMatcher';
import { CsvViewer } from './components/CsvViewer';
import Presentation from './components/Presentation';

type ImageData = {
  url: string;
  element: HTMLImageElement;
  width: number;
  height: number;
  size: number;
} | null;

type DetectionModel = 'fast' | 'accurate';
type Provider = 'local' | 'rekognition' | 'megamatcher' | 'insightface' | 'faceplusplus';
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
  const [provider, setProvider] = useState<Provider>('rekognition');
  const [serverUrl, setServerUrl] = useState('https://face-id-matcher.onrender.com');
  const [mode, setMode] = useState<'single' | 'batch' | 'csv'>('single');
  const [showInfo, setShowInfo] = useState(false);
  const [showTips, setShowTips] = useState(true);
  const [showPresentation, setShowPresentation] = useState(false);
  const [initialSlide, setInitialSlide] = useState(0);
  const [idFaceBox, setIdFaceBox] = useState<FaceBox | null>(null);
  const [selfieFaceBox, setSelfieFaceBox] = useState<FaceBox | null>(null);

  useEffect(() => {
    function handleRoute() {
      const match = window.location.pathname.match(/^\/presentation\/?(\d+)?$/);
      if (match) {
        setShowPresentation(true);
        setInitialSlide(match[1] ? parseInt(match[1], 10) : 0);
      } else {
        setShowPresentation(false);
      }
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
    if (provider === 'rekognition' || provider === 'faceplusplus') {
      setServerUrl('https://face-id-matcher.onrender.com');
    } else if (provider === 'insightface' || provider === 'megamatcher') {
      setServerUrl('https://kvega-cps221-face-match.hf.space');
    }
  }, [provider]);

  const handleMatch = useCallback(async () => {
    if (!idImage || !selfieImage || !modelsLoaded) return;
    setMatching(true);
    setResult(null);

    try {
      if (provider !== 'local') {
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
            provider,
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
  }, [idImage, selfieImage, modelsLoaded, threshold, detectionModel, provider, serverUrl]);

  const handleReset = () => {
    setIdImage(null);
    setSelfieImage(null);
    setResult(null);
    setIdFaceBox(null);
    setSelfieFaceBox(null);
  };

  const step = !idImage && !selfieImage ? 1 : !idImage || !selfieImage ? 2 : 3;

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
    return <Presentation initialSlide={initialSlide} onClose={() => { setShowPresentation(false); window.history.pushState(null, '', '/'); }} />;
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 16 }}>
      {/* Header */}
      <header style={{ marginBottom: 12, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <button
            onClick={() => { window.history.pushState(null, '', '/presentation/0'); setShowPresentation(true); setInitialSlide(0); }}
            style={{
              padding: '6px 14px', fontSize: 12, fontWeight: 600,
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              color: '#fff', border: 'none', borderRadius: 6,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 4 }}><polygon points="5 3 19 12 5 21 5 3" /></svg> Present
          </button>
        </div>
        <div style={{ fontSize: 'clamp(20px, 5vw, 28px)', fontWeight: 700, marginBottom: 2 }}>Face ID Matcher POC</div>
        <p style={{ color: '#94a3b8', fontSize: 13 }}>
          Compare any two face photos — selfie vs ID, selfie vs selfie, or ID vs ID — with 1:1 face matching
        </p>
      </header>

      {/* Mode tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
        {(['single', 'batch', 'csv'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              flex: '1 1 auto',
              padding: '5px 16px',
              fontSize: 'clamp(11px, 3vw, 13px)',
              fontWeight: 600,
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              background: mode === m ? '#3b82f6' : '#1e293b',
              color: mode === m ? '#fff' : '#64748b',
            }}
          >
            {m === 'single' ? '\u2696 Single Compare' : m === 'batch' ? '\u2630 Batch Upload' : '\u2630 View CSV'}
          </button>
        ))}
      </div>

      {!modelsLoaded && (
        <p style={{ color: '#f59e0b', textAlign: 'center', marginBottom: 12, fontSize: 13 }}>Loading face recognition models...</p>
      )}

      {/* Two-column layout */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* === Left: Main content === */}
        <div style={{ flex: '1 1 0', minWidth: 280 }}>
          <div style={{ display: mode === 'batch' ? 'block' : 'none' }}>
            <BatchMatcher
              detectionModel={detectionModel}
              provider={provider}
              serverUrl={serverUrl}
              threshold={threshold}
              onBack={() => setMode('single')}
            />
          </div>
          <div style={{ display: mode === 'csv' ? 'block' : 'none' }}>
            <CsvViewer />
          </div>
          <div style={{ display: mode === 'single' ? 'block' : 'none' }}>
            {/* Capture panels */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12, marginBottom: 12 }}>
              <ImageCapture
                title="1. ID Photo"
                subtitle="Upload or take a photo of an ID card"
                image={idImage}
                onCapture={setIdImage}
                facingMode="environment"
                accentColor="#22c55e"
                icon="card"
                faceBox={idFaceBox}
              />
              <ImageCapture
                title="2. Selfie"
                subtitle="Take a selfie, upload a photo, or use another ID"
                image={selfieImage}
                onCapture={setSelfieImage}
                facingMode="user"
                accentColor="#3b82f6"
                icon="person"
                faceBox={selfieFaceBox}
              />
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
              <button
                onClick={handleMatch}
                disabled={!idImage || !selfieImage || matching || !modelsLoaded}
                style={{
                  padding: '10px 28px',
                  fontSize: 15,
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: 8,
                  cursor: idImage && selfieImage && !matching && modelsLoaded ? 'pointer' : 'not-allowed',
                  background: idImage && selfieImage && !matching && modelsLoaded ? '#a855f7' : '#334155',
                  color: '#fff',
                }}
              >
                {matching ? 'Matching...' : '\u2696 Compare Faces'}
              </button>
              <button onClick={handleReset} style={{ padding: '10px 20px', fontSize: 13, border: '1px solid #475569', borderRadius: 8, cursor: 'pointer', background: 'transparent', color: '#94a3b8' }}>
                Reset
              </button>
            </div>

            {/* Result */}
            {result && <MatchResult result={result} />}
          </div>
        </div>

        {/* === Right: Sidebar === */}
        <div style={{ flex: '0 0 300px', background: '#1e293b', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Provider */}
          <div>
            <label style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>PROVIDER</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as Provider)}
              style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid #475569', background: '#0f172a', color: '#e2e8f0', fontSize: 13 }}
            >
              <option value="rekognition">AWS Rekognition (cloud)</option>
              <option value="insightface">InsightFace (server)</option>
              <option value="faceplusplus">Face++ (cloud)</option>
              <option value="megamatcher">Megamatcher (server)</option>
              <option value="local">face-api.js (browser)</option>
            </select>
          </div>

          {/* Detection model (local only) */}
          {provider === 'local' && (
            <div>
              <label style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>DETECTION</label>
              <select
                value={detectionModel}
                onChange={(e) => setDetectionModel(e.target.value as DetectionModel)}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid #475569', background: '#0f172a', color: '#e2e8f0', fontSize: 13 }}
              >
                <option value="accurate">SSD MobileNet (accurate, slower)</option>
                <option value="fast">TinyFaceDetector (fast, less accurate)</option>
              </select>
            </div>
          )}

          {/* Server URL (server providers) */}
          {provider !== 'local' && (
            <div>
              <label style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>SERVER URL</label>
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid #475569', background: '#0f172a', color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>
          )}

          {/* Threshold */}
          <div>
            <label style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6 }}>THRESHOLD</label>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              {/* All providers: lower threshold = stricter, higher threshold = more lenient */}
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
          </div>

          {/* Provider explanation */}
          <div style={{ borderTop: '1px solid #334155', paddingTop: 10 }}>
            {provider === 'local' && (
              <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
                <strong style={{ color: '#e2e8f0' }}>face-api.js (browser)</strong><br />
                Runs entirely in your browser. No data leaves your PC.<br />
                Uses {detectionModel === 'fast' ? 'TinyFaceDetector' : 'SSD MobileNet'} with 128-dim face descriptors.<br />
                <em style={{ color: '#64748b' }}>Fast (instant), free, good for quick testing.</em>
              </div>
            )}
            {provider === 'insightface' && (
              <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
                <strong style={{ color: '#e2e8f0' }}>InsightFace (server)</strong><br />
                ONNX-based face matching. <strong>High accuracy (~95-98%)</strong>.<br />
                <em style={{ color: '#f59e0b' }}>Slower on HF Spaces (CPU, cold starts).<br />
                Run locally + ngrok for faster results.</em>
              </div>
            )}
            {provider === 'rekognition' && (
              <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
                <strong style={{ color: '#e2e8f0' }}>AWS Rekognition (cloud)</strong><br />
                Amazon's cloud API. Highest accuracy (~99%).<br />
                <em style={{ color: '#64748b' }}>Costs $0.001 per comparison. Requires AWS credentials.</em>
              </div>
            )}
            {provider === 'megamatcher' && (
              <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
                <strong style={{ color: '#e2e8f0' }}>Megamatcher (server)</strong><br />
                Licensed SDK from Neurotechnology. Already paid for by SVI.<br />
                <em style={{ color: '#64748b' }}>Zero marginal cost. Needs SDK jars in batch-java/lib/.</em>
              </div>
            )}
          </div>

          {/* How it works (collapsible) */}
          <div style={{ borderTop: '1px solid #334155', paddingTop: 10 }}>
            <button
              onClick={() => setShowInfo(!showInfo)}
              style={{ width: '100%', textAlign: 'left', padding: '2px 0', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', background: 'transparent', color: '#94a3b8' }}
            >
              {showInfo ? '\u25BC' : '\u25B6'} HOW IT WORKS
            </button>
            {showInfo && (
              <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, marginTop: 6 }}>
                1. Upload/take two photos (ID + selfie)<br />
                2. App creates a unique <strong style={{ color: '#e2e8f0' }}>faceprint</strong> for each<br />
                3. Measures the <strong style={{ color: '#e2e8f0' }}>distance</strong> between them<br />
                4. <strong style={{ color: '#e2e8f0' }}>Smaller distance</strong> = same person<br /><br />
                <strong style={{ color: '#ef4444' }}>Strict</strong> (lower threshold) = fewer matches, reduces false accepts. <strong style={{ color: '#22c55e' }}>Lenient</strong> (higher threshold) = more matches, reduces false rejects.
              </div>
            )}
          </div>

          {/* Tips (collapsible) */}
          <div style={{ borderTop: '1px solid #334155', paddingTop: 10 }}>
            <button
              onClick={() => setShowTips(!showTips)}
              style={{ width: '100%', textAlign: 'left', padding: '2px 0', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', background: 'transparent', color: '#94a3b8' }}
            >
              <span style={{ color: '#f59e0b' }}>{showTips ? '\u25BC' : '\u25B6'} TIPS FOR BEST RESULTS</span>
            </button>
            {showTips && (
              <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.8, marginTop: 6, paddingLeft: 4 }}>
                <div><span style={{ color: '#22c55e' }}>&#10003;</span> Good lighting, face clearly visible</div>
                <div><span style={{ color: '#22c55e' }}>&#10003;</span> Straight orientation, not tilted</div>
                <div><span style={{ color: '#22c55e' }}>&#10003;</span> Similar pose in both photos</div>
                <div><span style={{ color: '#22c55e' }}>&#10003;</span> No blur, shadows, or obstructions</div>
                <div><span style={{ color: '#22c55e' }}>&#10003;</span> No sunglasses, masks, or extreme angles</div>
                <div><span style={{ color: '#22c55e' }}>&#10003;</span> Image at least 300px / 100KB</div>
                <div style={{ marginTop: 4, color: '#64748b', fontSize: 10 }}>Small or compressed images degrade accuracy.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
