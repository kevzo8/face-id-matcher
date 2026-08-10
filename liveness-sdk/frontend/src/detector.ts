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

export function calculateHeadPose(landmarks: any): { yaw: number; pitch: number; roll: number } {
  const nose = landmarks[1];
  const leftEyeCenter = landmarks[33];
  const rightEyeCenter = landmarks[263];
  const leftMouth = landmarks[61];
  const rightMouth = landmarks[291];

  const eyeDist = Math.sqrt(
    Math.pow(rightEyeCenter.x - leftEyeCenter.x, 2) +
    Math.pow(rightEyeCenter.y - leftEyeCenter.y, 2)
  );

  const mouthDist = Math.sqrt(
    Math.pow(rightMouth.x - leftMouth.x, 2) +
    Math.pow(rightMouth.y - leftMouth.y, 2)
  );

  const mouthToNose = Math.sqrt(
    Math.pow(nose.x - (leftMouth.x + rightMouth.x) / 2, 2) +
    Math.pow(nose.y - (leftMouth.y + rightMouth.y) / 2, 2)
  );

  const yaw = (mouthToNose / eyeDist) * 45;
  const pitch = mouthToNose > 0.3 ? 30 : -20;
  const roll = Math.sin((rightEyeCenter.y - leftEyeCenter.y) * 100);

  return { yaw: Math.max(-45, Math.min(45, yaw)), pitch: Math.max(-30, Math.min(30, pitch)), roll };
}

export function detectHeadMovement(
  landmarks: any,
  prevLandmarks: any | null,
  threshold = 0.5
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