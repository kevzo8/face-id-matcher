import React, { useState, useRef, useCallback, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { ImageCapture } from './components/ImageCapture';
import { MatchResult } from './components/MatchResult';

type ImageData = {
  url: string;
  element: HTMLImageElement;
} | null;

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
  } | null>(null);
  const [threshold, setThreshold] = useState(0.45);

  useEffect(() => {
    async function loadModels() {
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
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
      const detectorOptions = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 });

      const idDetection = await faceapi
        .detectSingleFace(idImage.element, detectorOptions)
        .withFaceLandmarks()
        .withFaceDescriptor();

      const selfieDetection = await faceapi
        .detectSingleFace(selfieImage.element, detectorOptions)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!idDetection) {
        setResult({
          distance: 1,
          similarity: 0,
          match: false,
          threshold,
        });
        setMatching(false);
        alert('No face detected in the ID photo. Try a clearer photo with better lighting.');
        return;
      }

      if (!selfieDetection) {
        setResult({
          distance: 1,
          similarity: 0,
          match: false,
          threshold,
        });
        setMatching(false);
        alert('No face detected in the selfie. Try a clearer photo facing the camera directly.');
        return;
      }

      const distance = faceapi.euclideanDistance(
        idDetection.descriptor,
        selfieDetection.descriptor,
      );

      const similarity = Math.max(0, Math.min(100, (1 - distance) * 100));
      const match = distance < threshold;

      setResult({ distance, similarity, match, threshold });
    } catch (e) {
      console.error('Match error:', e);
    }
    setMatching(false);
  }, [idImage, selfieImage, modelsLoaded, threshold]);

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

        {/* Step indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
          {[
            { num: 1, label: 'ID Photo', color: '#22c55e', done: !!idImage },
            { num: 2, label: 'Selfie', color: '#3b82f6', done: !!selfieImage },
            { num: 3, label: 'Compare', color: '#a855f7', done: !!result },
          ].map((s) => (
            <div
              key={s.num}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 10px',
                borderRadius: 16,
                background: s.done ? `${s.color}22` : step === s.num ? `${s.color}11` : '#1e293b',
                border: `1px solid ${s.done ? s.color : step === s.num ? s.color + '88' : '#334155'}`,
                fontSize: 12,
                color: s.done || step === s.num ? s.color : '#64748b',
                fontWeight: s.done || step === s.num ? 600 : 400,
                transition: 'all 0.3s',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: s.done ? s.color : 'transparent',
                  border: `1px solid ${s.color}`,
                  color: s.done ? '#fff' : s.color,
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {s.done ? '\u2713' : s.num}
              </span>
              {s.label}
            </div>
          ))}
        </div>

        {!modelsLoaded && (
          <p style={{ color: '#f59e0b', marginTop: 8, fontSize: 13 }}>Loading face recognition models...</p>
        )}
      </header>

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
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#94a3b8', fontSize: 13 }}>Strict</span>
          <input
            type="range"
            min="0.3"
            max="0.7"
            step="0.05"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            style={{ width: 100 }}
          />
          <span style={{ color: '#94a3b8', fontSize: 13 }}>Lenient</span>
          <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13, minWidth: 36 }}>
            {threshold.toFixed(2)}
          </span>
        </label>

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
        Powered by face-api.js (SSD MobileNet + 128D face descriptors, Euclidean distance) — all processing in browser. No images uploaded.
      </footer>
    </div>
  );
}
