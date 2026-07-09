import { useEffect, useRef, useState } from 'react';
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
  provider?: 'faceplusplus' | 'aws' | 'heuristic';
  faceplusServerUrl?: string;
  awsServerUrl?: string;
}

export default function PassiveLivenessCheck({ onComplete, serverUrl, provider = 'heuristic', faceplusServerUrl, awsServerUrl }: Props) {
  const [status, setStatus] = useState('Opening camera...');
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) { stream.getTracks().forEach(t => t.stop()); return; }

        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play();

        setStatus('Detecting face...');

        const startTime = Date.now();
        const TIMEOUT_MS = 5_000;
        let frameCount = 0;

        // Wait up to TIMEOUT_MS for a face
        while (Date.now() - startTime < TIMEOUT_MS) {
          if (cancelled || doneRef.current) return;
          await new Promise(r => setTimeout(r, 33));
          frameCount++;

          const detections = await faceapi.detectAllFaces(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 })).withFaceLandmarks();
          if (detections.length > 0 && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) continue;

            // Pick detection closest to center
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

            // Draw full video frame
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Draw green bounding box around the detected face
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 3;
            ctx.strokeRect(box.x, box.y, box.width, box.height);

            // Capture the frame with bounding box as snapshot
            const snapshotUrl = canvas.toDataURL('image/jpeg', 0.7);

            // Send full frame (without box) to backend
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const fullB64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];

            const bbox = [box.x / canvas.width, box.y / canvas.height, box.width / canvas.width, box.height / canvas.height];

            setStatus('Analyzing...');
            doneRef.current = true;

            // Stop camera
            stream.getTracks().forEach(t => t.stop());

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

        // No face found in time
        if (!cancelled) {
          setStatus('No face detected');
          stream.getTracks().forEach(t => t.stop());
          onComplete({ is_real: false, confidence: 0, score: 0, error: 'No face detected' });
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Camera error');
      }
    }

    run();
    return () => { cancelled = true; if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); };
  }, [serverUrl, onComplete, provider]);

  if (error) {
    return <div style={{ textAlign: 'center', padding: 12, color: '#ef4444', fontSize: 13 }}>Error: {error}</div>;
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} width={640} height={480} />
      <video ref={videoRef} style={{ width: '100%', maxWidth: 280, borderRadius: 6, display: 'block', margin: '0 auto 8px', transform: 'scaleX(-1)' }} playsInline muted />
      <div style={{ color: '#3b82f6', fontSize: 13, fontWeight: 600 }}>{status}</div>
    </div>
  );
}
