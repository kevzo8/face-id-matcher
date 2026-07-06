import { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';

interface PassiveResult {
  is_real: boolean;
  confidence: number;
  score: number;
  error?: string;
}

interface Props {
  onComplete: (result: PassiveResult) => void;
  serverUrl: string;
}

export default function PassiveLivenessCheck({ onComplete, serverUrl }: Props) {
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

        // Wait up to 5s for a face
        for (let i = 0; i < 150; i++) {
          if (cancelled || doneRef.current) return;
          await new Promise(r => setTimeout(r, 33));

          const det = await faceapi.detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 })).withFaceLandmarks();
          if (det && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) continue;

            // Draw current frame
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Crop face region with padding
            const box = det.detection.box;
            const pad = 0.5;
            const fx = Math.max(0, Math.floor(box.x - box.width * pad));
            const fy = Math.max(0, Math.floor(box.y - box.height * pad));
            const fw = Math.min(canvas.width - fx, Math.ceil(box.width * (1 + pad * 2)));
            const fh = Math.min(canvas.height - fy, Math.ceil(box.height * (1 + pad * 2)));
            const faceData = ctx.getImageData(fx, fy, fw, fh);

            // Create a temporary canvas for the face crop
            const tmpCanvas = document.createElement('canvas');
            tmpCanvas.width = fw;
            tmpCanvas.height = fh;
            const tmpCtx = tmpCanvas.getContext('2d');
            if (!tmpCtx) continue;
            tmpCtx.putImageData(faceData, 0, 0);

            // Send to backend as JPEG
            const b64 = tmpCanvas.toDataURL('image/jpeg', 0.9).split(',')[1];
            const bbox = [box.x / canvas.width, box.y / canvas.height, box.width / canvas.width, box.height / canvas.height];

            setStatus('Analyzing...');
            doneRef.current = true;

            // Stop camera
            stream.getTracks().forEach(t => t.stop());

            const res = await fetch(`${serverUrl.replace(/\/+$/, '')}/liveness/passive`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: b64, bbox }),
            });
            const data: PassiveResult = await res.json();
            onComplete(data);
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
  }, [serverUrl, onComplete]);

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
