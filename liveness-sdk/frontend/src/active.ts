import { initFaceLandmarker, detectFace, detectBlink, estimateBlinkDepth, calculateHeadPose, detectHeadMovement, sampleFramePixels, computeFrameDiff, computeFrameFlatness, destroy } from './detector';
import { renderUI, renderResult, renderError } from './ui';
import { SviLivenessCore } from './core';
import type { SviLivenessConfig, LivenessResult } from './types';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
type NormalizedLandmarkList = NormalizedLandmark[];

const CHALLENGES = [
  { id: 'look_straight', label: 'Look straight at the camera', duration: 2000, axis: null, targetSign: 0 },
  { id: 'blink', label: 'Blink your eyes slowly', duration: 3000, axis: null, targetSign: 0 },
  { id: 'turn_left', label: 'Turn your head slightly left', duration: 2000, axis: 'yaw', targetSign: -1 },
  { id: 'turn_right', label: 'Turn your head slightly right', duration: 2000, axis: 'yaw', targetSign: 1 },
  { id: 'look_up', label: 'Look up slightly', duration: 2000, axis: 'pitch', targetSign: 1 },
  { id: 'look_down', label: 'Look down slightly', duration: 2000, axis: 'pitch', targetSign: -1 },
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
    const challengePassed: boolean[] = [];
    const challengeResults: { label: string; pts: number }[] = [];
    let capturedFaceBase64 = '';
    let spoofInfo: { label: string; value: string }[] = [];

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

      // Capture frames during challenge (landmarks + live pixel sample so the
      // anti-spoof motion check reflects actual motion, not the frozen frame)
      const frames: NormalizedLandmarkList[] = [];
      const pixelSamples: Uint8ClampedArray[] = [];
      const interval = setInterval(() => {
        try {
          const detection = detectFace(this.getVideo()!);
          if (detection.detected && detection.landmarks) {
            frames.push(detection.landmarks);
          }
          const px = sampleFramePixels(this.getVideo()!);
          if (px) pixelSamples.push(px);
        } catch { }
      }, 100);

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
        challengePassed.push(false);
        challengeResults.push({ label: challenge.label, pts: 0 });
        continue;
      }

      // Anti-spoof: average frame flatness + inter-frame stillness over the
      // challenge. A held photo / replay looks flat and frozen.
      let flatness = 0;
      let frameDiff = 0;
      let pxCompare = 0;
      {
        let flatSum = 0;
        for (const px of pixelSamples) flatSum += computeFrameFlatness(px);
        flatness = pixelSamples.length ? flatSum / pixelSamples.length : 0;
        for (let i = 0; i < pixelSamples.length - 1; i++) {
          frameDiff += computeFrameDiff(pixelSamples[i], pixelSamples[i + 1]);
          pxCompare++;
        }
        frameDiff = pxCompare ? frameDiff / pxCompare : 0;
      }

      let score = 0;
      let breakdown = 0;
      let passed = false;

      const movementThreshold = challenge.axis === null ? 0.1 : 0.04;

      switch (challenge.id) {
        case 'look_straight':
          let stillCount = 0;
          let prevStill: NormalizedLandmarkList | null = null;
          // Baseline head pose to also check the face is near-frontal
          let neutralDist = 0;
          let neutralN = 0;
          for (const landmarks of frames) {
            if (prevStill) {
              const result = detectHeadMovement(landmarks, prevStill, 0.1);
              if (!result.moved) stillCount++;
            }
            prevStill = landmarks;
            // Frontal check: yaw/pitch magnitude should stay small while straight
            const pose = calculateHeadPose(landmarks);
            neutralDist += Math.abs(pose.yaw) + Math.abs(pose.pitch);
            neutralN++;
          }
          const stillRatio = frames.length > 1 ? stillCount / (frames.length - 1) : 0;
          const avgNeutralDev = neutralN ? neutralDist / neutralN : 0;
          score = Math.min(15, Math.max(0, stillRatio * 15));
          if (score > 13 && avgNeutralDev < 0.35) { passed = true; score = 15; }
          else score = Math.round(score);
          breakdown = Math.round(stillRatio * 100);
          // Reinforce risk: frozen sub-frame = replay/photo
          if (frameDiff < 0.015 && flatness > 0.7) spoofInfo.push({ label: 'flat/replay', value: 'frozen' });
          break;

        case 'blink':
          let blinkCount = 0;
          let depthSum = 0;
          let wasBlinking = false;
          for (const landmarks of frames) {
            const { isBlinking, ear } = detectBlink(landmarks, 0.32);
            const depth = estimateBlinkDepth(landmarks, 0.32);
            depthSum += depth;
            if (isBlinking && !wasBlinking) blinkCount++;
            wasBlinking = isBlinking;
            void ear;
          }
          const avgDepth = frames.length ? depthSum / frames.length : 0;
          score = Math.min(15, Math.max(0, blinkCount * 7.5));
          // A single deep, clean blink earns pass
          if (blinkCount >= 1 && avgDepth > 0.25) { passed = true; score = 15; }
          else score = Math.round(score);
          breakdown = blinkCount;
          break;

        case 'turn_left':
        case 'turn_right':
        case 'look_up':
        case 'look_down':
          // Direction-aware: compute signed displacement from the first frame
          // on the challenge axis, require it to cross toward the expected sign,
          // then return toward neutral.
          const first = calculateHeadPose(frames[0]);
          let maxAbs = 0;
          let correctFrames = 0;
          let wrongFrames = 0;
          let returnFrames = 0;
          let hitTarget = false;
          const assessable = frames.length - 1;
          for (let i = 1; i < frames.length; i++) {
            const curr = calculateHeadPose(frames[i]);
            const yawDis = curr.yaw - first.yaw;
            const pitchDis = curr.pitch - first.pitch;
            const axisVal: number = challenge.axis === 'yaw' ? yawDis : pitchDis;
            maxAbs = Math.max(maxAbs, Math.abs(axisVal));
            const sign = Math.sign(axisVal) || 0;
            if (sign === challenge.targetSign) {
              correctFrames++;
              if (Math.abs(axisVal) > 0.06) hitTarget = true;
            } else if (sign !== 0) {
              wrongFrames++;
            }
            // Return-to-center in the final 1/3 of the window
            if (i >= assessable * 2 / 3 && Math.abs(axisVal) < 0.03) returnFrames++;
          }
          const correctRatio = assessable ? correctFrames / assessable : 0;
          score = Math.round(Math.min(15, Math.max(0,
            correctRatio * 12 + (hitTarget ? 4 : 0) - wrongFrames * 0.5)));
          breakdown = Math.round(correctRatio * 100);
          passed = hitTarget && correctRatio > 0.4 && (returnFrames / (assessable / 3 + 1)) > 0.1;
          break;

        default:
          score = 0;
          breakdown = 0;
      }

      // Frames that look frozen overall (replay/photo) cannot pass a living challenge
      if (challenge.id !== 'blink' && frameDiff < 0.002 && flatness > 0.75 && passed) {
        passed = false;
      }

      scores.push(score);
      challengePassed.push(passed);
      challengeResults.push({ label: challenge.label, pts: score });
    }

    this.stopCamera();

    // Calculate total score
    const totalScore = scores.reduce((a, b) => a + b, 0);
    const maxScore = CHALLENGES.length * 15; // 6 challenges × 15 = 90
    const finalScore = Math.min(totalScore, maxScore);
    const passedCount = challengePassed.filter(Boolean).length;
    // Gate: must clear a majority of challenges AND the frontal/living core
    const coreChallenged = ['look_straight', 'blink'].every((id, i) => {
      const idx = CHALLENGES.findIndex(c => c.id === id);
      return idx >= 0 && challengePassed[idx];
    });
    const passed = passedCount >= 4 && coreChallenged;

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
      info: spoofInfo,
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