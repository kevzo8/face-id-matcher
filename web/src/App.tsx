import React, { useState, useRef, useCallback, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { ImageCapture } from './components/ImageCapture';
import { MatchResult } from './components/MatchResult';
import { BatchMatcher } from './components/BatchMatcher';

type ImageData = {
  url: string;
  element: HTMLImageElement;
} | null;

type DetectionModel = 'fast' | 'accurate';
type Provider = 'local' | 'rekognition';

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
  const [threshold, setThreshold] = useState(0.5);
  const [detectionModel, setDetectionModel] = useState<DetectionModel>('accurate');
  const [provider, setProvider] = useState<Provider>('local');
  const [serverUrl, setServerUrl] = useState('http://localhost:8000');
  const [mode, setMode] = useState<'single' | 'batch'>('single');
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
      if (provider === 'rekognition') {
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
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || `Server error: ${res.status}`);
        }

        const data = await res.json();
        setResult({
          distance: 1 - (data.similarity || 0),
          similarity: (data.similarity || 0) * 100,
          match: (data.similarity || 0) >= (data.threshold || 0.9),
          threshold: data.threshold || 0.9,
        });
        setMatching(false);
        return;
      }

      const detectorOptions =
        detectionModel === 'fast'
          ? new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.3 })
          : new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 });

      const idDetection = await faceapi
        .detectSingleFace(idImage.element, detectorOptions)
        .withFaceLandmarks()
        .withFaceDescriptor();

      const selfieDetection = await faceapi
        .detectSingleFace(selfieImage.element, detectorOptions)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!idDetection) {
        setResult({ distance: 1, similarity: 0, match: false, threshold, error: 'No face detected in the ID photo' });
        setMatching(false);
        alert('No face detected in the ID photo. Try a clearer photo with better lighting.');
        return;
      }

      if (!selfieDetection) {
        setResult({ distance: 1, similarity: 0, match: false, threshold, error: 'No face detected in the selfie' });
        setMatching(false);
        alert('No face detected in the selfie. Try a clearer photo facing the camera directly.');
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
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 16 }}>
      {/* Header */}
      <header style={{ marginBottom: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Face ID Matcher</div>
        <p style={{ color: '#94a3b8', fontSize: 13 }}>
          Compare any two face photos — selfie vs ID, or ID vs ID — with 1:1 face matching
        </p>
      </header>

      {/* Settings bar — always visible */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          marginBottom: 12,
          flexWrap: 'wrap',
          padding: '8px 16px',
          background: '#1e293b',
          borderRadius: 8,
        }}
      >
        {/* Provider */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#94a3b8', fontSize: 12 }}>Provider:</span>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as Provider)}
            style={{
              padding: '4px 8px',
              borderRadius: 4,
              border: '1px solid #475569',
              background: '#0f172a',
              color: '#e2e8f0',
              fontSize: 12,
            }}
          >
            <option value="local">face-api.js (browser)</option>
            <option value="rekognition">AWS Rekognition (cloud)</option>
          </select>
        </label>

        {/* Detection model (local only) */}
        {provider === 'local' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#94a3b8', fontSize: 12 }}>Detection:</span>
            <select
              value={detectionModel}
              onChange={(e) => setDetectionModel(e.target.value as DetectionModel)}
              style={{
                padding: '4px 8px',
                borderRadius: 4,
                border: '1px solid #475569',
                background: '#0f172a',
                color: '#e2e8f0',
                fontSize: 12,
              }}
            >
              <option value="accurate">SSD MobileNet (accurate, slower)</option>
              <option value="fast">TinyFaceDetector (fast, less accurate)</option>
            </select>
          </label>
        )}

        {/* Server URL (cloud only) */}
        {provider === 'rekognition' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#94a3b8', fontSize: 12 }}>Server:</span>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: 4,
                border: '1px solid #475569',
                background: '#0f172a',
                color: '#e2e8f0',
                fontSize: 12,
                width: 160,
              }}
            />
          </label>
        )}

        {/* Threshold (shared) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#94a3b8', fontSize: 12, textAlign: 'right' }}>
              <strong>Strict</strong><br /><span style={{ fontSize: 9, color: '#64748b' }}>Fewer matches</span>
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <input
                type="range"
                min="0.3"
                max="0.7"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                style={{ width: 80 }}
              />
              <span style={{ color: '#e2e8f0', fontSize: 11, fontWeight: 600 }}>
                {threshold.toFixed(2)}
              </span>
            </div>
            <span style={{ color: '#94a3b8', fontSize: 12, textAlign: 'left' }}>
              <strong>Lenient</strong><br /><span style={{ fontSize: 9, color: '#64748b' }}>More matches</span>
            </span>
          </label>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              height: 6,
              width: 200,
              borderRadius: 3,
              background: 'linear-gradient(to right, #22c55e, #eab308, #ef4444)',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: `${((threshold - 0.3) / 0.4) * 100}%`,
                transform: 'translateX(-50%)',
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#e2e8f0',
                border: '2px solid #0f172a',
                transition: 'left 0.15s',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: 200, fontSize: 10, color: '#64748b' }}>
            <span style={{ color: '#22c55e' }}>Same person</span>
            <span style={{ color: '#eab308' }}>Unsure</span>
            <span style={{ color: '#ef4444' }}>Different</span>
          </div>
        </div>
      </div>

      {/* Mode toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 12 }}>
        {(['single', 'batch'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: '5px 16px',
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              background: mode === m ? '#3b82f6' : '#1e293b',
              color: mode === m ? '#fff' : '#64748b',
            }}
          >
            {m === 'single' ? '\u2696 Single Compare' : '\u2630 Batch Upload'}
          </button>
        ))}
      </div>

      {!modelsLoaded && (
        <p style={{ color: '#f59e0b', textAlign: 'center', marginBottom: 12, fontSize: 13 }}>Loading face recognition models...</p>
      )}

      {/* Info toggle */}
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <button
          onClick={() => setShowInfo(!showInfo)}
          style={{
            padding: '3px 12px',
            fontSize: 11,
            border: '1px solid #475569',
            borderRadius: 12,
            cursor: 'pointer',
            background: 'transparent',
            color: '#64748b',
          }}
        >
          {showInfo ? '\u25BC' : '\u25B6'} How this works
        </button>
      </div>

      {showInfo && (
        <div
          style={{
            background: '#1e293b',
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
            fontSize: 12,
            lineHeight: 1.6,
            color: '#94a3b8',
            maxWidth: 600,
            margin: '0 auto 12px',
          }}
        >
          <strong style={{ color: '#e2e8f0' }}>How Face Matching Works</strong><br />
          1. Upload or take two photos (e.g. ID card + selfie)<br />
          2. The app detects faces and creates a unique <strong style={{ color: '#e2e8f0' }}>faceprint</strong> (128 numbers) for each<br />
          3. It measures the <strong style={{ color: '#e2e8f0' }}>distance</strong> between the two faceprints<br />
          4. <strong style={{ color: '#e2e8f0' }}>Smaller distance</strong> = more likely the same person<br /><br />
          <strong style={{ color: '#e2e8f0' }}>The Slider</strong> controls how strict the comparison is:<br />
          Move left toward <strong style={{ color: '#22c55e' }}>Same person</strong> for fewer false matches (recommended for KYC),<br />
          Move right toward <strong style={{ color: '#ef4444' }}>Different</strong> to allow more matches even with differences
        </div>
      )}

      <div style={{ display: mode === 'batch' ? 'block' : 'none' }}>
        <BatchMatcher
          detectionModel={detectionModel}
          provider={provider}
          serverUrl={serverUrl}
          threshold={threshold}
          onBack={() => setMode('single')}
        />
      </div>
      <div style={{ display: mode === 'single' ? 'block' : 'none' }}>
        <>

      {/* Capture panels */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginBottom: 16,
        }}
      >
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          justifyContent: 'center',
          marginBottom: 12,
          flexWrap: 'wrap',
        }}
      >
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
            transition: 'background 0.2s',
          }}
        >
          {matching ? 'Matching...' : '\u2696 Compare Faces'}
        </button>

        <button
          onClick={handleReset}
          style={{
            padding: '10px 20px',
            fontSize: 13,
            border: '1px solid #475569',
            borderRadius: 8,
            cursor: 'pointer',
            background: 'transparent',
            color: '#94a3b8',
          }}
        >
          Reset
        </button>
      </div>

      {/* Result */}
      {result && <MatchResult result={result} />}

      {/* Footer */}
      <footer style={{ marginTop: 12, textAlign: 'center', color: '#475569', fontSize: 11 }}>
        {provider === 'rekognition'
          ? 'Using AWS Rekognition cloud API — images sent to server for matching'
          : `Powered by face-api.js (${detectionModel === 'fast' ? 'TinyFaceDetector' : 'SSD MobileNet'} + 128D face descriptors) — all processing in browser. No images uploaded.`}
      </footer>
        </>
      </div>
    </div>
  );
}
