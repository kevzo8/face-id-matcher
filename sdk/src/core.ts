import type { SviLivenessConfig, LivenessResult, SdkError, SessionResponse, LivenessApiResponse } from './types';

const VERSION = '1.0.0';

const DEFAULT_THEME = {
  primaryColor: '#3b82f6',
  buttonText: '#ffffff',
  accentColor: '#22c55e',
};

export class SviLivenessCore {
  public mode: 'active' | 'passive';
  public config: SviLivenessConfig;
  public theme: typeof DEFAULT_THEME;
  private container: HTMLElement | null = null;
  private sessionId: string | null = null;
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;

  constructor(config: SviLivenessConfig) {
    this.config = config;
    this.mode = config.mode;
    this.theme = { ...DEFAULT_THEME, ...config.theme };
  }

  async init(): Promise<void> {
    this.container = document.getElementById(this.config.containerId)
      || document.querySelector(this.config.containerId);
    if (!this.container) throw new Error(`Container #${this.config.containerId} not found`);

    this.container.innerHTML = '';
    this.container.style.position = 'relative';
    this.container.style.overflow = 'hidden';
    this.container.style.borderRadius = '12px';
    this.container.style.background = '#000';
    this.container.style.minHeight = '320px';

    await this.createSession();
  }

  async createSession(): Promise<void> {
    try {
      const url = `${this.config.backendUrl.replace(/\/+$/, '')}/api/v1/session/create`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Sdk-Version': VERSION,
      };
      if (this.config.apiKey) headers['Authorization'] = `Bearer ${this.config.apiKey}`;

      this.emitApiLog('POST', url, {}, '—');

      const res = await fetch(url, { method: 'POST', headers });
      const data: SessionResponse = await res.json();
      if (!res.ok) throw new Error(`Session creation failed: ${res.status}`);
      this.sessionId = data.session_id;
      this.emitApiLog('POST', url, {}, data);
    } catch (e) {
      this.config.onError({ code: 'SESSION_ERROR', message: (e as Error).message });
    }
  }

  async startCamera(): Promise<HTMLVideoElement> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cams = devices.filter(d => d.kind === 'videoinput')
      .sort((a, b) => {
        const aV = /obs|virtual|streamlabs/i.test(a.label) ? 1 : 0;
        const bV = /obs|virtual|streamlabs/i.test(b.label) ? 1 : 0;
        return aV - bV;
      });

    const constraints: MediaStreamConstraints[] = [];
    if (cams.length > 0) {
      constraints.push({ video: { deviceId: { exact: cams[0].deviceId } }, audio: false });
    }
    constraints.push(
      { video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
      { video: true, audio: false },
    );

    let stream: MediaStream | null = null;
    for (const c of constraints) {
      try { stream = await navigator.mediaDevices.getUserMedia(c); break; } catch { }
    }
    if (!stream) throw new Error('Camera access denied');

    this.stream = stream;
    const video = document.createElement('video');
    video.srcObject = stream;
    video.playsInline = true;
    video.muted = true;
    video.autoplay = true;
    video.style.width = '100%';
    video.style.display = 'block';
    video.style.transform = 'scaleX(-1)';
    await video.play();
    this.video = video;
    return video;
  }

  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
  }

  captureFrame(): string {
    const video = this.video;
    if (!video) throw new Error('No video element available — camera may not have started');

    const canvas = this.canvas || document.createElement('canvas');
    this.canvas = canvas;
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas 2D context');

    ctx.drawImage(video, 0, 0, 640, 480);
    return canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
  }

  captureFrameWithBbox(): { image: string; bbox: number[] } {
    const canvas = this.canvas || document.createElement('canvas');
    this.canvas = canvas;
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(this.video!, 0, 0, 640, 480);
    const image = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
    return { image, bbox: [0, 0, 1, 1] };
  }

  async callLivenessApi(image: string, challengeData?: Record<string, unknown>): Promise<LivenessResult> {
    const url = `${this.config.backendUrl.replace(/\/+$/, '')}/api/v1/liveness`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Sdk-Version': VERSION,
    };
    if (this.config.apiKey) headers['Authorization'] = `Bearer ${this.config.apiKey}`;

    const reqBody = { mode: this.mode, image: image.slice(0, 40) + '...[truncated]', session_id: this.sessionId, challenge_data: challengeData || null };
    this.emitApiLog('POST', url, reqBody, '—');

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        mode: this.mode,
        image,
        session_id: this.sessionId,
        challenge_data: challengeData || null,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      this.emitApiLog('POST', url, reqBody, { error: err });
      throw new Error(`Liveness API error (${res.status}): ${err}`);
    }

    const data: LivenessApiResponse = await res.json();
    this.emitApiLog('POST', url, reqBody, data);
    return {
      passed: data.passed,
      confidence: data.confidence,
      txnId: data.txn_id,
      capturedFaceBase64: data.captured_face,
      provider: data.provider,
      usedFallback: data.used_fallback,
    };
  }

  async callPassiveEndpoint(image: string): Promise<{ is_real: boolean; confidence: number; score: number; breakdown?: any[]; info?: any[]; error?: string }> {
    const url = `${this.config.backendUrl.replace(/\/+$/, '')}/liveness/passive`;
    const reqBody = { image: image.slice(0, 40) + '...[truncated]', provider: 'heuristic' };
    this.emitApiLog('POST', url, reqBody, '—');
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, provider: 'heuristic' }),
    });
    const data = await res.json();
    this.emitApiLog('POST', url, reqBody, data);
    return data;
  }

  async callDetectObjects(image: string): Promise<{ is_real: boolean; confidence: number; score: number; breakdown?: any[]; info?: any[]; error?: string }> {
    const url = `${this.config.backendUrl.replace(/\/+$/, '')}/liveness/detect-objects`;
    const reqBody = { image: image.slice(0, 40) + '...[truncated]' };
    this.emitApiLog('POST', url, reqBody, '—');
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image }),
    });
    const data = await res.json();
    this.emitApiLog('POST', url, reqBody, data);
    return data;
  }

  private emitApiLog(method: string, url: string, request: any, response: any): void {
    const prefix = url.includes('/session/') ? '[SESSION]' : url.includes('/liveness') ? '[LIVENESS]' : '[API]';
    console.log(`%c${prefix} ${method} ${url}`, 'color:#3b82f6;font-weight:bold');
    console.log('  REQ:', request);
    console.log('  RES:', response);
    window.dispatchEvent(new CustomEvent('svi:api-log', {
      detail: { method, url, request, response, timestamp: new Date().toISOString() },
    }));
  }

  getContainer(): HTMLElement | null {
    return this.container;
  }

  getVideo(): HTMLVideoElement | null {
    return this.video;
  }

  setStatus(text: string): void {
    const el = this.container?.querySelector('.svi-status');
    if (el) el.textContent = text;
  }

  destroy(): void {
    this.stopCamera();
    if (this.container) this.container.innerHTML = '';
  }
}
