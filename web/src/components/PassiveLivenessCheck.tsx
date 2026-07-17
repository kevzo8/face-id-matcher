import { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';

interface PassiveResult {
  is_real: boolean;
  confidence: number;
  score: number;
  error?: string;
  details?: string;
  snapshotUrl?: string;
  breakdown?: { label: string; pts: number }[];
  info?: { label: string; value: string }[];
  provider?: string;
}

interface Props {
  onComplete: (result: PassiveResult) => void;
  serverUrl: string;
  provider?: 'faceplusplus' | 'faceplusplus_hybrid' | 'aws' | 'aws_hybrid' | 'heuristic' | 'aws_detect_labels' | 'aws_detect_labels_hybrid' | 'aws_detect_labels_heuristic';
  faceplusServerUrl?: string;
  awsServerUrl?: string;
}

const btnStyle: React.CSSProperties = {
  padding: '2px 8px', fontSize: 10, border: '1px solid #334155', borderRadius: 4,
  cursor: 'pointer', background: '#1e293b', color: '#cbd5e1', lineHeight: 1.6,
};

export default function PassiveLivenessCheck({ onComplete, serverUrl, provider = 'heuristic', faceplusServerUrl, awsServerUrl }: Props) {
  const [phase, setPhase] = useState<'preview' | 'detecting'>('preview');
  const [status, setStatus] = useState('Opening camera...');
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const doneRef = useRef(false);
  const detectingRef = useRef(false);

  const refreshCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput')
        .sort((a, b) => {
          const aV = /obs|virtual|streamlabs/i.test(a.label) ? 1 : 0;
          const bV = /obs|virtual|streamlabs/i.test(b.label) ? 1 : 0;
          return aV - bV;
        });
      setCameras(videoDevices);
      if (videoDevices.length > 0 && !selectedCamera) {
        setSelectedCamera(videoDevices[0].deviceId);
      }
    } catch {
      // ignore
    }
  }, [selectedCamera]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async (deviceId?: string) => {
    setError(null);
    const constraints: MediaStreamConstraints[] = [];
    if (deviceId) {
      constraints.push({ video: { deviceId: { exact: deviceId } }, audio: false });
    } else {
      constraints.push(
        { video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
        { video: { width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
        { video: true, audio: false },
      );
    }
    let stream: MediaStream | null = null;
    for (const c of constraints) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(c);
        break;
      } catch {
        // try next constraint
      }
    }
    if (!stream) {
      setError('Camera access denied. No available camera found.');
      return;
    }
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.muted = true;
      videoRef.current.playsInline = true;
      videoRef.current.play().catch(() => {});
    }
    refreshCameras();
  }, [refreshCameras]);

  const switchCamera = useCallback(async (deviceId: string) => {
    setSelectedCamera(deviceId);
    stopCamera();
    await startCamera(deviceId);
  }, [stopCamera, startCamera]);

  // Open camera on mount in preview phase
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const devices = await navigator.mediaDevices.enumerateDevices();
      if (cancelled) return;
      const sorted = devices.filter(d => d.kind === 'videoinput')
        .sort((a, b) => {
          const aV = /obs|virtual|streamlabs/i.test(a.label) ? 1 : 0;
          const bV = /obs|virtual|streamlabs/i.test(b.label) ? 1 : 0;
          return aV - bV;
        });
      setCameras(sorted);
      const deviceId = sorted.length > 0 ? sorted[0].deviceId : undefined;
      setSelectedCamera(deviceId || '');
      // Open with the preferred device, not with the stale selectedCamera value
      const constraints: MediaStreamConstraints[] = [];
      if (deviceId) {
        constraints.push({ video: { deviceId: { exact: deviceId } }, audio: false });
      } else {
        constraints.push(
          { video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
          { video: { width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
          { video: true, audio: false },
        );
      }
      for (const c of constraints) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia(c);
          if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.muted = true;
            videoRef.current.playsInline = true;
            videoRef.current.play().catch(() => {});
          }
          break;
        } catch { /* try next */ }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Run detection when phase transitions to 'detecting'
  useEffect(() => {
    if (phase !== 'detecting' || detectingRef.current) return;
    detectingRef.current = true;

    let cancelled = false;

    async function run() {
      try {
        const stream = streamRef.current;
        if (!stream) {
          setError('Camera stream lost');
          return;
        }
        const video = videoRef.current;
        if (!video) return;

        setStatus('Detecting face...');

        const startTime = Date.now();
        const TIMEOUT_MS = 5_000;
        let frameCount = 0;

        while (Date.now() - startTime < TIMEOUT_MS) {
          if (cancelled || doneRef.current) return;
          await new Promise(r => setTimeout(r, 33));
          frameCount++;

          const detections = await faceapi.detectAllFaces(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 })).withFaceLandmarks();
          if (detections.length > 0 && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) continue;

            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            let best = detections[0];
            let bestDist = Infinity;
            for (const d of detections) {
              const b = d.detection.box;
              const dist = Math.abs(b.x + b.width / 2 - cx) + Math.abs(b.y + b.height / 2 - cy);
              if (dist < bestDist) { bestDist = dist; best = d; }
            }
            const det = best;
            const box = det.detection.box;

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 3;
            ctx.strokeRect(box.x, box.y, box.width, box.height);

            const snapshotUrl = canvas.toDataURL('image/jpeg', 0.7);

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const fullB64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];

            const bbox = [box.x / canvas.width, box.y / canvas.height, box.width / canvas.width, box.height / canvas.height];

            setStatus('Analyzing...');
            doneRef.current = true;

            stream.getTracks().forEach(t => t.stop());

            if (provider === 'aws_detect_labels_heuristic') {
              const [passiveRes, objectsRes] = await Promise.all([
                fetch(`${serverUrl.replace(/\/+$/, '')}/liveness/passive`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ image: fullB64, bbox, provider: 'heuristic' }),
                }),
                fetch(`${serverUrl.replace(/\/+$/, '')}/liveness/detect-objects`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ image: fullB64 }),
                }),
              ]);
              const [passiveData, objectsData] = await Promise.all([passiveRes.json(), objectsRes.json()]);

              const info: { label: string; value: string }[] = [];
              if (objectsData.raw_labels) {
                for (const lbl of objectsData.raw_labels) {
                  info.push({ label: lbl.label, value: `${lbl.confidence.toFixed(0)}%` });
                }
              }

              const spoofRisk = objectsData.spoof_risk || 'low';
              const isSpoof = spoofRisk === 'high' || spoofRisk === 'medium';

              const passiveScore = passiveData.score ?? 0;
              const passiveConfidence = passiveData.confidence ?? 0;
              const penalty = isSpoof ? 0.3 : 0;
              const combinedScore = Math.max(0, passiveScore * (1 - penalty));
              const combinedConfidence = Math.max(0, passiveConfidence * (1 - penalty));

              const breakdown: { label: string; pts: number }[] = [
                ...(passiveData.breakdown || []),
                { label: `Spoof penalty (${objectsData.spoof_risk || 'low'})`, pts: Math.round(passiveScore - combinedScore) },
              ];

              onComplete({
                is_real: combinedScore > 14,
                confidence: combinedConfidence,
                score: Math.round(combinedScore),
                details: isSpoof
                  ? `Spoof risk: ${objectsData.spoof_risk}. ${objectsData.spoof_objects_detected?.map((o: any) => o.label).join(', ') || ''}`
                  : passiveData.details || 'No spoof objects detected',
                snapshotUrl,
                breakdown,
                info: info.length > 0 ? info : undefined,
                provider: 'aws_detect_labels_hybrid',
              });
              return;
            }

            if (provider === 'aws_detect_labels_hybrid') {
              const [passiveRes, objectsRes, facesRes] = await Promise.all([
                fetch(`${serverUrl.replace(/\/+$/, '')}/liveness/passive`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ image: fullB64, bbox, provider: 'aws_hybrid' }),
                }),
                fetch(`${serverUrl.replace(/\/+$/, '')}/liveness/detect-objects`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ image: fullB64 }),
                }),
                fetch(`${serverUrl.replace(/\/+$/, '')}/liveness/detect-faces`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ image: fullB64 }),
                }),
              ]);
              const [passiveData, objectsData, facesData] = await Promise.all([passiveRes.json(), objectsRes.json(), facesRes.json()]);

              const info: { label: string; value: string }[] = [];
              if (facesData?.face_detected) {
                if (facesData.age_low != null && facesData.age_high != null) info.push({ label: 'Age', value: `${facesData.age_low}-${facesData.age_high}` });
                if (facesData.gender) info.push({ label: 'Gender', value: facesData.gender });
                if (facesData.expression) info.push({ label: 'Expression', value: facesData.expression });
                info.push({ label: 'Face Confidence', value: `${facesData.confidence?.toFixed(1) ?? '?'}%` });
                info.push({ label: 'Eyes Open', value: facesData.eyes_open ? `Yes (${facesData.eyes_open_confidence?.toFixed(0) ?? '?'}%)` : 'No' });
                info.push({ label: 'Lighting', value: facesData.quality_brightness?.toFixed(0) ?? '?' });
                info.push({ label: 'Sharpness', value: facesData.quality_sharpness?.toFixed(0) ?? '?' });
              } else {
                info.push({ label: 'AWS Face', value: 'No face detected' });
              }

              if (objectsData.raw_labels) {
                for (const lbl of objectsData.raw_labels) {
                  info.push({ label: lbl.label, value: `${lbl.confidence.toFixed(0)}%` });
                }
              }

              const spoofRisk = objectsData.spoof_risk || 'low';
              const isSpoof = spoofRisk === 'high' || spoofRisk === 'medium';

              const passiveScore = passiveData.score ?? 0;
              const passiveConfidence = passiveData.confidence ?? 0;
              const penalty = isSpoof ? 0.3 : 0;
              const combinedScore = Math.max(0, passiveScore * (1 - penalty));
              const combinedConfidence = Math.max(0, passiveConfidence * (1 - penalty));

              const breakdown: { label: string; pts: number }[] = [
                ...(passiveData.breakdown || []),
                { label: `Spoof penalty (${objectsData.spoof_risk || 'low'})`, pts: Math.round(passiveScore - combinedScore) },
              ];

              onComplete({
                is_real: combinedScore > 14,
                confidence: combinedConfidence,
                score: Math.round(combinedScore),
                details: isSpoof
                  ? `Spoof risk: ${objectsData.spoof_risk}. ${objectsData.spoof_objects_detected?.map((o: any) => o.label).join(', ') || ''}`
                  : passiveData.details || 'No spoof objects detected',
                snapshotUrl,
                breakdown,
                info: info.length > 0 ? info : undefined,
                provider: 'aws_detect_labels_hybrid',
              });
              return;
            }

            if (provider === 'aws_detect_labels') {
              const res = await fetch(`${serverUrl.replace(/\/+$/, '')}/liveness/detect-objects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: fullB64 }),
              });
              const data = await res.json();
              const info: { label: string; value: string }[] = [];
              if (data.raw_labels) {
                for (const lbl of data.raw_labels) {
                  info.push({ label: lbl.label, value: `${lbl.confidence.toFixed(0)}%` });
                }
              }
              const spoofRisk = data.spoof_risk || 'low';
              const isSpoof = spoofRisk === 'high' || spoofRisk === 'medium';
              onComplete({
                is_real: !isSpoof,
                confidence: isSpoof ? 0.2 : 0.9,
                score: isSpoof ? 0 : 18,
                details: isSpoof ? `Spoof risk: ${spoofRisk}. ${data.spoof_objects_detected?.map((o: any) => o.label).join(', ') || ''}` : 'No spoof objects detected',
                snapshotUrl,
                info: info.length > 0 ? info : undefined,
                provider: 'aws_detect_labels',
              });
              return;
            }

            const res = await fetch(`${(provider === 'faceplusplus' && faceplusServerUrl) || (provider === 'aws' && awsServerUrl) || serverUrl.replace(/\/+$/, '')}/liveness/passive`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: fullB64, bbox, provider }),
            });
            const data: PassiveResult = await res.json();
            onComplete({ ...data, snapshotUrl });
            return;
          }
        }

        if (!cancelled) {
          setStatus('No face detected');
          stream.getTracks().forEach(t => t.stop());
          onComplete({ is_real: false, confidence: 0, score: 0, error: 'No face detected' });
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Detection error');
      }
    }

    run();
    return () => { cancelled = true; };
  }, [phase, onComplete, provider, serverUrl, faceplusServerUrl, awsServerUrl]);

  if (error) {
    return <div style={{ textAlign: 'center', padding: 12, color: '#ef4444', fontSize: 13 }}>Error: {error}</div>;
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} width={640} height={480} />
      <div style={{
        position: 'relative',
        borderRadius: 8,
        overflow: 'hidden',
        background: '#000',
        minHeight: 200,
        marginBottom: 8,
      }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: '100%', display: 'block', transform: 'scaleX(-1)' }}
        />
      </div>
      {phase === 'preview' && (
        <>
          {cameras.length > 1 && (
            <div style={{ marginBottom: 8 }}>
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
          <button
            onClick={() => setPhase('detecting')}
            style={{
              padding: '10px 28px',
              fontSize: 14,
              fontWeight: 600,
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #14532d, #16a34a)',
              color: '#bbf7d0',
              marginTop: 4,
            }}
          >
            Start Check
          </button>
        </>
      )}
      {phase === 'detecting' && (
        <div style={{ color: '#3b82f6', fontSize: 13, fontWeight: 600 }}>{status}</div>
      )}
    </div>
  );
}
