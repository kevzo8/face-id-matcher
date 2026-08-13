import { FaceLandmarker, FaceLandmarkerOptions, FilesetResolver } from '@mediapipe/tasks-vision';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
type NormalizedLandmarkList = NormalizedLandmark[];

let landmarker: any = null;
let isInitialized = false;

const MODEL_PATH = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task';

export interface FaceDetectionResult {
  detected: boolean;
  landmarks?: any;
  score?: number;
}

export interface BlinkResult {
  isBlinking: boolean;
  ear: number;
}

export interface HeadPose {
  yaw: number;
  pitch: number;
  roll: number;
}

export interface ChallengeResult {
  detected: boolean;
  confidence: number;
  details?: string;
}

export async function initFaceLandmarker(): Promise<void> {
  if (isInitialized) return;

  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm'
  );

  const { FaceLandmarker } = await import('@mediapipe/tasks-vision');
  
  const landmarkerInstance = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_PATH,
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    numFaces: 1,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
  });

  landmarker = landmarkerInstance;
  isInitialized = true;
}

export function detectFace(image: ImageData | HTMLVideoElement): { detected: boolean; landmarks?: any; score?: number } {
  if (!landmarker) return { detected: false };

  const timestamp = image instanceof HTMLVideoElement ? image.currentTime * 1000 : Date.now();
  const result = landmarker.detectForVideo(image, timestamp);
  
  return {
    detected: result.faceLandmarks !== null && result.faceLandmarks.length > 0,
    landmarks: result.faceLandmarks?.[0] ?? undefined,
    score: result.detections?.[0]?.confidence ?? 0,
  };
}

export function calculateEAR(landmarks: any): number {
  const eye = (a: number, b: number, c: number, d: number, e: number, f: number) => {
    const p1 = landmarks[a];
    const p2 = landmarks[b];
    const p3 = landmarks[c];
    const p4 = landmarks[d];
    const p5 = landmarks[e];
    const p6 = landmarks[f];

    const vert1 = Math.sqrt(Math.pow(p2.x - p6.x, 2) + Math.pow(p2.y - p6.y, 2));
    const vert2 = Math.sqrt(Math.pow(p3.x - p5.x, 2) + Math.pow(p3.y - p5.y, 2));
    const horiz = Math.sqrt(Math.pow(p1.x - p4.x, 2) + Math.pow(p1.y - p4.y, 2));

    return (vert1 + vert2) / (2 * horiz);
  };

  const leftEAR = eye(33, 160, 158, 133, 153, 144);
  const rightEAR = eye(362, 385, 387, 263, 373, 380);

  return (leftEAR + rightEAR) / 2;
}

export function detectBlink(landmarks: any, threshold = 0.25): { isBlinking: boolean; ear: number } {
  const ear = calculateEAR(landmarks);
  return {
    isBlinking: ear < threshold,
    ear,
  };
}

/** Blink depth beyond the threshold: 0 = not blinking, larger = eyes more shut.
 *  Rewards a real, sustained blink over a half-closed / twitching lid. */
export function estimateBlinkDepth(landmarks: any, threshold = 0.25): number {
  const ear = calculateEAR(landmarks);
  if (ear >= threshold) return 0;
  return Math.min(1, (threshold - ear) / threshold);
}

/**
 * Gaze direction from MediaPipe's 478-point model. Points 468 (left) and
 * 473 (right) are iris centres; we measure how far each iris sits between the
 * eye corners. Returns ~[-1,1] horizontal and vertical gaze.
 */
export function calculateGaze(landmarks: any): { x: number; y: number } {
  const p = (i: number) => landmarks[i];
  const lerp = (a: any, b: any, t: number) => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  });

  // Left eye: corners 33 (outer) -> 133 (inner); right eye: 362 (inner) -> 263 (outer)
  const leftOuter = p(33), leftInner = p(133);
  const rightInner = p(362), rightOuter = p(263);

  const dist = (a: any, b: any) => Math.hypot(a.x - b.x, a.y - b.y);

  const leftGazeX = clamp((leftOuter.x - p(468).x) / (dist(leftOuter, leftInner) + 1e-6), -1, 1);
  const rightGazeX = clamp((rightOuter.x - p(473).x) / (dist(rightOuter, rightInner) + 1e-6), -1, 1);

  // Vertical: iris between a point above/below the eye. Approximate with outer
  // corner -> inner corner midpoint and the iris. Keep small; gaze Y is noisy.
  const lMid = lerp(leftOuter, leftInner, 0.5);
  const lIrisToMidY = p(468).y - lMid.y;
  const gazeY = clamp(-lIrisToMidY * 6, -1, 1);

  return { x: clamp((leftGazeX + rightGazeX) / 2, -1, 1), y: gazeY };
}

/**
 * Downsample the video to grayscale pixels for frame-level analysis
 * (micro-motion between frames, texture flatness for print detection).
 */
export function sampleFramePixels(video: HTMLVideoElement, w = 160, h = 120): Uint8ClampedArray | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(video, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    const gray = new Uint8ClampedArray(w * h);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      gray[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    return gray;
  } catch {
    return null;
  }
}

/** Normalized per-pixel absolute difference between two grayscale frames [0..1]. */
export function computeFrameDiff(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  if (!a || !b || a.length !== b.length) return 0;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / (a.length * 255);
}

/** Texture flatness of a grayscale frame [0..1]. Real skin has local variance;
 *  a printed photo / screen is unnaturally flat in small patches. */
export function computeFrameFlatness(pixels: Uint8ClampedArray): number {
  if (!pixels || pixels.length < 4) return 0;
  const g = (i: number) => pixels[i];
  let blockVar = 0;
  const block = 8;
  const w = 160, h = 120;
  let blocks = 0;
  for (let by = 0; by < h; by += block) {
    for (let bx = 0; bx < w; bx += block) {
      let sum = 0, sum2 = 0, n = 0;
      for (let y = by; y < Math.min(by + block, h); y += 2) {
        for (let x = bx; x < Math.min(bx + block, w); x += 2) {
          const v = g(y * w + x);
          sum += v; sum2 += v * v; n++;
        }
      }
      if (n > 1) {
        const mean = sum / n;
        blockVar += (sum2 / n - mean * mean);
        blocks++;
      }
    }
  }
  const avgVar = blocks ? blockVar / blocks : 0;
  // Flat frames -> low variance. Return flatness scaled so ~0 var => 1 (flat).
  return clamp(1 - avgVar / 1200, 0, 1);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function calculateHeadPose(landmarks: any): { yaw: number; pitch: number; roll: number } {
  const nose = landmarks[1];
  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];
  const forehead = landmarks[10];
  const chin = landmarks[152];

  const dist = (a: any, b: any) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

  // Yaw: asymmetry of the nose between the two face silhouette points.
  // Turning left shrinks nose->left edge; turning right shrinks nose->right edge.
  const noseToLeft = dist(nose, leftCheek);
  const noseToRight = dist(nose, rightCheek);
  const yaw = (noseToRight - noseToLeft) / (noseToLeft + noseToRight + 1e-6); // ~[-1, 1]

  // Pitch: where the nose sits vertically between forehead and chin.
  const faceHeight = dist(forehead, chin);
  const noseToForehead = dist(nose, forehead);
  const pitch = 0.5 - noseToForehead / (faceHeight + 1e-6); // >0 looking up, <0 looking down

  const roll = Math.atan2(rightCheek.y - leftCheek.y, rightCheek.x - leftCheek.x);

  return { yaw, pitch, roll };
}

export function detectHeadMovement(
  landmarks: any,
  prevLandmarks: any | null,
  threshold = 0.04
): { yaw: number; pitch: number; moved: boolean } {
  if (!prevLandmarks) {
    return { yaw: 0, pitch: 0, moved: false };
  }

  const currHead = calculateHeadPose(landmarks);
  const prevHead = calculateHeadPose(prevLandmarks);

  const deltaYaw = Math.abs(currHead.yaw - prevHead.yaw);
  const deltaPitch = Math.abs(currHead.pitch - prevHead.pitch);

  return {
    yaw: deltaYaw,
    pitch: deltaPitch,
    moved: deltaYaw > threshold || deltaPitch > threshold,
  };
}

export function destroy(): void {
  if (landmarker) {
    landmarker.close();
    isInitialized = false;
  }
}