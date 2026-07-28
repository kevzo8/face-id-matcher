import { initFaceLandmarker, detectFace, calculateEAR, detectBlink, calculateHeadPose, detectHeadMovement, destroy } from './detector';
import { renderUI, renderResult, renderError } from './ui';
import { SviLivenessCore } from './core';
import type { SviLivenessConfig, LivenessResult } from './types';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
type NormalizedLandmarkList = NormalizedLandmark[];

const CHALLENGES = [
  { id: 'look_straight', label: 'Look straight at the camera', duration: 2000 },
  { id: 'blink', label: 'Blink your eyes slowly', duration: 3000 },
  { id: 'turn_left', label: 'Turn your head slightly left', duration: 2000 },
  { id: 'turn_right', label: 'Turn your head slightly right', duration: 2000 },
  { id: 'look_up', label: 'Look up slightly', duration: 2000 },
  { id: 'look_down', label: 'Look down slightly', duration: 2000 },
] as const;

export class SviActiveLiveness extends SviLivenessCore {
  private selectedCameraId: string | null = null;
  private cameras: MediaDeviceInfo[] = [];
  private landmarkerInitialized = false;

  constructor(public config: SviLivenessConfig) {
    super(config);
  }

  async start(): Promise<void> {
    await this.init();

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.cameras = devices.filter(d => d.kind === 'videoinput');
      this.selectedCameraId = this.pickBestCamera(this.cameras)?.deviceId || null;
    } catch { }

    const hasMultiple = this.cameras.length > 1;

    renderUI(
      this.getContainer()!,
      this.theme,
      hasMultiple,
      this.cameras,
      this.selectedCameraId || '',
      async (deviceId) => {
        this.selectedCameraId = deviceId;
        this.stopCamera();
        await this.startCameraPreview();
      },
      async () => {
        try {
          await this.startCameraPreview();
          await this.runChallenges();
        } catch (e) {
          renderError(this.getContainer()!, (e as Error).message);
          this.config.onError({ code: 'ACTIVE_ERROR', message: (e as Error).message });
        }
      },
      'Ready',
      'preview',
    );

    await this.startCameraPreview();
  }

  private pickBestCamera(cams: MediaDeviceInfo[]): MediaDeviceInfo | null {
    if (!cams.length) return null;
    return cams
      .map(c => ({ cam: c, isVirtual: /obs|virtual|streamlabs|splitcam|manycam/i.test(c.label) }))
      .sort((a, b) => (a.isVirtual ? 1 : 0) - (b.isVirtual ? 1 : 0))[0].cam;
  }

  private async startCameraPreview(): Promise<void> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cams = devices.filter(d => d.kind === 'videoinput');
    const target = this.selectedCameraId
      ? cams.find(c => c.deviceId === this.selectedCameraId)
      : this.pickBestCamera(cams) || cams[0];

    this.stopCamera();
    if (!target) throw new Error('No camera found');

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: target.deviceId }, width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });

    (this as any).stream = stream;
    const video = document.createElement('video');
    video.srcObject = stream;
    video.playsInline = true;
    video.muted = true;
    video.autoplay = true;
    video.style.width = '100%';
    video.style.display = 'block';
    video.style.transform = 'scaleX(-1)';

    try { await video.play(); } catch { }

    const container = this.getContainer()!;
    const existingVideo = container.querySelector('#svi-video');
    if (existingVideo) {
      existingVideo.replaceWith(video);
      video.id = 'svi-video';
    }
    (this as any).video = video;
  }

  private async runChallenges(): Promise<void> {
    const container = this.getContainer()!;
    const scores: number[] = [];
    const challengeResults: { label: string; pts: number }[] = [];
    let capturedFaceBase64 = '';

    // Initialize MediaPipe
    if (!this.landmarkerInitialized) {
      await initFaceLandmarker();
      this.landmarkerInitialized = true;
    }

    for (const challenge of CHALLENGES) {
      // Show instruction
      const area = this.getVideoArea();
      const overlay = document.createElement('div');
      overlay.className = 'svi-challenge';
      overlay.style.cssText = `position:absolute;bottom:0;left:0;right:0;padding:16px;text-align:center;background:linear-gradient(transparent,rgba(0,0,0,0.8));color:#e2e8f0;font-size:15px;font-weight:600;pointer-events:none;z-index:10;`;
      overlay.textContent = challenge.label;
      area.appendChild(overlay);

      // Capture frames during challenge
      const frames: NormalizedLandmarkList[] = [];
      const interval = setInterval(() => {
        try {
          const detection = detectFace(this.getVideo()!);
          if (detection.detected && detection.landmarks) {
            frames.push(detection.landmarks);
          }
        } catch { }
      }, 200);

      const durationMs = challenge.duration;
      const endTime = Date.now() + durationMs;

      // Wait for duration with countdown timer
      let lastTick = -1;
      while (Date.now() < endTime) {
        const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        if (remaining !== lastTick) {
          lastTick = remaining;
          overlay.textContent = challenge.label + ' (' + remaining + ')';
        }
        await new Promise(r => setTimeout(r, 100));
      }
      overlay.textContent = challenge.label + ' (0)';
      await new Promise(r => setTimeout(r, 200));

      clearInterval(interval);

      // Capture snapshot during first challenge (neutral face)
      if (challenge.id === 'look_straight') {
        capturedFaceBase64 = this.captureFrame();
      }

      // Remove overlay
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);

      // Process frames for this challenge
      if (frames.length === 0) {
        scores.push(0);
        challengeResults.push({ label: challenge.label, pts: 0 });
        continue;
      }

      let score = 0;
      let breakdown = 0;

      switch (challenge.id) {
        case 'look_straight':
          let stillCount = 0;
          let prevStill: NormalizedLandmarkList | null = null;
          for (const landmarks of frames) {
            if (prevStill) {
              const result = detectHeadMovement(landmarks, prevStill, 3.0);
              if (!result.moved) stillCount++;
            }
            prevStill = landmarks;
          }
          const stillRatio = frames.length > 1 ? stillCount / (frames.length - 1) : 0;
          score = Math.min(15, Math.max(0, stillRatio * 15));
          breakdown = Math.round(stillRatio * 100);
          break;

        case 'blink':
          let blinkCount = 0;
          let wasBlinking = false;
          for (const landmarks of frames) {
            const { isBlinking } = detectBlink(landmarks);
            if (isBlinking && !wasBlinking) blinkCount++;
            wasBlinking = isBlinking;
          }
          const blinkRate = blinkCount / (durationMs / 1000);
          score = Math.min(15, Math.max(0, blinkRate * 7.5));
          breakdown = blinkCount;
          break;

        case 'turn_left':
        case 'turn_right':
        case 'look_up':
        case 'look_down':
          let movementCount = 0;
          let prevLandmarks: NormalizedLandmarkList | null = null;
          for (const landmarks of frames) {
            const result = detectHeadMovement(landmarks, prevLandmarks);
            if (result.moved) movementCount++;
            prevLandmarks = landmarks;
          }
          score = Math.min(15, Math.max(0, movementCount * 2));
          breakdown = movementCount;
          break;

        default:
          score = 0;
          breakdown = 0;
      }

      scores.push(score);
      challengeResults.push({ label: challenge.label, pts: score });
    }

    this.stopCamera();

    // Calculate total score
    const totalScore = scores.reduce((a, b) => a + b, 0);
    const maxScore = CHALLENGES.length * 15; // 6 challenges × 15 = 90
    const finalScore = Math.min(totalScore, maxScore);
    const passed = finalScore >= maxScore * 0.75; // 75% threshold

    // Prepare result
    const result: LivenessResult = {
      passed,
      confidence: Math.min(1, finalScore / maxScore),
      txnId: '',
      capturedFaceBase64,
      provider: 'svi_active_mediapipe',
      usedFallback: false,
      score: Math.round(Math.min(1, finalScore / maxScore) * 100),
      breakdown: challengeResults.map(c => ({
        label: c.label,
        pts: c.pts,
      })),
      info: [],
    };

    renderResult(container, result);
    const btn = container.querySelector('#svi-retry-btn');
    if (btn) btn.addEventListener('click', () => this.start());
    this.config.onComplete(result);
  }

  private getVideoArea(): HTMLElement {
    const container = this.getContainer()!;
    return container.querySelector('#svi-video-area') as HTMLElement || container;
  }

  destroy(): void {
    this.stopCamera();
    destroy();
    const container = this.getContainer();
    if (container) container.innerHTML = '';
  }
}