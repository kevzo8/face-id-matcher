import React, { useCallback, useState } from 'react';
import { ImageCapture, CaptureImageData } from './ImageCapture';

interface QualityBreakdown { label: string; pts: number; max: number; detail?: string }
interface QualityResult {
  is_usable: boolean;
  verdict: 'PASS' | 'RETAKE';
  score: number;
  sharpness: number;
  sharpness_label: 'sharp' | 'marginal' | 'blurry';
  brightness: number;
  contrast: number;
  resolution_mp: number;
  glare_detected: boolean;
  text_lines: number;
  text_words: number;
  full_text?: string[];
  text_sample?: string[];
  doc_type?: string;
  avg_confidence: number;
  low_conf_ratio: number;
  real_words: number;
  real_word_ratio: number;
  fragment_ratio: number;
  text_coverage: number;
  text_mp: number;
  camera_max_mp?: number | null;
  reasons: string[];
  breakdown: QualityBreakdown[];
  aws_checked: boolean;
  error?: string | null;
}

interface Props {
  serverUrl: string;
}

export default function DocQualityCheck({ serverUrl }: Props) {
  const [image, setImage] = useState<CaptureImageData>(null);
  const [docType, setDocType] = useState<'printed' | 'handwritten'>('printed');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QualityResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCapture = useCallback((data: CaptureImageData) => {
    setImage(data);
    setResult(null);
    setError(null);
  }, []);

  const checkQuality = useCallback(async () => {
    if (!image?.url) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const b64 = image.url.split(',')[1];
      const res = await fetch(`${serverUrl.replace(/\/+$/, '')}/document/quality`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: b64, check_text: true, camera_max_mp: image.cameraMaxMp ?? null, doc_type: docType }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail || `Server error: ${res.status}`);
      }
      const data = (await res.json()) as QualityResult;
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Quality check failed');
    } finally {
      setLoading(false);
    }
  }, [image, serverUrl, docType]);

  const pass = result?.verdict === 'PASS';

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h3 style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 15, marginBottom: 12, textAlign: 'center' }}>
        Document Quality Check
      </h3>

      <ImageCapture
        title="Document photo"
        subtitle="Use rear camera, fill frame, hold steady · JPG, PNG, or TIFF upload"
        image={image}
        onCapture={handleCapture}
        facingMode="environment"
        accentColor="#38bdf8"
        icon="card"
        mockup="id-front"
        accept="image/*,.tif,.tiff,image/tiff"
      />

      <div style={{ marginTop: 12, padding: '10px 12px', background: '#1e293b', borderRadius: 8, border: '1px solid #334155' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Document type:</span>
          {(['printed', 'handwritten'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setDocType(t); setResult(null); }}
              style={{
                padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: 'pointer',
                border: docType === t ? '1px solid #38bdf8' : '1px solid #475569',
                background: docType === t ? 'rgba(56,189,248,0.15)' : 'transparent',
                color: docType === t ? '#7dd3fc' : '#94a3b8',
              }}
            >
              {t === 'printed' ? '🖨 Printed (stricter)' : '✍ Handwritten (lenient)'}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: '#64748b', textAlign: 'center', marginTop: 6, lineHeight: 1.5 }}>
          {docType === 'printed'
            ? 'Strict mode — avg ≥ 70%, low-conf ≤ 40% cap. To lower thresholds for pen-on-paper, select Handwritten.'
            : 'Lowered thresholds — avg ≥ 50%, no low-conf cap, points split 50/50. For stricter bars on typed documents, select Printed. Share, fragment, coverage bars stay strict.'}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
        <button
          onClick={checkQuality}
          disabled={!image || loading}
          style={{
            padding: '10px 28px', fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 8,
            cursor: image && !loading ? 'pointer' : 'not-allowed',
            background: image && !loading ? '#0284c7' : '#334155', color: '#fff',
          }}
        >
          {loading ? 'Checking…' : '▣ Check Quality'}
        </button>
        <button
          onClick={() => { setImage(null); setResult(null); setError(null); }}
          style={{ padding: '10px 20px', fontSize: 13, border: '1px solid #475569', borderRadius: 8, cursor: 'pointer', background: 'transparent', color: '#94a3b8' }}
        >
          Reset
        </button>
      </div>

      {error && (
        <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: '#450a0a', border: '1px solid #ef4444', color: '#fca5a5', fontSize: 12 }}>
          {error}
          <div style={{ marginTop: 4, fontSize: 11, color: '#94a3b8' }}>
            Is the server running? Default <code>{serverUrl}</code> — check the Server URL in the right sidebar.
          </div>
        </div>
      )}

      {result && (
        <div style={{ marginTop: 12 }}>
          <div style={{
            padding: '14px 16px', borderRadius: 8, marginBottom: 12,
            background: pass ? '#064e3b' : '#450a0a',
            border: `1px solid ${pass ? '#22c55e' : '#ef4444'}`,
          }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: pass ? '#86efac' : '#fca5a5', marginBottom: 4 }}>
              {pass ? '✓ DOCUMENT USABLE' : '✗ RETAKE NEEDED'}
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: pass ? '#bbf7d0' : '#fecaca', marginBottom: 4 }}>
              {result.score}/100
            </div>
            <div style={{ color: pass ? '#86efac' : '#fca5a5', fontSize: 12 }}>
              Sharpness: {result.sharpness_label} ({result.sharpness}) · Text lines: {result.text_lines}
              {result.aws_checked ? ` · Avg conf: ${result.avg_confidence}% · Low-conf: ${Math.round(result.low_conf_ratio * 100)}% ${result.doc_type === 'handwritten' ? '(no cap)' : '(max 40%)'} · Real words: ${result.real_words ?? 0} (min 5) · ${result.doc_type === 'handwritten' ? 'handwritten' : 'printed'}` : ' · AWS text check skipped'}
            </div>

            {result.breakdown?.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Score breakdown</div>
                {result.breakdown.map((b, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, fontSize: 12, color: '#cbd5e1', padding: '2px 6px', background: 'rgba(0,0,0,0.2)', borderRadius: 3 }}>
                    <span>{b.label}{b.detail ? <span style={{ color: '#64748b', fontSize: 10 }}> · {b.detail}</span> : null}</span>
                    <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{b.pts}/{b.max}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {result.reasons?.length > 0 && (
            <div style={{ padding: 12, background: '#1e293b', borderRadius: 8, border: '1px solid #475569', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: pass ? '#86efac' : '#fbbf24', marginBottom: 6 }}>
                {pass ? 'NOTES' : 'WHY RETAKE'}
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#cbd5e1', lineHeight: 1.7 }}>
                {result.reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 12 }}>
            {(() => {
              const hw = result.doc_type === 'handwritten';
              const aws = result.aws_checked;
              const tiles: { k: string; v: string; warn: boolean; sub?: string }[] = [
                { k: 'Brightness', v: `${result.brightness}`, warn: result.brightness < 80 || result.brightness > 235, sub: 'paper ≈175 · flags below 80, over 235' },
                { k: 'Contrast', v: `${result.contrast}`, warn: result.contrast < 25, sub: 'good at 25+ · full at 45' },
                { k: 'Capture', v: result.camera_max_mp ? `${result.resolution_mp} of ${result.camera_max_mp}MP max` : `${result.resolution_mp} MP`, warn: result.resolution_mp < 0.15, sub: 'tiny below 0.15MP · no sensor floor' },
                { k: 'Text detail', v: `${Math.round((result.text_mp ?? 0) * 1000)} KP`, warn: aws && (result.text_mp ?? 0) < 0.003, sub: 'KP = MP × coverage × 1000 · full ≈25KP' },
                { k: 'Glare', v: result.glare_detected ? 'Yes ⚠' : 'No ✓', warn: result.glare_detected, sub: 'flagged over 2% blown pixels' },
                { k: 'Words', v: `${result.text_words}`, warn: aws && result.text_words === 0, sub: 'needs 2+ text lines' },
                { k: 'Low-conf words', v: `${Math.round(result.low_conf_ratio * 100)}%`, warn: aws && !hw && result.low_conf_ratio > 0.4, sub: hw ? 'no cap in handwritten' : 'cap 40% in printed' },
                { k: 'Real words', v: `${result.real_words ?? 0}/${result.text_words} (${Math.round((result.real_word_ratio ?? 0) * 100)}%)`, warn: aws && ((result.real_words ?? 0) < 5 || (result.real_word_ratio ?? 0) < 0.5), sub: 'gates: 5+ words and 50% share' },
                { k: 'Text coverage', v: `${((result.text_coverage ?? 0) * 100).toFixed(1)}%`, warn: aws && (result.text_coverage ?? 0) < 0.01, sub: 'gate 1%+ of frame' },
              ];
              return tiles.map((m, i) => (
                <div key={i} style={{ background: m.warn ? 'rgba(239,68,68,0.08)' : '#1e293b', borderRadius: 6, padding: '8px 10px', border: `1px solid ${m.warn ? '#ef4444' : '#334155'}` }}>
                  <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{m.k}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: m.warn ? '#fca5a5' : '#e2e8f0' }}>{m.v}{m.warn && m.k !== 'Glare' ? ' ⚠' : ''}</div>
                  {m.sub && <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>{m.sub}</div>}
                </div>
              ));
            })()}
          </div>

          {((result.full_text ?? result.text_sample) ?.length ?? 0) > 0 && (
            <div style={{ padding: 12, background: '#1e293b', borderRadius: 8, border: '1px solid #475569' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#4ade80', marginBottom: 6 }}>
                Full captured text (AWS) — {(result.full_text ?? result.text_sample ?? []).length} of {result.text_lines} lines
              </div>
              <div style={{ fontSize: 11, color: '#e2e8f0', fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxHeight: 400, overflow: 'auto', lineHeight: 1.5 }}>
                {(result.full_text ?? result.text_sample ?? []).join('\n')}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
