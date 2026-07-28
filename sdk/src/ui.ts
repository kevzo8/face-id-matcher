import type { SviLivenessTheme } from './types';

export function renderUI(container: HTMLElement, theme: SviLivenessTheme, hasMultipleCameras: boolean, cameras: MediaDeviceInfo[], selectedCamera: string, onSwitchCamera: (deviceId: string) => void, onStart: () => void, status: string, phase: string): void {
  container.innerHTML = `
    <div id="svi-video-area" style="position:relative;border-radius:8px;overflow:hidden;background:#000;min-height:320px;">
      <video id="svi-video" autoplay playsinline muted
        style="width:100%;display:block;transform:scaleX(-1);"></video>
      <canvas id="svi-canvas" style="display:none;" width="640" height="480"></canvas>
      ${phase === 'processing' ? `
        <div class="svi-status" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#3b82f6;font-size:18px;font-weight:700;text-shadow:0 0 12px rgba(0,0,0,0.9);pointer-events:none;z-index:10;">${status}</div>
      ` : ''}
    </div>
    ${phase === 'preview' ? `
      ${hasMultipleCameras ? `
        <select id="svi-camera-select" style="width:100%;padding:6px;margin-top:8px;background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:6px;font-size:12px;">
          ${cameras.map((cam, i) => `<option value="${cam.deviceId}" ${cam.deviceId === selectedCamera ? 'selected' : ''}>${cam.label || `Camera ${i + 1}`}</option>`).join('')}
        </select>
      ` : ''}
      <button id="svi-start-btn" style="width:100%;padding:10px 0;margin-top:8px;font-size:14px;font-weight:600;border:none;border-radius:8px;cursor:pointer;background:linear-gradient(135deg,#14532d,#16a34a);color:#bbf7d0;">
        Start Check
      </button>
    ` : ''}
  `;

  const startBtn = container.querySelector('#svi-start-btn');
  if (startBtn) startBtn.addEventListener('click', onStart);

  const camSelect = container.querySelector('#svi-camera-select');
  if (camSelect) camSelect.addEventListener('change', (e) => onSwitchCamera((e.target as HTMLSelectElement).value));
}

export function renderResult(container: HTMLElement, result: { passed: boolean; confidence: number; score?: number; provider?: string; breakdown?: { label: string; pts: number }[]; info?: { label: string; value: string }[]; txnId?: string }): void {
  const passedBg = result.passed ? '#064e3b' : '#450a0a';
  const passedBorder = result.passed ? '#22c55e' : '#ef4444';
  const passedText = result.passed ? '#86efac' : '#fca5a5';
  const passedLabel = result.passed ? 'LIVENESS PASSED' : 'LIVENESS FAILED';

  let breakdownHtml = '';
  if (result.breakdown) {
    breakdownHtml = `<div style="margin-top:8px;font-size:11px;">${result.breakdown.map(b => `<div style="display:flex;justify-content:space-between;padding:1px 0;"><span style="color:#94a3b8;">${b.label}</span><span style="color:#e2e8f0;">${b.pts}</span></div>`).join('')}</div>`;
  }

  let infoHtml = '';
  if (result.info) {
    infoHtml = `<div style="margin-top:6px;font-size:10px;color:#64748b;">${result.info.map(i => `<div>${i.label}: <strong style="color:#94a3b8;">${i.value}</strong></div>`).join('')}</div>`;
  }

  container.innerHTML = `
    <div style="background:${passedBg};border:1px solid ${passedBorder};border-radius:8px;padding:12px;text-align:center;">
      <div style="font-size:20px;font-weight:700;color:${passedText};margin-bottom:4px;">${passedLabel}</div>
      <div style="font-size:32px;font-weight:800;color:${result.passed ? '#bbf7d0' : '#fecaca'};margin-bottom:4px;">${Math.round(result.confidence * 100)}%</div>
      <div style="color:${passedText};font-size:12px;">${result.passed ? 'Real face detected' : 'Spoof detected'}</div>
      ${result.provider ? `<div style="color:#64748b;font-size:10px;margin-top:2px;">Provider: ${result.provider}</div>` : ''}
      ${result.txnId ? `<div style="color:#475569;font-size:9px;margin-top:1px;">TXN: ${result.txnId.slice(0, 8)}...</div>` : ''}
      ${breakdownHtml}
      ${infoHtml}
      <button id="svi-retry-btn" style="margin-top:8px;padding:6px 16px;font-size:12px;border:1px solid #334155;border-radius:6px;cursor:pointer;background:#1e293b;color:#cbd5e1;">Retry</button>
    </div>
  `;
}

export function renderError(container: HTMLElement, message: string): void {
  container.innerHTML = `<div style="text-align:center;padding:12px;color:#ef4444;font-size:13px;">Error: ${message}</div>`;
}
