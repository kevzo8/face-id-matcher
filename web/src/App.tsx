import React, { useState, useRef, useCallback, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { ImageCapture } from './components/ImageCapture';
import { MatchResult } from './components/MatchResult';
import { BatchMatcher } from './components/BatchMatcher';
import { CsvViewer } from './components/CsvViewer';

type ImageData = {
  url: string;
  element: HTMLImageElement;
} | null;

type DetectionModel = 'fast' | 'accurate';
type Provider = 'local' | 'rekognition' | 'megamatcher' | 'insightface';

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
  } | null>(null);
  const [threshold, setThreshold] = useState(0.7);
  const [detectionModel, setDetectionModel] = useState<DetectionModel>('accurate');
  const [provider, setProvider] = useState<Provider>('insightface');
  const [serverUrl, setServerUrl] = useState('https://kvega-cps221-face-match.hf.space');
  const [mode, setMode] = useState<'single' | 'batch' | 'csv'>('single');
  const [showInfo, setShowInfo] = useState(false);

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
        });
        setMatching(false);
        return;
      }

      const detectorOptions =
        detectionModel === 'fast'
          ? new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.1 })
          : new faceapi.SsdMobilenetv1Options({ minConfidence: 0.1 });

      const idDetection = await faceapi
        .detectSingleFace(idImage.element, detectorOptions)
        .withFaceLandmarks()
        .withFaceDescriptor();

      const selfieDetection = await faceapi
        .detectSingleFace(selfieImage.element, detectorOptions)
        .withFaceLandmarks()
        .withFaceDescriptor();

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

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 16 }}>
      {/* Header */}
      <header style={{ marginBottom: 12, textAlign: 'center' }}>
        <div style={{ fontSize: 'clamp(20px, 5vw, 28px)', fontWeight: 700, marginBottom: 2 }}>Face ID Matcher</div>
        <p style={{ color: '#94a3b8', fontSize: 13 }}>
          Compare any two face photos — selfie vs ID, or ID vs ID — with 1:1 face matching
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
              />
              <ImageCapture
                title="2. Selfie"
                subtitle="Take a selfie, upload a photo, or use another ID"
                image={selfieImage}
                onCapture={setSelfieImage}
                facingMode="user"
                accentColor="#3b82f6"
                icon="person"
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
              <option value="local">face-api.js (browser)</option>
              <option value="insightface">InsightFace (server)</option>
              <option value="rekognition">AWS Rekognition (cloud)</option>
              <option value="megamatcher">Megamatcher (server)</option>
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
                <strong>Slider</strong>: Move toward <strong style={{ color: '#22c55e' }}>Same person</strong> (stricter) for fewer false matches. Move toward <strong style={{ color: '#ef4444' }}>Different</strong> (more lenient) to accept more matches.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
