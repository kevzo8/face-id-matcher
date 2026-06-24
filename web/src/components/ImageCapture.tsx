import React, { useState, useRef, useCallback, useEffect } from 'react';

type ImageData = {
  url: string;
  element: HTMLImageElement;
} | null;

interface ImageCaptureProps {
  title: string;
  subtitle: string;
  image: ImageData;
  onCapture: (data: ImageData) => void;
  facingMode: 'user' | 'environment';
  accentColor: string;
  icon: 'card' | 'person';
}

export function ImageCapture({ title, subtitle, image, onCapture, facingMode, accentColor, icon }: ImageCaptureProps) {
  const [mode, setMode] = useState<'idle' | 'camera' | 'preview'>(
    image ? 'preview' : 'idle',
  );
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Sync mode when image prop changes externally (e.g., Reset button)
  useEffect(() => {
    if (!image && mode === 'preview') {
      setMode('idle');
    }
  }, [image, mode]);

  // Enumerate cameras on mount (labels available after permission grant)
  const refreshCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      setCameras(videoDevices);
      if (videoDevices.length > 0 && !selectedCamera) {
        setSelectedCamera(videoDevices[0].deviceId);
      }
    } catch {
      // ignore
    }
  }, [selectedCamera]);

  useEffect(() => {
    refreshCameras();
  }, [refreshCameras]);

  const startCamera = useCallback(async (deviceId?: string) => {
    setError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Camera API not available. Use Upload File instead.');
      return;
    }

    const constraints: MediaStreamConstraints[] = [];
    if (deviceId) {
      constraints.push({ video: { deviceId: { exact: deviceId } }, audio: false });
    } else {
      constraints.push(
        { video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
        { video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
        { video: { width: 640, height: 480 }, audio: false },
        { video: true, audio: false },
      );
    }

    let lastError: string | null = null;
    for (const c of constraints) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(c);
        streamRef.current = stream;
        setMode('camera');
        refreshCameras();
        return;
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
      }
    }

    setError(
      lastError
        ? `Camera error: ${lastError}. Try selecting a different camera or use Upload File.`
        : 'No camera available. Use Upload File instead.',
    );
  }, [facingMode, refreshCameras]);

  // Attach stream to video element once mode switches to 'camera'
  useEffect(() => {
    if (mode !== 'camera' || !streamRef.current || !videoRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    video.muted = true;
    video.playsInline = true;
    video.play().catch((e) => console.error('Video play error:', e));
  }, [mode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const switchCamera = useCallback(async (deviceId: string) => {
    setSelectedCamera(deviceId);
    stopCamera();
    await startCamera(deviceId);
  }, [stopCamera, startCamera]);

  const captureFromCamera = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setError('Camera not ready yet — wait a moment and try again.');
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    stopCamera();
    processImage(dataUrl);
  }, [stopCamera, facingMode]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      processImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const processImage = useCallback((dataUrl: string) => {
    const img = new Image();
    img.onload = () => {
      onCapture({ url: dataUrl, element: img });
      setMode('preview');
    };
    img.src = dataUrl;
  }, [onCapture]);

  const handleRetake = useCallback(() => {
    onCapture(null);
    setMode('idle');
    setError(null);
  }, [onCapture]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const iconSvg = icon === 'card' ? (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <circle cx="7" cy="15" r="1.5" fill="currentColor" />
      <line x1="11" y1="14" x2="17" y2="14" />
      <line x1="11" y1="16" x2="15" y2="16" />
    </svg>
  ) : (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );

  const checkSvg = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );

  return (
    <div
      style={{
        background: '#1e293b',
        borderRadius: 10,
        padding: 14,
        border: `2px solid ${image ? accentColor : '#334155'}`,
        borderTopWidth: 3,
        borderTopColor: accentColor,
        transition: 'border-color 0.3s',
      }}
    >
      {/* Header with icon */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            borderRadius: 10,
            background: `${accentColor}22`,
            color: accentColor,
            flexShrink: 0,
          }}
        >
          {image ? checkSvg : iconSvg}
        </div>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 2 }}>{title}</h2>
          <p style={{ color: '#64748b', fontSize: 13 }}>{subtitle}</p>
        </div>
      </div>

      <div style={{ height: 1, background: '#334155', margin: '12px 0' }} />

      {error && (
        <div
          style={{
            background: '#7f1d1d',
            color: '#fca5a5',
            padding: 10,
            borderRadius: 8,
            marginBottom: 12,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {mode === 'idle' && (
        <div>
          {cameras.length > 1 && (
            <div style={{ marginBottom: 12 }}>
              <select
                value={selectedCamera}
                onChange={(e) => setSelectedCamera(e.target.value)}
                style={{
                  width: '100%',
                  padding: 8,
                  background: '#0f172a',
                  color: '#e2e8f0',
                  border: '1px solid #334155',
                  borderRadius: 6,
                  fontSize: 13,
                }}
              >
                {cameras.map((cam, i) => (
                  <option key={cam.deviceId} value={cam.deviceId}>
                    {cam.label || `Camera ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={() => startCamera(selectedCamera || undefined)}
              style={{
                padding: '10px 20px',
                border: `1px solid ${accentColor}`,
                borderRadius: 8,
                background: 'transparent',
                color: accentColor,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Take Photo
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '10px 20px',
                border: '1px solid #475569',
                borderRadius: 8,
                background: 'transparent',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      )}

      {mode === 'camera' && (
        <div>
          <div
            style={{
              position: 'relative',
              borderRadius: 8,
              overflow: 'hidden',
              background: '#000',
              minHeight: 200,
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                display: 'block',
                transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
              }}
            />
            {/* Camera frame overlay */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '60%',
                height: '70%',
                border: `2px dashed ${accentColor}88`,
                borderRadius: 12,
                pointerEvents: 'none',
              }}
            />
          </div>

          {cameras.length > 1 && (
            <div style={{ marginTop: 8 }}>
              <select
                value={selectedCamera}
                onChange={(e) => switchCamera(e.target.value)}
                style={{
                  width: '100%',
                  padding: 6,
                  background: '#0f172a',
                  color: '#e2e8f0',
                  border: '1px solid #334155',
                  borderRadius: 6,
                  fontSize: 12,
                }}
              >
                {cameras.map((cam, i) => (
                  <option key={cam.deviceId} value={cam.deviceId}>
                    {cam.label || `Camera ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <button
              onClick={captureFromCamera}
              style={{
                padding: '10px 24px',
                border: 'none',
                borderRadius: 8,
                background: accentColor,
                color: '#fff',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" fill="currentColor" />
              </svg>
              Capture
            </button>
            <button
              onClick={() => {
                stopCamera();
                setMode('idle');
              }}
              style={{
                padding: '10px 24px',
                border: '1px solid #475569',
                borderRadius: 8,
                background: 'transparent',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === 'preview' && image && (
        <div>
          <div
            style={{
              borderRadius: 8,
              overflow: 'hidden',
              background: '#0f172a',
              border: `1px solid ${accentColor}44`,
            }}
          >
            <img
              src={image.url}
              alt={title}
              style={{ width: '100%', display: 'block', maxHeight: 220, objectFit: 'contain' }}
            />
          </div>
          {/* Status badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 8,
              padding: '4px 12px',
              borderRadius: 20,
              background: `${accentColor}22`,
              color: accentColor,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {checkSvg}
            {icon === 'card' ? 'ID photo captured' : 'Selfie captured'}
          </div>
          <button
            onClick={handleRetake}
            style={{
              marginTop: 8,
              padding: '8px 20px',
              border: '1px solid #475569',
              borderRadius: 8,
              background: 'transparent',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Retake / Re-upload
          </button>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
