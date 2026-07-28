import { initFaceLandmarker, detectFace, calculateHeadPose, destroy } from './detector';
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
    const detection = detectFace(video);
    const base64 = this.captureFrame();
    const quality = this.analyzeImageQuality(video);
    this.stopCamera();

    renderUI(container, this.config.theme || { primaryColor: '#3b82f6' }, false, [], '', () => {}, () => {}, 'Analyzing...', 'processing');
    this.setStatus('Analyzing...');

    let score = 0;
    let breakdown: { label: string; pts: number }[] = [];

    if (detection.detected && detection.landmarks) {
      const lm = detection.landmarks;

      // 1. Face Size (0-15): face should fill a good portion of the frame
      const faceWidth = this.getFaceWidth(lm);
      const faceScore = Math.max(0, Math.min(15, faceWidth * 100));
      breakdown.push({ label: 'Face Size', pts: Math.round(faceScore) });

      // 2. Face Centering (0-10): nose should be centered horizontally between ears
      const nose = lm[1];
      const leftEar = lm[234];
      const rightEar = lm[454];
      const earDist = Math.sqrt(
        (rightEar.x - leftEar.x) ** 2 + (rightEar.y - leftEar.y) ** 2
      );
      const faceCenterX = (leftEar.x + rightEar.x) / 2;
      const noseOffset = earDist > 0 ? Math.abs(nose.x - faceCenterX) / earDist : 0;
      const centeringScore = Math.max(0, Math.min(10, (1 - noseOffset * 3) * 10));
      breakdown.push({ label: 'Centering', pts: Math.round(centeringScore) });

      // 3. Head Roll (0-10): head should not be tilted
      const leftEye = lm[33];
      const rightEye = lm[263];
      const eyeDx = rightEye.x - leftEye.x;
      const eyeDy = rightEye.y - leftEye.y;
      const rollDeg = Math.abs(Math.atan2(eyeDy, eyeDx) * 180 / Math.PI);
      const rollScore = Math.max(0, Math.min(10, 10 - Math.max(0, rollDeg - 3) * 0.8));
      breakdown.push({ label: 'Head Tilt', pts: Math.round(rollScore) });

      // 4. Sharpness (0-10): blur detection via pixel variance
      const sharpnessScore = Math.max(0, Math.min(10, Math.round(quality.sharpness)));
      breakdown.push({ label: 'Sharpness', pts: sharpnessScore });

      // 5. Brightness (0-5): properly exposed
      const brightnessScore = Math.max(0, Math.min(5, Math.round(quality.brightness)));
      breakdown.push({ label: 'Brightness', pts: brightnessScore });

      score = breakdown.reduce((a, b) => a + b.pts, 0);
    }

    const passed = score >= 38;

    const result: LivenessResult = {
      passed,
      confidence: Math.min(1, score / 50),
      txnId: '',
      capturedFaceBase64: base64,
      provider: 'svi_passive_mediapipe',
      usedFallback: false,
      score: Math.round(score / 50 * 100),
      breakdown,
      info: [],
    };

    renderResult(container, result);
    const btn = container.querySelector('#svi-retry-btn');
    if (btn) btn.addEventListener('click', () => this.start());
    this.config.onComplete(result);
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

  private sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }

  destroy(): void {
    this.stopCamera();
    destroy();
    const container = this.getContainer();
    if (container) container.innerHTML = '';
  }
}