import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';

interface LivenessResult {
  pass: boolean;
  score: number;
  details: string;
  recordingUrl?: string;
  breakdown?: { label: string; pts: number }[];
}

interface LivenessCheckProps {
  onComplete: (result: LivenessResult) => void;
  externalVideo?: HTMLVideoElement | null;
  autoStart?: boolean;
  provider?: string;
  serverUrl?: string;
  obServerUrl?: string;
}

const LIVENESS_PASS_THRESHOLD = 70; // 0-100

function eyeAspectRatio(landmarks: faceapi.Point[]): number {
  if (landmarks.length < 8) return 0;
  const v1 = distance(landmarks[1], landmarks[5]);
  const v2 = distance(landmarks[2], landmarks[4]);
  const h = distance(landmarks[0], landmarks[3]);
  return (v1 + v2) / (2 * h);
}

function distance(a: faceapi.Point, b: faceapi.Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function faceWidth(landmarks: faceapi.FaceLandmarks68): number {
  const left = landmarks.getJawOutline()[0];
  const right = landmarks.getJawOutline()[16];
  return distance(left, right);
}

function pixelVariance(canvas: HTMLCanvasElement, x: number, y: number, w: number, h: number): number {
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;
  const imageData = ctx.getImageData(x, y, w, h);
  const pixels = imageData.data;
  let total = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    total += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
  }
  const avg = total / (pixels.length / 4);
  let variance = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const v = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
    variance += (v - avg) ** 2;
  }
  return variance / (pixels.length / 4);
}

function frameDelta(canvas: HTMLCanvasElement, prev: ImageData | null, x: number, y: number, w: number, h: number): number {
  if (!prev) return 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) return 1;
  const curr = ctx.getImageData(x, y, w, h);
  const len = Math.min(curr.data.length, prev.data.length);
  let diff = 0;
  for (let i = 0; i < len; i += 16) {
    diff += Math.abs(curr.data[i] - prev.data[i]);
    diff += Math.abs(curr.data[i + 1] - prev.data[i + 1]);
    diff += Math.abs(curr.data[i + 2] - prev.data[i + 2]);
  }
  return diff / (len / 16);
}

const CHALLENGE_POOL = ['turn_left', 'turn_right', 'look_up', 'look_down'] as const;
type Challenge = typeof CHALLENGE_POOL[number];

const COLLECT_FRAMES = 20;
const CHALLENGE_FRAMES = 15;
const MIN_FACE_WIDTH = 80;
const TEXTURE_VARIANCE_THRESHOLD = 20;
const FRAME_DELTA_THRESHOLD = 0.8;

function pickChallenges(count: number): Challenge[] {
  const shuffled = [...CHALLENGE_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

const CHALLENGE_LABELS: Record<Challenge, string> = {
  turn_left: 'Turn your head to the left',
  turn_right: 'Turn your head to the right',
  look_up: 'Look up toward the ceiling',
  look_down: 'Look down toward the floor',
};

export default function LivenessCheck({ onComplete, externalVideo, autoStart = true, provider, serverUrl, obServerUrl }: LivenessCheckProps) {
  const [status, setStatus] = useState(externalVideo ? 'Analyzing video...' : 'Starting camera...');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(autoStart);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameCountRef = useRef(0);
  const blinkCountRef = useRef(0);
  const movementCountRef = useRef(0);
  const textureVarianceRef = useRef<number[]>([]);
  const frameDeltasRef = useRef<number[]>([]);
  const prevFrameRef = useRef<ImageData | null>(null);
  const faceSizesRef = useRef<number[]>([]);
  const runningRef = useRef(true);
  const rafRef = useRef<number>(0);
  const analysisStartedRef = useRef(false);
  const wasEyeClosedRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef(Date.now());
  const TIMEOUT_MS = 20_000;

  // Challenge-response state
  const challengesRef = useRef<Challenge[]>([]);
  const challengeIdxRef = useRef(-1);
  const challengeFrameRef = useRef(0);
  const challengePassedRef = useRef(false);
  const challengeScoreRef = useRef(0);
  const baselineNoseRef = useRef<{ offsetX: number; eyeNoseY: number } | null>(null);
  const inChallengeRef = useRef(false);

  const stopCamera = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  function startRecording(stream: MediaStream) {
    recordedChunksRef.current = [];
    try {
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
      recorder.start(500);
      mediaRecorderRef.current = recorder;
    } catch {
      // recording not critical
    }
  }

  useEffect(() => {
    if (!started) return;

    if (externalVideo) {
      setStatus('Analyzing video...');
      const video = externalVideo;
      if (video.readyState >= 2) {
        video.play();
        startAnalysis(video);
      } else {
        const onReady = () => { video.play(); startAnalysis(video); };
        video.addEventListener('canplay', onReady);
        return () => video.removeEventListener('canplay', onReady);
      }
      return;
    }

    let cancelled = false;

    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        streamRef.current = stream;
        startRecording(stream);
        const video = videoRef.current;
        if (!video) { stream.getTracks().forEach(t => t.stop()); return; }

        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play();
        setStatus('Analyzing face...');
        startAnalysis(video);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Camera access denied');
      }
    }

    init();
    return () => { cancelled = true; runningRef.current = false; stopCamera(); };
  }, [started, externalVideo, stopCamera]);

  function startAnalysis(video: HTMLVideoElement) {
    if (analysisStartedRef.current) return;
    analysisStartedRef.current = true;

    runningRef.current = true;
    const detOpts = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 });

    async function checkFrame() {
      if (!runningRef.current) return;

      if (Date.now() - startTimeRef.current > TIMEOUT_MS) {
        const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
        runningRef.current = false;
        stopCamera();
        if (externalVideo) video.pause();
        onComplete({ pass: false, score: 0, details: `Timed out after ${elapsed}s — face not detected long enough` });
        return;
      }

      try {
        const detections = await faceapi.detectAllFaces(video, detOpts).withFaceLandmarks();
        const canvas = canvasRef.current;

        if (detections.length > 0 && canvas) {
          // Pick detection closest to center
          const cx = canvas.width / 2;
          const cy = canvas.height / 2;
          let bestDist = Infinity;
          let det = detections[0];
          for (const d of detections) {
            const b = d.detection.box;
            const dist = Math.abs(b.x + b.width / 2 - cx) + Math.abs(b.y + b.height / 2 - cy);
            if (dist < bestDist) { bestDist = dist; det = d; }
          }
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const box = det.detection.box;
          const faceW = faceWidth(det.landmarks);
          const ear = eyeAspectRatio(det.landmarks.getLeftEye());
          faceSizesRef.current.push(faceW);

          // Blink detection via EAR state transitions
          if (ear < 0.2) {
            if (!wasEyeClosedRef.current) {
              blinkCountRef.current++;
              wasEyeClosedRef.current = true;
            }
          } else {
            wasEyeClosedRef.current = false;
          }

          // Texture analysis
          const vx = Math.max(0, Math.floor(box.x));
          const vy = Math.max(0, Math.floor(box.y));
          const vw = Math.min(canvas.width - vx, Math.ceil(box.width));
          const vh = Math.min(canvas.height - vy, Math.ceil(box.height));
          if (vw > 10 && vh > 10) {
            const v = pixelVariance(canvas, vx, vy, vw, vh);
            textureVarianceRef.current.push(v);
            const delta = frameDelta(canvas, prevFrameRef.current, vx, vy, vw, vh);
            frameDeltasRef.current.push(delta);
            prevFrameRef.current = canvas.getContext('2d')?.getImageData(vx, vy, vw, vh) ?? null;
          }

          frameCountRef.current++;

          // === Phase 1: Baseline collection ===
          if (!inChallengeRef.current) {
            const faceBoxCenter = box.x + box.width / 2;
            const nose = det.landmarks.getNose()[0];
            const leftEye = det.landmarks.getLeftEye();
            const rightEye = det.landmarks.getRightEye();
            const eyeMidX = (leftEye[0].x + rightEye[0].x) / 2;
            const eyeMidY = (leftEye[0].y + rightEye[0].y) / 2;

            // Store baseline on first valid frame
            if (!baselineNoseRef.current) {
              baselineNoseRef.current = {
                offsetX: (nose.x - faceBoxCenter) / box.width,
                eyeNoseY: (nose.y - eyeMidY) / box.height,
              };
            }

            const basePct = Math.min(100, Math.round((frameCountRef.current / COLLECT_FRAMES) * 100));
            setProgress(basePct);
            setStatus('Hold still — collecting baseline');

            if (frameCountRef.current >= COLLECT_FRAMES) {
              // Move to challenges
              inChallengeRef.current = true;
              challengesRef.current = pickChallenges(2);
              challengeIdxRef.current = 0;
              challengeFrameRef.current = 0;
              challengePassedRef.current = false;
              const c = challengesRef.current[0];
              setStatus(CHALLENGE_LABELS[c]);
              setProgress(0);
            }
          } else {
            // === Phase 2: Challenges ===
            const challenge = challengesRef.current[challengeIdxRef.current];
            if (challenge) {
              challengeFrameRef.current++;

              // Compute current nose offset vs baseline
              const faceBoxCenter = box.x + box.width / 2;
              const nose = det.landmarks.getNose()[0];
              const leftEye = det.landmarks.getLeftEye();
              const rightEye = det.landmarks.getRightEye();
              const eyeMidX = (leftEye[0].x + rightEye[0].x) / 2;
              const eyeMidY = (leftEye[0].y + rightEye[0].y) / 2;
              const curOffsetX = (nose.x - faceBoxCenter) / box.width;
              const curEyeNoseY = (nose.y - eyeMidY) / box.height;
              const base = baselineNoseRef.current;

              if (base) {
                const deltaX = curOffsetX - base.offsetX;
                const deltaY = curEyeNoseY - base.eyeNoseY;

                if (challenge === 'turn_left' && deltaX > 0.06) {
                  challengePassedRef.current = true;
                } else if (challenge === 'turn_right' && deltaX < -0.06) {
                  challengePassedRef.current = true;
                } else if (challenge === 'look_up' && deltaY < -0.04) {
                  challengePassedRef.current = true;
                } else if (challenge === 'look_down' && deltaY > 0.04) {
                  challengePassedRef.current = true;
                }
              }

              // Per-challenge progress
              const cPct = Math.min(100, Math.round((challengeFrameRef.current / CHALLENGE_FRAMES) * 100));
              setProgress(cPct);

              // Check if challenge complete
              if (challengeFrameRef.current >= CHALLENGE_FRAMES) {
                if (challengePassedRef.current) challengeScoreRef.current += 15;

                challengeIdxRef.current++;
                // Move to next challenge or done
                if (challengeIdxRef.current >= challengesRef.current.length) {
                  await computeResult();
                  return;
                }
                challengeFrameRef.current = 0;
                challengePassedRef.current = false;
                const next = challengesRef.current[challengeIdxRef.current];
                setStatus(CHALLENGE_LABELS[next]);
                setProgress(0);
              } else {
                const remaining = CHALLENGE_FRAMES - challengeFrameRef.current;
                setStatus(
                  challengePassedRef.current
                    ? `Good! Keep position (${remaining})`
                    : `${CHALLENGE_LABELS[challenge]} (${remaining})`
                );
              }
            }
          }
        } else {
          setStatus(frameCountRef.current > 15 ? 'Face lost — stay centered' : 'Position face in center');
        }
      } catch { /* skip */ }

      rafRef.current = requestAnimationFrame(checkFrame);
    }

    async function computeResult() {
      const avgFaceSize = faceSizesRef.current.length > 0
        ? faceSizesRef.current.reduce((a, b) => a + b, 0) / faceSizesRef.current.length
        : 0;
      const avgTexture = textureVarianceRef.current.length > 0
        ? textureVarianceRef.current.reduce((a, b) => a + b, 0) / textureVarianceRef.current.length
        : 0;
      const avgDelta = frameDeltasRef.current.length > 0
        ? frameDeltasRef.current.reduce((a, b) => a + b, 0) / frameDeltasRef.current.length
        : 0;

      let score = 0;
      const reasons: string[] = [];
      const breakdown: { label: string; pts: number }[] = [];

      // Face size (up to 20 pts, continuous)
      let sizePts = 0;
      if (avgFaceSize >= MIN_FACE_WIDTH) {
        sizePts = Math.round(Math.min(20, 12 + (avgFaceSize - MIN_FACE_WIDTH) / 5) * 10) / 10;
        reasons.push('face visible');
      } else if (avgFaceSize > 0) {
        sizePts = Math.round(Math.max(0, (avgFaceSize / MIN_FACE_WIDTH) * 12) * 10) / 10;
        reasons.push('face small');
      } else {
        reasons.push('face too small');
      }
      score += sizePts;
      breakdown.push({ label: 'Face Size', pts: sizePts });

      // Texture variance (up to 20 pts, continuous)
      let texPts = 0;
      if (avgTexture > TEXTURE_VARIANCE_THRESHOLD) {
        texPts = Math.round(Math.min(20, 12 + (avgTexture - TEXTURE_VARIANCE_THRESHOLD) * 40) * 10) / 10;
        reasons.push('face texture detected');
      } else if (avgTexture > 0) {
        texPts = Math.round((avgTexture / TEXTURE_VARIANCE_THRESHOLD) * 12 * 10) / 10;
        reasons.push('low face texture');
      } else {
        reasons.push('no face texture');
      }
      score += texPts;
      breakdown.push({ label: 'Texture', pts: texPts });

      // Frame-to-frame change (up to 20 pts, continuous)
      let motionPts = 0;
      if (avgDelta > FRAME_DELTA_THRESHOLD) {
        motionPts = Math.round(Math.min(20, 12 + (avgDelta - FRAME_DELTA_THRESHOLD) * 30) * 10) / 10;
        reasons.push('natural motion');
      } else if (avgDelta > 0) {
        motionPts = Math.round((avgDelta / FRAME_DELTA_THRESHOLD) * 12 * 10) / 10;
        reasons.push('limited motion');
      } else {
        reasons.push('no motion');
      }
      score += motionPts;
      breakdown.push({ label: 'Motion', pts: motionPts });

      // Challenge-response (up to 30 pts, 15 per challenge)
      const chalPts = challengeScoreRef.current;
      if (chalPts > 0) reasons.push(`${chalPts}pts challenges`);
      score += chalPts;
      breakdown.push({ label: 'Challenges', pts: chalPts });

      // Blink bonus (up to 10 pts, continuous)
      let blinkPts = 0;
      if (blinkCountRef.current >= 2) {
        blinkPts = Math.min(10, 6 + (blinkCountRef.current - 2) * 2);
        reasons.push(`${blinkCountRef.current} blinks`);
      } else if (blinkCountRef.current >= 1) {
        blinkPts = 3 + blinkCountRef.current * 2;
        reasons.push(`${blinkCountRef.current} blink`);
      }
      score += blinkPts;
      breakdown.push({ label: 'Blinks', pts: blinkPts });

      let backendScore = 0;
      if (provider === 'openbiometrics' && serverUrl && canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx && video) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const b64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
          try {
            const res = await fetch(`${serverUrl.replace(/\/+$/, '')}/liveness/openbiometrics`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: b64, ob_url: obServerUrl || 'http://localhost:8000' }),
            });
            const data = await res.json();
            if (data.error && data.error.includes('No face')) {
              reasons.push('OB:no face');
            } else if (data.score > 0 || data.confidence > 0) {
              backendScore = data.score;
              reasons.push(`OB:${typeof data.score === 'number' ? data.score.toFixed(1) : data.score}pts`);
              if (data.is_live) reasons.push('live');
              if (data.confidence) reasons.push(`conf:${Math.round(data.confidence * 100)}%`);
            } else {
              reasons.push('OB:face detected');
            }
          } catch {
            reasons.push('OB:error');
          }
        }
      } else if (provider === 'aws_detect_faces' && serverUrl && canvasRef.current) {
        const canvas = canvasRef.current;
        // Draw the latest video frame onto canvas if not already there
        const ctx = canvas.getContext('2d');
        if (ctx && video) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const b64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
          try {
            const res = await fetch(`${serverUrl.replace(/\/+$/, '')}/liveness/detect-faces`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: b64 }),
            });
            const data = await res.json();
            if (data.score > 0) {
              backendScore = data.score;
              reasons.push(`AWS:${data.score}pts`);
              if (data.eyes_open) reasons.push('eyes open');
              if (data.quality_brightness > 40) reasons.push('good lighting');
              if (data.quality_sharpness > 40) reasons.push('sharp image');
            } else {
              reasons.push('AWS:no face');
            }
          } catch {
            reasons.push('AWS:error');
          }
        }
      }

      score += backendScore;
      if (backendScore > 0) breakdown.push({ label: provider === 'openbiometrics' ? 'OpenBiometrics' : 'Backend', pts: backendScore });
      score = Math.min(100, score);
      const pass = score >= LIVENESS_PASS_THRESHOLD;
      const details = reasons.join(', ');

      runningRef.current = false;
      stopCamera();

      let recordingUrl: string | undefined;
      if (externalVideo) {
        recordingUrl = externalVideo.currentSrc || externalVideo.src || undefined;
      } else if (recordedChunksRef.current.length > 0) {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        recordingUrl = URL.createObjectURL(blob);
      }
      if (externalVideo) { video.pause(); }
      onComplete({ pass, score, details, recordingUrl, breakdown });
    }

    rafRef.current = requestAnimationFrame(checkFrame);
  }

  if (error) {
    return <div style={{ textAlign: 'center', padding: 12, color: '#ef4444', fontSize: 13 }}>Camera error: {error}</div>;
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} width={640} height={480} />
      <video
        ref={videoRef}
        style={{ width: '100%', maxWidth: 280, borderRadius: 6, display: 'block', margin: '0 auto 8px', transform: externalVideo ? 'none' : 'scaleX(-1)' }}
        playsInline
        muted
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: progress < 100 ? '#f59e0b' : '#22c55e',
          animation: progress < 100 ? 'pulse 1s infinite' : 'none',
        }} />
        <span style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600 }}>{status}</span>
      </div>
      <div style={{ width: '80%', maxWidth: 200, margin: '0 auto', height: 4, background: '#334155', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          width: `${progress}%`, height: '100%',
          background: 'linear-gradient(90deg, #f59e0b, #22c55e)',
          borderRadius: 2, transition: 'width 0.15s',
        }} />
      </div>
      <div style={{ color: '#64748b', fontSize: 10, marginTop: 4 }}>
        {externalVideo ? 'Analyzing uploaded video...' : 'Follow the on-screen instructions to move your head'}
      </div>
    </div>
  );
}
