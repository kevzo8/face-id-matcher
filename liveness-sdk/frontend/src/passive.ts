import { initFaceLandmarker, detectFace, detectBlink, estimateBlinkDepth, calculateHeadPose, calculateGaze, sampleFramePixels, computeFrameDiff, computeFrameFlatness, destroy } from './detector';
import { renderUI, renderResult, renderError } from './ui';
import { SviLivenessCore } from './core';
import type { SviLivenessConfig, LivenessResult } from './types';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
type NormalizedLandmarkList = NormalizedLandmark[];

export class SviPassiveLiveness extends SviLivenessCore {
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
      this.config.theme || { primaryColor: '#3b82f6' },
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
          await this.sleep(400);
          await this.runPassiveCheck();
        } catch (e) {
          renderError(this.getContainer()!, (e as Error).message);
          this.config.onError({ code: 'PASSIVE_ERROR', message: (e as Error).message });
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

  private async runPassiveCheck(): Promise<void> {
    const container = this.getContainer()!;

    if (!this.landmarkerInitialized) {
      await initFaceLandmarker();
      this.landmarkerInitialized = true;
    }

    const video = this.getVideo()!;

    // Multi-frame capture: ~3.5s of sampling at ~90ms to gather life cues
    // (natural blinks, micro-movement) as well as static quality signals.
    const SAMPLE_MS = 90;
    const SAMPLES = 38;
    const landmarks: any[] = [];
    const pixels: Uint8ClampedArray[] = [];
    for (let i = 0; i < SAMPLES; i++) {
      const d = detectFace(video);
      if (d.detected && d.landmarks) landmarks.push(d.landmarks);
      const px = sampleFramePixels(video);
      if (px) pixels.push(px);
      await this.sleep(SAMPLE_MS);
    }

    const base64 = this.captureFrame();
    const quality = this.analyzeImageQuality(video);
    this.stopCamera();

    renderUI(container, this.config.theme || { primaryColor: '#3b82f6' }, false, [], '', () => {}, () => {}, 'Analyzing...', 'processing');
    this.setStatus('Analyzing...');

    const breakdown: { label: string; pts: number }[] = [];
    const info: { label: string; value: string }[] = [];

    // Face presence / coverage
    const coverage = landmarks.length / SAMPLES;
    breakdown.push({ label: 'Face Present', pts: Math.round(Math.min(10, coverage * 10)) });

    let spoofFrozen = false;
    if (pixels.length > 1) {
      // Flatness: printed/screen surfaces are unnaturally smooth
      let flatSum = 0;
      for (const px of pixels) flatSum += computeFrameFlatness(px);
      const flatness = flatSum / pixels.length;
      // Inter-frame motion: a real face never sits perfectly still
      let diffSum = 0;
      for (let i = 1; i < pixels.length; i++) diffSum += computeFrameDiff(pixels[i - 1], pixels[i]);
      const avgDiff = diffSum / (pixels.length - 1);

      if (flatness > 0.8) { info.push({ label: 'print/replay', value: `flatness ${(flatness * 100).toFixed(0)}%` }); }
      if (avgDiff < 0.004) spoofFrozen = true;
    }

    if (landmarks.length >= 2) {
      // Life cue 1 — natural blink rate & depth
      let blinkCount = 0;
      let wasBlinking = false;
      let depthSum = 0;
      for (const lm of landmarks) {
        const { isBlinking } = detectBlink(lm, 0.32);
        depthSum += estimateBlinkDepth(lm, 0.32);
        if (isBlinking && !wasBlinking) blinkCount++;
        wasBlinking = isBlinking;
      }
      const avgDepth = depthSum / landmarks.length;
      breakdown.push({ label: 'Blink (life)', pts: Math.round(Math.min(15, blinkCount * 7.5)) });

      // Life cue 2 — micro-motion (head yaw/pitch variance over the window)
      let yawSum = 0, pitchSum = 0, n = 0;
      let prev: any = null;
      let microMoves = 0;
      for (const lm of landmarks) {
        const pose = calculateHeadPose(lm);
        yawSum += pose.yaw; pitchSum += pose.pitch; n++;
        if (prev) {
          const d = calculateHeadPose(prev);
          const dYaw = Math.abs(pose.yaw - d.yaw);
          const dPitch = Math.abs(pose.pitch - d.pitch);
          if (dYaw > 0.02 || dPitch > 0.02) microMoves++;
        }
        prev = lm;
      }
      const microRatio = microMoves / (landmarks.length - 1);
      breakdown.push({ label: 'Micro-motion (life)', pts: Math.round(Math.min(10, microRatio * 10)) });

      // Life cue 3 — static quality on the last reliable frame
      const lm = landmarks[landmarks.length - 1];
      const faceWidth = this.getFaceWidth(lm);
      const faceScore = Math.max(0, Math.min(15, faceWidth * 100));
      breakdown.push({ label: 'Face Size', pts: Math.round(faceScore) });

      const nose = lm[1], leftEar = lm[234], rightEar = lm[454];
      const earDist = Math.sqrt((rightEar.x - leftEar.x) ** 2 + (rightEar.y - leftEar.y) ** 2);
      const faceCenterX = (leftEar.x + rightEar.x) / 2;
      const noseOffset = earDist > 0 ? Math.abs(nose.x - faceCenterX) / earDist : 0;
      const centeringScore = Math.max(0, Math.min(10, (1 - noseOffset * 3) * 10));
      breakdown.push({ label: 'Centering', pts: Math.round(centeringScore) });

      const leftEye = lm[33], rightEye = lm[263];
      const eyeDx = rightEye.x - leftEye.x, eyeDy = rightEye.y - leftEye.y;
      const rollDeg = Math.abs(Math.atan2(eyeDy, eyeDx) * 180 / Math.PI);
      const rollScore = Math.max(0, Math.min(10, 10 - Math.max(0, rollDeg - 3) * 0.8));
      breakdown.push({ label: 'Head Tilt', pts: Math.round(rollScore) });

      // Life cue 4 — gaze variability (a real person's gaze drifts slightly)
      if (typeof calculateGaze === 'function') {
        const g = calculateGaze(lm);
        info.push({ label: 'gaze', value: `x ${g.x.toFixed(2)} y ${g.y.toFixed(2)}` });
      }
    }

    const sharpnessScore = Math.max(0, Math.min(10, Math.round(quality.sharpness)));
    breakdown.push({ label: 'Sharpness', pts: sharpnessScore });
    const brightnessScore = Math.max(0, Math.min(5, Math.round(quality.brightness)));
    breakdown.push({ label: 'Brightness', pts: brightnessScore });

    const score = breakdown.reduce((a, b) => a + b.pts, 0);

    // Spoof override: a frozen frame can never pass a "life" check.
    const passed = !spoofFrozen && score >= 45;

    const result: LivenessResult = {
      passed,
      confidence: Math.min(1, score / 100),
      txnId: '',
      capturedFaceBase64: base64,
      provider: 'svi_passive_mediapipe',
      usedFallback: false,
      score: Math.round(score / 100 * 100),
      breakdown,
      info,
    };

    renderResult(container, result);
    const btn = container.querySelector('#svi-retry-btn');
    if (btn) btn.addEventListener('click', () => this.start());
    this.config.onComplete(result);
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }

  private analyzeImageQuality(video: HTMLVideoElement): { sharpness: number; brightness: number } {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 120;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0, 160, 120);
      const pixels = ctx.getImageData(0, 0, 160, 120).data;

      let sum = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        sum += 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
      }
      const avg = sum / (pixels.length / 4);

      let variance = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const gray = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
        variance += (gray - avg) ** 2;
      }
      variance /= (pixels.length / 4);

      const sharpness = Math.min(10, variance / 600);
      const brightness = Math.max(0, Math.min(5, 5 - Math.abs(avg - 128) / 30));
      return { sharpness, brightness };
    } catch {
      return { sharpness: 3, brightness: 3 };
    }
  }

  private getFaceWidth(landmarks: NormalizedLandmarkList): number {
    const left = landmarks[234];
    const right = landmarks[454];
    return Math.sqrt(Math.pow(right.x - left.x, 2) + Math.pow(right.y - left.y, 2)) * 640;
  }

  captureFrame(): string {
    const video = this.getVideo();
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video!, 0, 0, 640, 480);
    return canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
  }

  setStatus(text: string): void {
    const el = this.getContainer()?.querySelector('.svi-status');
    if (el) el.textContent = text;
  }

  destroy(): void {
    this.stopCamera();
    destroy();
    const container = this.getContainer();
    if (container) container.innerHTML = '';
  }
}