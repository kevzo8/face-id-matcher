import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';

async function fixWebmDuration(blob: Blob, durationMs: number): Promise<Blob> {
  const buf = await blob.arrayBuffer();
  const view = new DataView(buf);
  // EBML Element ID 0x4489 = Duration (float), parent is Info (0x1549A966)
  // Find info ID (0x1549A966 = [0x15, 0x49, 0xA9, 0x66])
  const infoId = [0x15, 0x49, 0xA9, 0x66];
  // Search for Info element in the first ~4KB
  const maxSearch = Math.min(buf.byteLength, 4096);
  let infoEnd = -1;
  let infoStart = 0;
  for (let j = 0; j < maxSearch - 4; j++) {
    if (view.getUint8(j) === infoId[0] && view.getUint8(j+1) === infoId[1] &&
        view.getUint8(j+2) === infoId[2] && view.getUint8(j+3) === infoId[3]) {
      infoStart = j;
      let pos = j + 4;
      while (pos < buf.byteLength && (view.getUint8(pos) & 0x80)) pos++;
      pos++;
      infoEnd = pos;
      break;
    }
  }
  if (infoEnd < 0) return blob;
  // Search for Duration ID (0x4489 = [0x44, 0x89]) within Info
  const durId = [0x44, 0x89];
  for (let j = infoStart; j < infoEnd - 2; j++) {
    if (view.getUint8(j) === durId[0] && view.getUint8(j+1) === durId[1]) {
      let pos = j + 2;
      // Read EBML variable-length data size
      let size = 0;
      let sizeLen = 0;
      const first = view.getUint8(pos);
      if (first === 0x88) { size = 8; sizeLen = 1; } // 0x88 = size 8, 1-byte encoding
      else if (first === 0x84) { size = 4; sizeLen = 1; }
      else { // fallback: just proceed
        sizeLen = 1;
        while (pos + sizeLen < buf.byteLength && (view.getUint8(pos + sizeLen - 1) & 0x80) === 0) sizeLen++;
        size = buf.byteLength - pos - sizeLen;
      }
      pos += sizeLen;
      if (pos + 8 > buf.byteLength) return blob;
      // Write duration as 8-byte float (big-endian IEEE 754)
      const durFloat = durationMs / 1000; // Duration in seconds (TimecodeScale default = 1ms)
      const durBytes = new Float64Array([durFloat]);
      // Float64Array is little-endian, need to swap for big-endian EBML
      const be = new Uint8Array(8);
      const le = new Uint8Array(durBytes.buffer);
      for (let j = 0; j < 8; j++) be[j] = le[7 - j];
      const patched = new Uint8Array(buf);
      patched.set(be, pos);
      return new Blob([patched], { type: 'video/webm' });
    }
  }
  return blob;
}

interface LivenessResult {
  pass: boolean;
  score: number;
  details: string;
  recordingUrl?: string;
  recordingDuration?: number;
  breakdown?: { label: string; pts: number }[];
  challenges?: { label: string; pts: number }[];
  info?: { label: string; value: string }[];
}

interface LivenessCheckProps {
  onComplete: (result: LivenessResult) => void;
  externalVideo?: HTMLVideoElement | null;
  autoStart?: boolean;
  provider?: string;
  serverUrl?: string;
  obServerUrl?: string;
}

const LIVENESS_PASS_THRESHOLD = 75;

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

function meanRGB(canvas: HTMLCanvasElement, x: number, y: number, w: number, h: number): { r: number; g: number; b: number } {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { r: 0, g: 0, b: 0 };
  const img = ctx.getImageData(x, y, w, h);
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < img.data.length; i += 16) {
    r += img.data[i]; g += img.data[i + 1]; b += img.data[i + 2]; n++;
  }
  return n > 0 ? { r: r / n, g: g / n, b: b / n } : { r: 0, g: 0, b: 0 };
}

const CHALLENGE_POOL = ['turn_left', 'turn_right', 'look_up', 'look_down'] as const;
type Challenge = typeof CHALLENGE_POOL[number];

const COLLECT_FRAMES = 40;
const CHALLENGE_FRAMES = 30;
const FLASH_FRAMES = 10;
const MIN_FACE_WIDTH = 80;
const TEXTURE_VARIANCE_THRESHOLD = 20;
const FRAME_DELTA_THRESHOLD = 0.8;
const FRAME_RATE = 20;

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
  const [phase, setPhase] = useState<'preview' | 'running'>(externalVideo ? 'running' : 'preview');
  const [status, setStatus] = useState(externalVideo ? 'Analyzing video...' : 'Camera preview');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
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
  const recordingStartRef = useRef(0);
  const startTimeRef = useRef(Date.now());
  const TIMEOUT_MS = 30_000;

  const [flashColor, setFlashColor] = useState<'red' | 'green' | 'blue' | null>(null);
  const flashStepRef = useRef(0);
  const flashFrameCountRef = useRef(0);
  const flashBaselineRef = useRef<{ r: number; g: number; b: number } | null>(null);
  const flashSamplesRef = useRef<{ color: string; r: number; g: number; b: number }[]>([]);
  const flashStepSamplesRef = useRef<{ r: number; g: number; b: number }[]>([]);
  const baselineRGBSamplesRef = useRef<{ r: number; g: number; b: number }[]>([]);
  const inFlashRef = useRef(false);

  const challengesRef = useRef<Challenge[]>([]);
  const challengeIdxRef = useRef(-1);
  const challengeFrameRef = useRef(0);
  const challengePassedRef = useRef(false);
  const challengeScoreRef = useRef(0);
  const challengeResultsRef = useRef<{ label: string; pts: number }[]>([]);
  const challengeMovementFramesRef = useRef(0);
  const baselineSamplesRef = useRef<{ offsetX: number; eyeNoseY: number }[]>([]);
  const baselineNoseRef = useRef<{ offsetX: number; eyeNoseY: number } | null>(null);
  const inChallengeRef = useRef(false);
  const eyeOpenStreakRef = useRef(0);

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
    if (phase === 'preview') {
      stopCamera();
      await startCamera(deviceId);
    }
  }, [phase, stopCamera, startCamera]);

  function startRecording(stream: MediaStream) {
    recordedChunksRef.current = [];
    recordingStartRef.current = Date.now();
    try {
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
      recorder.start(500);
      mediaRecorderRef.current = recorder;
    } catch {
      // recording not critical
    }
  }

  // Open camera in preview phase
  useEffect(() => {
    if (phase !== 'preview' || externalVideo) return;
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
  }, [phase, externalVideo]);

  // Run analysis when phase transitions to 'running'
  useEffect(() => {
    if (phase !== 'running') return;

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
      const stream = streamRef.current;
      if (!stream) {
        if (!cancelled) setError('Camera stream lost');
        return;
      }
      startRecording(stream);
      const video = videoRef.current;
      if (!video) { return; }
      setStatus('Analyzing face...');
      startAnalysis(video);
    }

    init();
    return () => { cancelled = true; runningRef.current = false; stopCamera(); };
  }, [phase, externalVideo, stopCamera]);

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

          if (ear < 0.2) {
            if (!wasEyeClosedRef.current) {
              blinkCountRef.current++;
              wasEyeClosedRef.current = true;
            }
            eyeOpenStreakRef.current = 0;
          } else {
            eyeOpenStreakRef.current++;
            if (eyeOpenStreakRef.current >= 3) {
              wasEyeClosedRef.current = false;
            }
          }

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
            // Capture baseline face RGB during collection phase (for flash liveness)
            if (!inChallengeRef.current && !inFlashRef.current) {
              baselineRGBSamplesRef.current.push(meanRGB(canvas, vx, vy, vw, vh));
            }
            // Capture flash-lit face RGB during flash phase
            if (inFlashRef.current) {
              flashStepSamplesRef.current.push(meanRGB(canvas, vx, vy, vw, vh));
            }
          }

          frameCountRef.current++;

          if (!inChallengeRef.current && !inFlashRef.current) {
            const faceBoxCenter = box.x + box.width / 2;
            const nose = det.landmarks.getNose()[0];
            const leftEye = det.landmarks.getLeftEye();
            const rightEye = det.landmarks.getRightEye();
            const eyeMidX = (leftEye[0].x + rightEye[0].x) / 2;
            const eyeMidY = (leftEye[0].y + rightEye[0].y) / 2;

            if (!baselineNoseRef.current) {
              baselineSamplesRef.current.push({
                offsetX: (nose.x - faceBoxCenter) / box.width,
                eyeNoseY: (nose.y - eyeMidY) / box.height,
              });
            }

            const remainSec = Math.max(0, (COLLECT_FRAMES - frameCountRef.current) / FRAME_RATE);
            setProgress(Math.min(100, Math.round((frameCountRef.current / COLLECT_FRAMES) * 100)));
            setStatus(`Hold still — keep your face centered (${remainSec.toFixed(1)}s left)`);

            if (frameCountRef.current >= COLLECT_FRAMES) {
              // Compute median baseline from collected samples
              if (baselineSamplesRef.current.length > 0) {
                const sortedX = baselineSamplesRef.current.map(s => s.offsetX).sort((a, b) => a - b);
                const sortedY = baselineSamplesRef.current.map(s => s.eyeNoseY).sort((a, b) => a - b);
                const mid = Math.floor(sortedX.length / 2);
                baselineNoseRef.current = {
                  offsetX: sortedX.length % 2 === 0 ? (sortedX[mid - 1] + sortedX[mid]) / 2 : sortedX[mid],
                  eyeNoseY: sortedY.length % 2 === 0 ? (sortedY[mid - 1] + sortedY[mid]) / 2 : sortedY[mid],
                };
              }
              // Compute baseline face RGB (average of collection frames)
              if (baselineRGBSamplesRef.current.length > 0) {
                const n = baselineRGBSamplesRef.current.length;
                flashBaselineRef.current = {
                  r: baselineRGBSamplesRef.current.reduce((a, s) => a + s.r, 0) / n,
                  g: baselineRGBSamplesRef.current.reduce((a, s) => a + s.g, 0) / n,
                  b: baselineRGBSamplesRef.current.reduce((a, s) => a + s.b, 0) / n,
                };
              }
              inChallengeRef.current = true;
              challengesRef.current = pickChallenges(2);
              challengeIdxRef.current = 0;
              challengeFrameRef.current = 0;
              challengePassedRef.current = false;
              challengeMovementFramesRef.current = 0;
              const c = challengesRef.current[0];
              setStatus(CHALLENGE_LABELS[c]);
              setProgress(0);
            }
          } else if (inChallengeRef.current) {
            const challenge = challengesRef.current[challengeIdxRef.current];
            if (challenge) {
              challengeFrameRef.current++;

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

                let moved = false;
                if (challenge === 'turn_left' && deltaX > 0.06) moved = true;
                else if (challenge === 'turn_right' && deltaX < -0.06) moved = true;
                else if (challenge === 'look_up' && deltaY < -0.04) moved = true;
                else if (challenge === 'look_down' && deltaY > 0.04) moved = true;

                if (moved) challengeMovementFramesRef.current++;
              }

              const cPct = Math.min(100, Math.round((challengeFrameRef.current / CHALLENGE_FRAMES) * 100));
              setProgress(cPct);

              if (challengeFrameRef.current >= CHALLENGE_FRAMES) {
                const passed = challengeMovementFramesRef.current >= 8;
                if (passed) challengeScoreRef.current += 15;
                challengeResultsRef.current.push({ label: CHALLENGE_LABELS[challenge], pts: passed ? 15 : 0 });

                challengeIdxRef.current++;
                if (challengeIdxRef.current >= challengesRef.current.length) {
                  // Challenges done — start flash liveness phase
                  inChallengeRef.current = false;
                  inFlashRef.current = true;
                  flashStepRef.current = 0;
                  flashFrameCountRef.current = 0;
                  flashStepSamplesRef.current = [];
                  setFlashColor('red');
                  setStatus('Look at the screen — checking light reflection');
                  setProgress(0);
                } else {
                  challengeFrameRef.current = 0;
                  challengePassedRef.current = false;
                  challengeMovementFramesRef.current = 0;
                  const next = challengesRef.current[challengeIdxRef.current];
                  setStatus(CHALLENGE_LABELS[next]);
                  setProgress(0);
                }
              } else {
                const remainSec = Math.max(0, (CHALLENGE_FRAMES - challengeFrameRef.current) / FRAME_RATE);
                setStatus(
                  challengeMovementFramesRef.current >= 8
                    ? `Good! Hold position (${remainSec.toFixed(1)}s left)`
                    : `${CHALLENGE_LABELS[challenge]} (${remainSec.toFixed(1)}s left)`
                );
              }
            }
          } else if (inFlashRef.current) {
            // Flash liveness phase: cycle red/green/blue, measure face color response
            const colors: ('red' | 'green' | 'blue')[] = ['red', 'green', 'blue'];
            flashFrameCountRef.current++;

            if (flashFrameCountRef.current >= FLASH_FRAMES) {
              // Average this color's samples (skip first 2 frames to let screen settle)
              const samples = flashStepSamplesRef.current.slice(2);
              if (samples.length > 0) {
                const n = samples.length;
                flashSamplesRef.current.push({
                  color: colors[flashStepRef.current],
                  r: samples.reduce((a, s) => a + s.r, 0) / n,
                  g: samples.reduce((a, s) => a + s.g, 0) / n,
                  b: samples.reduce((a, s) => a + s.b, 0) / n,
                });
              }
              flashStepRef.current++;
              flashFrameCountRef.current = 0;
              flashStepSamplesRef.current = [];

              if (flashStepRef.current >= colors.length) {
                // Flash sequence complete
                cancelAnimationFrame(rafRef.current);
                runningRef.current = false;
                setFlashColor(null);
                await computeResult();
                return;
              }
              setFlashColor(colors[flashStepRef.current]);
            }
            const flashPct = Math.round((flashStepRef.current / colors.length) * 100 + (flashFrameCountRef.current / FLASH_FRAMES) * (100 / colors.length));
            setProgress(Math.min(100, flashPct));
          }
        } else {
          setStatus(frameCountRef.current > 15 ? 'Face lost — stay centered' : 'Position face in center');
        }
      } catch { /* skip */ }

      if (runningRef.current) {
        rafRef.current = requestAnimationFrame(checkFrame);
      }
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

      const chalPts = challengeScoreRef.current;
      if (chalPts > 0) reasons.push(`${chalPts}pts challenges`);
      score += chalPts;
      breakdown.push({ label: 'Challenges', pts: chalPts });

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

      // Flash liveness: verify face reflects colored flashes
      let flashPts = 0;
      const base = flashBaselineRef.current;
      if (base && flashSamplesRef.current.length === 3) {
        const flashDetails: { label: string; pts: number }[] = [];
        for (const sample of flashSamplesRef.current) {
          // A real face will see its dominant channel rise relative to the others
          // For a print/screen replay, all channels shift together (flat response)
          const dr = sample.r - base.r;
          const dg = sample.g - base.g;
          const db = sample.b - base.b;
          const positiveChannel = sample.color === 'red' ? dr : sample.color === 'green' ? dg : db;
          const otherAvg = sample.color === 'red' ? (dg + db) / 2 : sample.color === 'green' ? (dr + db) / 2 : (dr + dg) / 2;
          // Real face: target channel rises significantly above the average of the other two
          const discrimination = positiveChannel - otherAvg;
          const passed = discrimination > 8; // 8/255 ≈ 3% color shift
          if (passed) flashPts += 7;
          flashDetails.push({ label: `${sample.color.toUpperCase()} flash`, pts: passed ? 7 : 0 });
        }
        breakdown.push(...flashDetails);
        reasons.push(`flash:${flashPts}/21`);
      } else {
        reasons.push('flash:skipped');
      }
      score += flashPts;

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
      }
      let awsInfo: { label: string; value: string }[] | undefined;
      if (provider === 'aws_detect_faces' && serverUrl && canvasRef.current) {
        const canvas = canvasRef.current;
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
            // AWS DetectFaces is informational only — it detects faces and attributes,
            // but does NOT detect spoofs/replays. It is not a liveness detector.
            awsInfo = [];
            if (data.face_detected) {
              if (data.age_low != null && data.age_high != null) awsInfo.push({ label: 'Age', value: `${data.age_low}-${data.age_high}` });
              if (data.gender) awsInfo.push({ label: 'Gender', value: data.gender });
              if (data.expression) awsInfo.push({ label: 'Expression', value: data.expression });
              awsInfo.push({ label: 'Face Confidence', value: `${data.confidence?.toFixed(1) ?? '?'}%` });
              awsInfo.push({ label: 'Eyes Open', value: data.eyes_open ? `Yes (${data.eyes_open_confidence?.toFixed(0) ?? '?'}%)` : 'No' });
              awsInfo.push({ label: 'Lighting', value: data.quality_brightness?.toFixed(0) ?? '?' });
              awsInfo.push({ label: 'Sharpness', value: data.quality_sharpness?.toFixed(0) ?? '?' });
            } else {
              awsInfo.push({ label: 'AWS', value: 'No face detected' });
            }
            reasons.push(data.face_detected ? 'AWS:face detected (informational)' : 'AWS:no face');
          } catch {
            reasons.push('AWS:error');
          }
        }
      }

      // Note: AWS DetectFaces is intentionally NOT added to the score. It's a face
      // attribute analyzer, not a liveness detector. Adding its score would let a
      // printed photo pass because it has eyes open, good lighting, and high sharpness.
      if (backendScore > 0) breakdown.push({ label: 'OpenBiometrics', pts: backendScore });
      score = Math.min(100, score);
      const pass = score >= LIVENESS_PASS_THRESHOLD;
      const details = reasons.join(', ');

      runningRef.current = false;
      stopCamera();

      let recordingUrl: string | undefined;
      if (externalVideo) {
        recordingUrl = externalVideo.currentSrc || externalVideo.src || undefined;
      } else if (recordedChunksRef.current.length > 0) {
        const rawBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const recordingDurationMs = Date.now() - recordingStartRef.current;
        const fixedBlob = await fixWebmDuration(rawBlob, recordingDurationMs).catch(() => rawBlob);
        recordingUrl = URL.createObjectURL(fixedBlob);
      }
      const recordingDuration = externalVideo ? undefined : Math.round((Date.now() - recordingStartRef.current) / 1000);
      const challenges = challengeResultsRef.current.length > 0 ? challengeResultsRef.current : undefined;
      if (externalVideo) { video.pause(); }

      // Spoof prediction: based on flash response + challenge + motion
      const spoofSignals: string[] = [];
      let spoofScore = 0;
      if (base && flashSamplesRef.current.length === 3) {
        const correctFlashes = flashSamplesRef.current.filter((s) => {
          const dr = s.r - base.r, dg = s.g - base.g, db = s.b - base.b;
          const pos = s.color === 'red' ? dr : s.color === 'green' ? dg : db;
          const other = s.color === 'red' ? (dg + db) / 2 : s.color === 'green' ? (dr + db) / 2 : (dr + dg) / 2;
          return pos - other > 8;
        }).length;
        if (correctFlashes === 0) { spoofSignals.push('no light reflection on any flash'); spoofScore += 2; }
        else if (correctFlashes === 1) { spoofSignals.push('weak light reflection (1/3)'); spoofScore += 1; }
        else spoofSignals.push('natural light reflection');
      }
      const passesPassed = challengeResultsRef.current.filter((c) => c.pts > 0).length;
      if (passesPassed === 0) { spoofSignals.push('no challenges completed'); spoofScore += 1; }
      const totalChallengeFrames = challengeResultsRef.current.length;
      if (avgDelta < 0.3 && totalChallengeFrames > 0) { spoofSignals.push('unnatural stillness'); spoofScore += 1; }
      if (avgTexture < 15) { spoofSignals.push('flat skin texture'); spoofScore += 1; }
      const isSpoof = spoofScore >= 2;
      const spoofPrediction = isSpoof ? 'Likely Spoof' : 'Likely Real';
      const spoofInfo = [{ label: 'Prediction', value: spoofPrediction }, ...spoofSignals.map((s) => ({ label: 'Signal', value: s }))];

      // Pass decision: must meet score threshold AND must not be flagged as spoof
      const finalPass = pass && !isSpoof;
      if (isSpoof) reasons.push('SPOOF DETECTED');

      onComplete({ pass: finalPass, score, details: reasons.join(', '), recordingUrl, recordingDuration, breakdown, challenges, info: awsInfo ? [...awsInfo, ...spoofInfo] : spoofInfo });
    }

    rafRef.current = requestAnimationFrame(checkFrame);
  }

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  if (error) {
    return <div style={{ textAlign: 'center', padding: 12, color: '#ef4444', fontSize: 13 }}>Camera error: {error}</div>;
  }

  const isPreview = phase === 'preview' && !externalVideo;

  return (
    <div style={{ textAlign: 'center' }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} width={640} height={480} />
      <div style={isPreview ? {
        position: 'relative', borderRadius: 8, overflow: 'hidden', background: '#000', minHeight: 200, marginBottom: 8,
      } : {
        position: 'relative', maxWidth: 480, margin: '0 auto 8px',
      }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={isPreview ? { width: '100%', display: 'block', transform: 'scaleX(-1)' } : {
            width: '100%', borderRadius: 6, display: 'block', margin: '0 auto 8px', transform: externalVideo ? 'none' : 'scaleX(-1)',
          }}
        />
        {flashColor && (
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: flashColor === 'red' ? 'rgba(255, 0, 0, 0.55)' :
                         flashColor === 'green' ? 'rgba(0, 255, 0, 0.55)' :
                         'rgba(0, 100, 255, 0.55)',
            mixBlendMode: 'screen',
            transition: 'background 0.05s linear',
          }} />
        )}
      </div>
      {isPreview && cameras.length > 1 && (
        <div style={{ marginBottom: 8 }}>
          <select
            value={selectedCamera}
            onChange={(e) => switchCamera(e.target.value)}
            style={{
              width: '100%', padding: 6, background: '#0f172a', color: '#e2e8f0',
              border: '1px solid #334155', borderRadius: 6, fontSize: 12,
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
      {isPreview ? (
        <button
          onClick={() => { setPhase('running'); setStatus('Analyzing face...'); }}
          style={{
            padding: '10px 28px', fontSize: 14, fontWeight: 600, border: 'none',
            borderRadius: 8, cursor: 'pointer', background: 'linear-gradient(135deg, #581c87, #7c3aed)',
            color: '#e9d5ff', marginTop: 4,
          }}
        >
          Start Liveness
        </button>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
