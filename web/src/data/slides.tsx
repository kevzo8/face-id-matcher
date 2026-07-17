import { motion } from 'framer-motion';

export interface Slide {
  id: string;
  title: string;
  subtitle?: string;
  content: React.ReactNode;
  section: string;
}

const Trophy = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

const CheckCircle = ({ color = '#4ade80' }: { color?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
  </svg>
);

const XCircle = ({ color = '#f87171' }: { color?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" />
  </svg>
);

const AlertTriangle = ({ color = '#fbbf24' }: { color?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" /><path d="M12 17h.01" />
  </svg>
);

const DollarSign = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="2" x2="12" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const Lock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d8b4fe" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const Ban = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fdba74" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="m4.9 4.9 14.2 14.2" />
  </svg>
);

const Printer = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

const Sparkles = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3a6 6 0 0 0 9 9 6 6 0 0 0-9-9Z" /><path d="M20 20a6 6 0 0 0-6-6 6 6 0 0 0 6 6Z" />
    <path d="M4 20a6 6 0 0 0 6-6 6 6 0 0 0-6 6Z" /><path d="M12 12a6 6 0 0 0-6-6 6 6 0 0 0 6 6Z" />
  </svg>
);

const Lightbulb = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5C7.7 12.8 8 13.5 8 14" />
    <path d="M9 18h6" /><path d="M10 22h4" />
  </svg>
);

const Camera = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const ArrowRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
  </svg>
);

const Microscope = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 18h8" /><path d="M3 22h18" /><path d="M14 22a7 7 0 1 0 0-14h-1" />
    <path d="M9 14h2" /><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z" /><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3" />
  </svg>
);

const providerComparisonTable = (
  <div style={{ fontSize: 15, lineHeight: 1.6 }}>
    <div style={{ display: 'grid', gridTemplateColumns: '200px repeat(5, 1fr)', gap: 1, background: '#334155', borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
      <div style={{ background: '#1e293b', padding: '12px 16px', fontWeight: 700, color: '#94a3b8', fontSize: 14 }}>Metric</div>
      <div style={{ background: '#1e293b', padding: '12px 16px', fontWeight: 700, color: '#93c5fd', textAlign: 'center', fontSize: 14 }}>AWS Rekognition</div>
      <div style={{ background: '#1e293b', padding: '12px 16px', fontWeight: 700, color: '#86efac', textAlign: 'center', fontSize: 14 }}>InsightFace</div>
      <div style={{ background: '#1e293b', padding: '12px 16px', fontWeight: 700, color: '#fde68a', textAlign: 'center', fontSize: 14 }}>Face++</div>
      <div style={{ background: '#1e293b', padding: '12px 16px', fontWeight: 700, color: '#fca5a5', textAlign: 'center', fontSize: 14 }}>DeepFace</div>
      <div style={{ background: '#1e293b', padding: '12px 16px', fontWeight: 700, color: '#d8b4fe', textAlign: 'center', fontSize: 14 }}>Megamatcher</div>
      {[
        ['True Positives', '27', '24', '23', '2', '16*'],
        ['True Negatives', '13', '11', '13', '13', '5*'],
        ['False Positives', '0', '0', '0', '0', '0'],
        ['False Negatives', '0', '2', '4', '25', '1*'],
        ['Detection Errors', '0', '3', '0', '0', '18*'],
        ['Accuracy', '100%', '94.6%', '90.0%', '37.5%', '95.5%*'],
        ['Speed (per pair)', '~0.5–1.5s', '~3s', '~1s*', '~25s', '~1–3s'],
        ['Cost/txn', '$0.001', '$0.00', '$0.00019', '$0.00', '$0.00*'],
      ].map((row, i) => (
        row.map((cell, j) => {
          let cellColor = '#e2e8f0';
          if (j > 0) {
            if (cell === '0' || cell === '100%') cellColor = '#4ade80';
            else if (cell.includes('27') || cell.includes('13')) cellColor = '#4ade80';
            else if (cell.includes('$0.00')) cellColor = '#86efac';
            else if (cell === '~0.5–1.5s' || cell === '~1–3s' || cell === '~3s' || cell === '94.6%' || cell === '90.0%' || cell === '95.5%*' || cell === '~1s*') cellColor = '#fbbf24';
            else if (cell === '25' || cell === '18*' || cell === '37.5%' || cell === '~25s') cellColor = '#f87171';
            else if (cell === '2' || cell === '3' || cell === '4') cellColor = '#fbbf24';
          }
          return (
            <div key={`${i}-${j}`} style={{
              background: i % 2 === 0 ? '#0f172a' : '#1e293b',
              padding: '10px 16px',
              fontWeight: j === 0 ? 600 : 700,
              color: cellColor,
              textAlign: j === 0 ? 'left' : 'center',
              borderBottom: '1px solid #1e293b',
              fontSize: 15,
            }}>{cell}</div>
          );
        })
      ))}
    </div>
    <div style={{ marginTop: 12, color: '#64748b', fontSize: 13 }}>*Face++: rate-limited to 1 QPS on free tier (1s/pair minimum). Batch with --workers 1.<br />*Megamatcher per-txn = Face PRT license at volume-tier pricing — bulk discounts lower per-unit cost (€0.69 at 1,000 qty → €0.03 at 512K+ qty, min 1,000). One-time SDK license also required (€2,590 Standard / €4,990 Extended). EUR→USD at ~1.1422.<br />See Statistical Analysis slide for Accuracy, Recall, Precision, F1 metrics.</div>
  </div>
);

const costTable = (
  <div style={{ fontSize: 15, lineHeight: 1.7 }}>
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr 1fr', gap: 1, background: '#334155', borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
      {['Provider', 'Per Txn', 'Monthly (10K)', 'Annual'].map(h => (
        <div key={h} style={{ background: '#1e293b', padding: '12px 16px', fontWeight: 700, color: '#94a3b8', fontSize: 14 }}>{h}</div>
      ))}
      {[
        ['InsightFace (self-hosted)', '$0.00', '$0.00', '$0.00'],
        ['DeepFace (self-hosted)', '$0.00', '$0.00', '$0.00'],
        ['Megamatcher (per txn)', '$0.07–$0.79', '$700–$7,900', '$8.4K–$94.8K'],
        ['Face++ (Megvii)', '$0.00019', '$1.90', '$22.80'],
        ['Azure Face API', '$0.00050', '$5.00', '$60.00'],
        ['AWS Rekognition', '$0.001', '$10.00', '$120.00'],
        ['Veriff (full KYC)', '$0.80-$1.89', '$8K-$19K', '$96K-$227K'],
      ].map((row, i) => (
        row.map((cell, j) => (
          <div key={`c${i}-${j}`} style={{
            background: i % 2 === 0 ? '#0f172a' : '#1e293b',
            padding: '11px 16px',
            fontWeight: j === 0 ? 500 : 700,
            color: j === 0 ? '#e2e8f0' : cell === '$0.00' ? '#4ade80' : j === 1 ? '#fbbf24' : '#e2e8f0',
            borderBottom: '1px solid #1e293b',
            fontSize: 15,
          }}>{cell}</div>
        ))
      ))}
    </div>
    <div style={{ marginTop: 12, color: '#64748b', fontSize: 13 }}>*Megamatcher per-txn = Face PRT license at volume-tier pricing — bulk discounts lower per-unit cost (€0.69 at 1,000 qty → €0.03 at 512K+ qty, min 1,000). One-time SDK license also required (€2,590 Standard / €4,990 Extended). EUR→USD at ~1.1422.</div>
  </div>
);

const providerFeaturesTable = (
  <div style={{ fontSize: 15, lineHeight: 1.6 }}>
    <div style={{ display: 'grid', gridTemplateColumns: '160px repeat(5, 1fr)', gap: 1, background: '#334155', borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
      {['', 'AWS Rekognition', 'InsightFace', 'Face++', 'Megamatcher', 'face-api.js'].map((h, idx) => (
        <div key={h} style={{
          background: '#1e293b', padding: '12px 14px', fontWeight: 700,
          color: !h ? '#94a3b8' : idx === 5 ? '#94a3b8' : idx === 1 ? '#93c5fd' : idx === 2 ? '#86efac' : idx === 3 ? '#fde68a' : '#d8b4fe',
          textAlign: 'center', fontSize: 14,
        }}>{h}</div>
      ))}
      {[
        ['Type', 'Cloud API', 'Self-hosted (ONNX)', 'Cloud API', 'SDK (on-prem)', 'Browser (JS)'],
        ['Cost/txn', '$0.001', '$0.00', '$0.00019', '$0.07–$0.79*', '$0.00'],
        ['Speed (per pair)', '~0.5–1.5s', '~3s', '~1s*', '~1–3s', '~0.2–0.5s'],
        ['Accuracy (800px)', '100%', '94.6%', '90.0%', '95.5%', 'N/A*'],
        ['Orientation', 'Perfect', 'Reduced', 'Auto-rotate', 'Fails', 'N/A*'],
        ['Free Tier', '12mo / 1K/mo', 'Unlimited', '1 QPS forever', '30-day trial', 'Unlimited'],
        ['Setup', 'Easy (boto3)', 'Easy (pip)', 'Easy (REST)', 'Medium (SDK)', 'Easy (npm)'],
      ].map((row, i) => (
        row.map((cell, j) => {
          let cellColor = '#e2e8f0';
          if (j > 0 && j < 5) {
            if (cell === 'Perfect' || cell === '100%') cellColor = '#4ade80';
            else if (cell === 'Reduced' || cell === 'Auto-rotate' || cell === '94.6%' || cell === '90.0%' || cell === '95.5%') cellColor = '#fbbf24';
            else if (cell === 'Fails') cellColor = '#f87171';
            else if (cell === '$0.00' || cell === '$0.00*' || cell === 'Unlimited') cellColor = '#86efac';
            else if (cell.includes('~')) cellColor = '#fbbf24';
          } else if (j === 5) {
            cellColor = '#64748b';
          }
          return (
            <div key={`f${i}-${j}`} style={{
              background: i % 2 === 0 ? '#0f172a' : '#1e293b',
              padding: '10px 14px',
              fontWeight: j === 0 ? 600 : 500,
              color: j === 0 ? '#94a3b8' : cellColor,
              textAlign: j === 0 ? 'left' : 'center',
              borderBottom: '1px solid #1e293b',
              fontSize: 15,
              fontStyle: j === 5 && (cell === 'N/A*' || i === 0 && j === 5) ? 'italic' : 'normal',
            }}>{cell}</div>
          );
        })
      ))}
    </div>
    <div style={{ marginTop: 12, color: '#64748b', fontSize: 13 }}>*face-api.js not benchmarked on 40-pair dataset — browser-only, no batch/CLI support<br />*Face++: rate-limited to 1 QPS on free tier (1s/pair minimum).<br />*Megamatcher per-txn = Face PRT license at volume-tier pricing — bulk discounts lower per-unit cost (€0.69 at 1,000 qty → €0.03 at 512K+ qty, min 1,000). One-time SDK license also required (€2,590 Standard / €4,990 Extended).</div>
  </div>
);

const statsTable = (
  <div style={{ fontSize: 15, lineHeight: 1.6 }}>
    <div style={{ display: 'grid', gridTemplateColumns: '170px repeat(5, 1fr)', gap: 1, background: '#334155', borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
      <div style={{ background: '#1e293b', padding: '12px 16px', fontWeight: 700, color: '#94a3b8', fontSize: 14 }}>Metric</div>
      <div style={{ background: '#1e293b', padding: '12px 16px', fontWeight: 700, color: '#93c5fd', textAlign: 'center', fontSize: 14 }}>AWS Rekognition</div>
      <div style={{ background: '#1e293b', padding: '12px 16px', fontWeight: 700, color: '#86efac', textAlign: 'center', fontSize: 14 }}>InsightFace</div>
      <div style={{ background: '#1e293b', padding: '12px 16px', fontWeight: 700, color: '#fde68a', textAlign: 'center', fontSize: 14 }}>Face++</div>
      <div style={{ background: '#1e293b', padding: '12px 16px', fontWeight: 700, color: '#fca5a5', textAlign: 'center', fontSize: 14 }}>DeepFace</div>
      <div style={{ background: '#1e293b', padding: '12px 16px', fontWeight: 700, color: '#d8b4fe', textAlign: 'center', fontSize: 14 }}>Megamatcher*</div>
      {[
        ['Total Processable', '40/40', '37/40', '40/40', '40/40', '22/40'],
        ['Accuracy', '100%', '94.6%', '90.0%', '37.5%', '95.5%'],
        ['Recall (TPR)', '100%', '92.3%', '85.2%', '7.4%', '94.1%'],
        ['Precision', '100%', '100%', '100%', '100%', '100%'],
        ['Specificity (TNR)', '100%', '100%', '100%', '100%', '100%'],
        ['F1 Score', '1.000', '0.960', '0.920', '0.138', '0.970'],
        ['False Positive Rate', '0%', '0%', '0%', '0%', '0%'],
        ['Detection Error Rate', '0%', '7.5%', '0%', '0%', '45%'],
      ].map((row, i) => (
        row.map((cell, j) => {
          let cellColor = '#e2e8f0';
          if (j > 0) {
            if (cell === '100%' || cell === '0%' || cell === '0/40' || cell === '1.000' || cell === '40/40') cellColor = '#4ade80';
            else if (cell === '0.138' || cell === '7.4%' || cell === '37.5%' || cell === '45%' || cell === '22/40') cellColor = '#f87171';
            else if (cell === '94.6%' || cell === '92.3%' || cell === '90.0%' || cell === '85.2%' || cell === '94.1%' || cell === '0.960' || cell === '0.920' || cell === '0.970' || cell === '7.5%') cellColor = '#fbbf24';
          }
          return (
            <div key={`s${i}-${j}`} style={{
              background: i % 2 === 0 ? '#0f172a' : '#1e293b',
              padding: '10px 16px',
              fontWeight: j === 0 ? 600 : 700,
              color: j === 0 ? '#e2e8f0' : cellColor,
              textAlign: j === 0 ? 'left' : 'center',
              borderBottom: '1px solid #1e293b',
              fontSize: 15,
            }}>{cell}</div>
          );
        })
      ))}
    </div>
    <div style={{ marginTop: 12, color: '#64748b', fontSize: 13 }}>
      *Megamatcher: 18/40 pairs (45%) failed detection at 800px. Metrics on processable pairs only.<br />
      Detection errors are resolution-specific (not person-specific): retrying at 2000px+ eliminates most failures.<br />
      <strong style={{ color: '#94a3b8' }}>TPR</strong> (True Positive Rate / Recall): % of same-person pairs correctly matched. <strong style={{ color: '#94a3b8' }}>TNR</strong> (True Negative Rate / Specificity): % of cross-person pairs correctly rejected.
    </div>
  </div>
);

const keyFindings = [
  { icon: <Trophy />, title: 'AWS Rekognition is most robust', detail: '100% on both datasets, handles all orientations/resolutions, 0 errors', color: '#fbbf24' },
  { icon: <DollarSign />, title: 'InsightFace is best free option', detail: '100% on full-res, 92.5% on 800px, $0/txn, ideal for POC', color: '#4ade80' },
  { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fde68a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>, title: 'Face++ is cheapest cloud API', detail: '$0.00019/txn (10x cheaper than Rekognition), 85.2% on 800px', color: '#fde68a' },
  { icon: <Microscope />, title: 'Resolution matters', detail: 'Megamatcher: 45% error at 800px vs ~100% on originals. Face++: 4 FN at 800px → 0 at 2000px', color: '#94a3b8' },
  { icon: <AlertTriangle color="#fca5a5" />, title: 'DeepFace too conservative at 0.7', detail: 'Only 7.4% AP, needs threshold ~0.32, Python 3.14 incompatible, ~25s/pair', color: '#fca5a5' },
  { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>, title: 'Detection failures are resolution-specific, not person-specific', detail: 'Paolo fails all providers at 800px but succeeds at 2000px', color: '#fbbf24' },
];

export const slides: Slide[] = [
  {
    id: 'app',
    title: 'Face ID Matcher',
    subtitle: 'Biometric Face Matching — CPS-221',
    section: 'Overview',
    content: null,
  },
  {
    id: 'problem',
    title: 'The Problem',
    subtitle: 'Why face matching for KYC?',
    section: 'Overview',
    content: (
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        <div style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 1.8, marginBottom: 16 }}>
          Verifying identity through photo comparison is critical for KYC, but Philippine government IDs present unique challenges:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {[
            { icon: <Printer />, title: 'Low print quality', desc: 'Pixelated or blurry photos from low-resolution ID printing', color: '#3b82f6' },
            { icon: <Sparkles />, title: 'Holographic overlays', desc: 'Security holograms and reflective coatings interfere with face detection', color: '#f59e0b' },
            { icon: <Lightbulb />, title: 'Variable lighting', desc: 'Camera flash reflections on glossy ID surfaces create glare', color: '#8b5cf6' },
            { icon: <Camera />, title: 'Small photo size', desc: 'ID photos are typically 1×1 inch, severely limiting face resolution', color: '#22c55e' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              style={{
                background: `${item.color}08`,
                borderRadius: 12, padding: '14px 16px',
                border: `1px solid ${item.color}33`,
                borderTop: `3px solid ${item.color}`,
              }}
            >
              <div style={{ flexShrink: 0, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, background: `${item.color}15`, borderRadius: 10, marginBottom: 8 }}>{item.icon}</div>
              <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: 2, fontSize: 15 }}>{item.title}</div>
              <div style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.5 }}>{item.desc}</div>
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))', borderRadius: 12, padding: '14px 18px', border: '1px solid rgba(99,102,241,0.3)' }}
        >
          <div style={{ fontWeight: 700, color: '#a5b4fc', marginBottom: 4, fontSize: 15 }}>Our Approach</div>
          <div style={{ color: '#c7d2fe', fontSize: 14, lineHeight: 1.7 }}>
            Benchmark 5+ face verification providers against a controlled Kaggle dataset to find the most accurate, cost-effective solution for SVI's KYC flow — tested at both 800px compressed and full resolution to simulate real-world conditions.
          </div>
        </motion.div>
        <div style={{ marginTop: 16, fontSize: 11, color: '#475569', borderTop: '1px solid #334155', paddingTop: 10 }}>
          <a href="https://svi-jira.atlassian.net/browse/CPS-221" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', textDecoration: 'underline' }}>CPS-221</a>: SPIKE — Research Biometric Face Matching (UX vs. Async Backend)
        </div>
      </div>
    ),
  },
  {
    id: 'providers',
    title: 'Provider Landscape',
    subtitle: '7 providers evaluated — cloud, self-hosted, SDK, and browser-based',
    section: 'Comparison',
    content: (
      <div style={{ maxWidth: 750, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6, marginBottom: 16 }}>
          {[
            { name: 'AWS Rekognition', type: 'Cloud API', cost: '$0.001/txn', speed: '~0.5–1.5s/pair', accuracy: '100%', badge: <><Trophy /> Most Robust</>, color: '#93c5fd', bg: 'rgba(59,130,246,0.1)' },
            { name: 'InsightFace', type: 'Self-hosted', cost: '$0.00/txn', speed: '~3s/pair', accuracy: '94.6%', badge: <><DollarSign /> Best Free</>, color: '#86efac', bg: 'rgba(34,197,94,0.1)' },
            { name: 'Face++ (Megvii)', type: 'Cloud API', cost: '$0.00019/txn', speed: '~1s/pair*', accuracy: '90.0%', badge: <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fde68a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg> Cheapest Cloud</>, color: '#fde68a', bg: 'rgba(234,179,8,0.1)' },
            { name: 'Megamatcher', type: 'SDK (on-prem)', cost: '$0.07–$0.79/txn', speed: '~1–3s/pair', accuracy: '95.5%*', badge: <><Lock /> Already being used</>, color: '#d8b4fe', bg: 'rgba(168,85,247,0.1)' },
            { name: 'DeepFace', type: 'Self-hosted', cost: '$0.00/txn', speed: '~25s/pair', accuracy: '37.5%', badge: <><XCircle color="#fca5a5" /> Not Recommended</>, color: '#fca5a5', bg: 'rgba(239,68,68,0.1)' },
            { name: 'Azure Face API', type: 'Cloud API', cost: '$0.0005/txn', speed: '~0.5–1s/pair', accuracy: 'N/A', badge: <><Ban /> Blocked</>, color: '#fdba74', bg: 'rgba(249,115,22,0.1)' },
            { name: 'face-api.js', type: 'Browser', cost: '$0.00/txn', speed: '~0.2–0.5s/pair', accuracy: 'Not benchmarked', badge: 'Client-side only', color: '#94a3b8', bg: 'rgba(100,116,139,0.1)' },
          ].map(p => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 12, background: p.bg, borderRadius: 10, padding: '10px 14px', border: `1px solid ${p.color}33` }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontWeight: 700, color: p.color, fontSize: 14 }}>{p.name}</span>
                <span style={{ fontSize: 11, color: '#64748b' }}>{p.type}</span>
              </div>
              <span style={{ fontSize: 13, color: '#94a3b8' }}>{p.cost}</span>
              <span style={{ fontSize: 12, color: '#64748b' }}>{p.speed}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: p.color, minWidth: 55, textAlign: 'center' }}>{p.accuracy}</span>
              <span style={{ fontSize: 11, background: 'rgba(0,0,0,0.3)', padding: '3px 10px', borderRadius: 6, color: p.color }}>{p.badge}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, color: '#64748b', fontSize: 13 }}>
          Full details summarized at: <a href="https://svi-jira.atlassian.net/wiki/spaces/~71202071852762867849479b4d350bd48b7534/pages/250740911/CPS-221+Spike+Biometric+Face+Matching+UX+vs.+Async+Backend" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', textDecoration: 'underline' }}>Confluence Document — CPS-221: Spike — Biometric Face Matching (UX vs. Async Backend)</a>
        </div>
      </div>
    ),
  },
  {
    id: 'features',
    title: 'Provider Features',
    subtitle: 'Side-by-side comparison of capabilities across all providers',
    section: 'Comparison',
    content: (
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {providerFeaturesTable}
      </div>
    ),
  },
  {
    id: 'cost',
    title: 'Cost Comparison',
    subtitle: 'Projected costs at 10,000 KYC verifications per month',
    section: 'Comparison',
    content: (
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ marginBottom: 24, display: 'flex', gap: 18, justifyContent: 'center' }}>
          {[
            { title: 'Self-hosted', cost: '$0.00/mo', desc: 'InsightFace / DeepFace / face-api.js', color: '#4ade80' },
            { title: 'Cloud API', cost: '$1.90-$10/mo', desc: 'Face++ ($1.90) · Rekognition ($10)', color: '#fbbf24' },
            { title: 'Full KYC', cost: '$8K-$19K/mo', desc: 'Veriff · SumSub · Onfido', color: '#f87171' },
          ].map(c => (
            <div key={c.title} style={{ flex: 1, background: '#1e293b', borderRadius: 10, padding: '14px 16px', textAlign: 'center', border: `1px solid ${c.color}33` }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1.5 }}>{c.title}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: c.color, marginBottom: 4 }}>{c.cost}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.4 }}>{c.desc}</div>
            </div>
          ))}
        </div>
        {costTable}
      </div>
    ),
  },
  {
    id: 'comparison',
    title: 'Provider Comparison',
    subtitle: '40 dirty pairs (27 same-person + 13 cross-person) at threshold 0.7 · 800px',
    section: 'Results',
    content: (
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        {providerComparisonTable}
      </div>
    ),
  },
  {
    id: 'samples',
    title: 'Dataset Demographics',
    subtitle: 'Sample pairs from the 40-image Kaggle benchmark — same-person and cross-person at 800px',
    section: 'Results',
    content: (
      <div style={{ maxWidth: 850, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { pair: 1, name: 'Weslley', type: 'Same-person', idFile: '1_ID_Weslley.jpg', selfieFile: '1_Selfie_Weslley.jpg', score: 60.58, decision: 'auto_approve', label: 'True Positive', note: 'Standard correct match — all providers pass', color: '#4ade80' },
            { pair: 28, name: 'Weslley vs Alessandro', type: 'Cross-person', idFile: '28_ID_Weslley.jpg', selfieFile: '28_Selfie_Alessandro.jpg', score: 0.00, decision: 'manual_review', label: 'True Negative', note: 'Correct rejection — different people, score near zero', color: '#4ade80' },
            { pair: 29, name: 'Juliana vs Fernanda', type: 'Cross-person', idFile: '29_ID_Juliana.jpg', selfieFile: '29_Selfie_Fernanda.jpg', score: 2.46, decision: 'manual_review', label: 'True Negative', note: 'Correct rejection — different people, low but nonzero score', color: '#4ade80' },
            { pair: 13, name: 'Paolo', type: 'Same-person', idFile: '13_ID_Paolo.jpg', selfieFile: '13_Selfie_Paolo.jpg', score: 0.00, decision: 'error', label: 'Detection Error', note: 'Bad quality ID + wrong orientation — InsightFace fails detection; Rekognition handles it at any resolution', color: '#fbbf24' },
            { pair: 14, name: 'Miia', type: 'Same-person', idFile: '14_ID_Miia.jpg', selfieFile: '14_Selfie_Miia.jpg', score: 25.08, decision: 'manual_review', label: 'False Negative', note: 'Below-threshold match — low-quality selfie reduces score', color: '#f87171' },
            { pair: 4, name: 'Rayanne', type: 'Same-person', idFile: '4_ID_Rayanne.jpg', selfieFile: '4_Selfie_Rayanne.jpg', score: 18.90, decision: 'manual_review', label: 'False Negative', note: 'Challenging match — lighting difference lowers similarity', color: '#f87171' },
          ].map(s => (
            <div key={s.pair} style={{ background: '#1e293b', borderRadius: 10, padding: '10px 12px', border: `1px solid ${s.color}44`, borderTop: `3px solid ${s.color}` }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, color: '#64748b', fontWeight: 600, marginBottom: 1 }}>ID</div>
                  <img src={`/samples/dirty-pairs/${s.idFile}`} alt={s.name} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 5, background: '#0f172a' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, color: '#64748b', fontWeight: 600, marginBottom: 1 }}>Selfie</div>
                  <img src={`/samples/dirty-pairs/${s.selfieFile}`} alt={s.name} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 5, background: '#0f172a' }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 12 }}>
                  #{s.pair} {s.name}
                </span>
                <span style={{ fontSize: 9, color: s.color, fontWeight: 700, background: `${s.color}18`, padding: '1px 6px', borderRadius: 4, border: `1px solid ${s.color}44` }}>{s.label}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 3 }}>
                <span style={{ fontSize: 11, color: '#64748b' }}>Score: <strong style={{ color: '#e2e8f0' }}>{s.score.toFixed(2)}</strong></span>
                <span style={{ fontSize: 11, color: '#64748b' }}>· <strong style={{ color: s.decision === 'auto_approve' ? '#4ade80' : s.decision === 'error' ? '#f87171' : '#fbbf24' }}>{s.decision}</strong></span>
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>{s.note}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(99,102,241,0.1)', borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
          Scores from <strong style={{ color: '#86efac' }}>InsightFace</strong> at our unified threshold 0.7. Dataset: 27 same-person + 13 cross-person pairs from <a href="https://www.kaggle.com/datasets/tapakah68/selfies-id-images-dataset" target="_blank" rel="noopener noreferrer" style={{ color: '#93c5fd', textDecoration: 'underline' }}>Kaggle "Selfies ID Images"</a>.<br />
          <strong style={{ color: '#93c5fd' }}>AWS Rekognition</strong> passes all 40 pairs at 800px with 100% accuracy — no detection failures, no false negatives.
        </div>
      </div>
    ),
  },
  {
    id: 'stats',
    title: 'Statistical Analysis',
    subtitle: 'Accuracy, recall, precision, F1, and error rates across all benchmarked providers',
    section: 'Results',
    content: (
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        <div style={{ marginBottom: 20, fontSize: 15, color: '#94a3b8', lineHeight: 1.7 }}>
          Key insight: <strong style={{ color: '#e2e8f0' }}>every provider had zero false positives</strong> — all are conservative, preferring no-match over a wrong match. This is ideal for KYC where a false accept is far worse than a manual review.
        </div>
        {statsTable}
      </div>
    ),
  },
  {
    id: 'findings',
    title: 'Key Findings',
    subtitle: 'What we learned from benchmarking 6 providers',
    section: 'Results',
    content: (
      <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {keyFindings.map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', background: 'rgba(30,41,59,0.5)', borderRadius: 10, padding: '12px 16px', border: '1px solid rgba(51,65,85,0.4)' }}>
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, background: `${f.color}15`, borderRadius: 10, color: f.color }}>{f.icon}</div>
            <div>
              <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: 4, fontSize: 16 }}>{f.title}</div>
              <div style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.6 }}>{f.detail}</div>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'recommendation',
    title: 'Recommendation',
    subtitle: 'Validated path from POC to production',
    section: 'Conclusion',
    content: (
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
          <div style={{ flex: 1, background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(99,102,241,0.15))', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(59,130,246,0.3)' }}>
            <div style={{ fontWeight: 700, color: '#93c5fd', marginBottom: 6, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>POC (Validated)</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#e2e8f0', marginBottom: 4 }}>InsightFace</div>
            <div style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.7 }}>
              100% accuracy on Kaggle originals · $0/txn · Deployed to HF Spaces · Ready now
            </div>
          </div>
          <div style={{ flex: 1, background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(16,185,129,0.15))', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(34,197,94,0.3)' }}>
            <div style={{ fontWeight: 700, color: '#86efac', marginBottom: 6, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>Production</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#e2e8f0', marginBottom: 4 }}>AWS Rekognition</div>
            <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>
              100% accuracy tested · $0.001/txn · Handles all orientations · Easiest integration
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
          <div style={{ flex: 1, background: 'linear-gradient(135deg, rgba(234,179,8,0.2), rgba(250,204,21,0.15))', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(234,179,8,0.3)' }}>
            <div style={{ fontWeight: 700, color: '#fde68a', marginBottom: 6, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>Budget Pick</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#e2e8f0', marginBottom: 4 }}>Face++</div>
            <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>
              $0.00019/txn (10x cheaper) · 85.2% at 800px · Needs ≥2000px images
            </div>
          </div>
          <div style={{ flex: 1, background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(192,132,252,0.15))', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(168,85,247,0.3)' }}>
            <div style={{ fontWeight: 700, color: '#d8b4fe', marginBottom: 6, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>SVI Existing</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>Megamatcher</div>
            <div style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.7 }}>
              $0.07–$0.79/txn (volume-tier) · Already being used · +SDK license upfront
            </div>
          </div>
        </div>
        <div style={{ background: '#1e293b', borderRadius: 12, padding: '14px 18px', border: '1px solid #334155' }}>
          <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: 10, fontSize: 15 }}>Next Steps</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {['Test with real Philippine ID photos (full resolution)', 'Submit Azure Face API approval application if needed', 'Decide on production provider based on PH ID results', 'Add liveness detection for production hardening'].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                style={{ display: 'flex', gap: 10, alignItems: 'center' }}
              >
                <span style={{ color: '#6366f1', fontWeight: 800, fontSize: 15, width: 22, textAlign: 'center' }}>{i + 1}.</span>
                <span style={{ color: '#cbd5e1', fontSize: 15 }}>{step}</span>
              </motion.div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 16, fontSize: 11, color: '#475569', borderTop: '1px solid #334155', paddingTop: 10 }}>
          See demo video: <a href="https://screenrec.com/share/irItDuPKEv" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', textDecoration: 'underline' }}>https://screenrec.com/share/irItDuPKEv</a>
        </div>
      </div>
    ),
  },
  {
    id: 'thankyou',
    title: 'Thank You',
    subtitle: '',
    section: 'Conclusion',
    content: (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{ maxWidth: 560, width: '100%', borderRadius: 12, overflow: 'hidden', marginBottom: 8, border: '1px solid #334155', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
        >
          <img src="/samples/screenshot.png" alt="VegaMatcher app screenshot" style={{ width: '100%', display: 'block' }} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          style={{ fontSize: 12, color: '#64748b', marginBottom: 16, maxWidth: 520, lineHeight: 1.6 }}
        >
          Accurate face detection even with white noise, multiple people in background, or challenging lighting conditions
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          style={{ fontSize: 28, fontWeight: 800, background: 'linear-gradient(135deg, #818cf8, #a78bfa, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 6, letterSpacing: -0.5 }}
        >VegaMatcher: A Face ID Matcher POC</motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.45 }}
          style={{ fontSize: 14, color: '#94a3b8', marginBottom: 2 }}
        >7 providers benchmarked · 40 test pairs · 100% accuracy validated</motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}
        >CPS-221 · KYC face matching spike complete</motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.55 }}
          style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}
        >
          <a href="https://svi-jira.atlassian.net/browse/CPS-221" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', textDecoration: 'underline' }}>Jira: CPS-221</a>
          {' · '}
          <a href="https://svi-jira.atlassian.net/wiki/spaces/~71202071852762867849479b4d350bd48b7534/pages/250740911/CPS-221+Spike+Biometric+Face+Matching+UX+vs.+Async+Backend" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', textDecoration: 'underline' }}>Confluence</a>
          {' · '}
          <a href="https://vegamatcher.kevinguadalupevega.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', textDecoration: 'underline' }}>Live App</a>
          {' · '}
          <a href="https://screenrec.com/share/irItDuPKEv" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', textDecoration: 'underline' }}>Demo Video</a>
        </motion.div>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: 60 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          style={{ height: 2, background: 'linear-gradient(90deg, #6366f1, #a855f7)', margin: '12px 0', borderRadius: 2 }}
        />
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.7 }}
          style={{ fontSize: 16, color: '#cbd5e1', marginBottom: 2, fontWeight: 700, letterSpacing: 2 }}
        >KGV</motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.8 }}
          style={{ fontSize: 12, color: '#64748b' }}
        >RBAC Team</motion.div>
      </motion.div>
    ),
  },
];

export const livenessSlides: Slide[] = [
  {
    id: 'liveness-title',
    title: 'Liveness Detection',
    subtitle: 'Biometric Liveness — CPS-222',
    section: 'Overview',
    content: null,
  },
  {
    id: 'liveness-what',
    title: 'What is Liveness Detection?',
    subtitle: 'Distinguishing a real human from a spoof',
    section: 'Overview',
    content: (
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 1.8, marginBottom: 16 }}>
          Liveness detection verifies that the person in front of the camera is a live human being — not a photo, video replay, silicone mask, or deepfake.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {[
            { icon: <Camera />, title: 'Active Liveness', desc: 'Challenge-response — user performs specific actions (blink, smile, turn head) to prove liveness. Higher security, requires user cooperation.', color: '#8b5cf6' },
            { icon: <Lightbulb />, title: 'Passive Liveness', desc: 'Single photo analysis — server-side algorithms detect spoofing artifacts, depth, texture. Frictionless, no user action needed.', color: '#22c55e' },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              style={{ background: `${item.color}08`, borderRadius: 12, padding: '14px 16px', border: `1px solid ${item.color}33`, borderTop: `3px solid ${item.color}` }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, background: `${item.color}15`, borderRadius: 10 }}>{item.icon}</div>
                <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 15 }}>{item.title}</div>
              </div>
              <div style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.5 }}>{item.desc}</div>
            </motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))', borderRadius: 12, padding: '14px 18px', border: '1px solid rgba(99,102,241,0.3)' }}>
          <div style={{ fontWeight: 700, color: '#a5b4fc', marginBottom: 4, fontSize: 15 }}>Why It Matters for KYC</div>
          <div style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.7 }}>
            Face matching alone is not enough — an attacker can present a photo of the legitimate user. Liveness ensures the person is physically present, preventing spoofing attacks. Philippine financial regulators increasingly require liveness for eKYC compliance.
          </div>
        </motion.div>
      </div>
    ),
  },
  {
    id: 'liveness-providers',
    title: 'Providers Tested',
    subtitle: '10 liveness providers across active, passive, and cloud',
    section: 'Comparison',
    content: (
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 14, lineHeight: 1.6 }}>
          Each provider was tested with real subjects under various lighting conditions, with presentation attacks (photo/video replay), and across different devices.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { name: 'open-face-liveness', type: 'Active (browser)', cost: '$0', accuracy: 'Good', color: '#22c55e', note: 'Blink + head-turn via face-api.js, fully offline' },
            { name: 'AWS Rekognition - Face Liveness', type: 'Active (cloud)', cost: '~$0.015/check', accuracy: 'Excellent', color: '#f59e0b', note: 'iBeta L1+L2 certified, requires KVS (~$0.0085/min) + WebSocket (~$1/mo)' },
            { name: 'AWS DetectFaces', type: 'Passive (heuristic)', cost: '~$0.001/check', accuracy: 'Moderate', color: '#3b82f6', note: 'Heuristic — eyes open, brightness, sharpness' },
            { name: 'AWS DetectLabels', type: 'Passive (spoof)', cost: '~$0.001/check', accuracy: 'Good', color: '#f97316', note: 'Scans for phones, screens, photos, ID documents' },
            { name: 'Face++', type: 'Passive (cloud)', cost: '~$0.00019/check', accuracy: 'Good', color: '#8b5cf6', note: 'Cheapest cloud option, heuristic on Free plan' },
            { name: 'Azure Face', type: 'Passive (cloud)', cost: '~$0.015/check', accuracy: 'Good', color: '#3b82f6', note: '30K free/month, face attributes + quality checks' },
            { name: 'OpenBiometrics', type: 'Self-hosted', cost: '$0 (self)', accuracy: 'Good', color: '#06b6d4', note: 'MiniFASNet passive + 6 active presets, proxy via /liveness/openbiometrics' },
            { name: 'HyperVerge', type: 'Active (cloud)', cost: 'Contact', accuracy: 'Excellent', color: '#f59e0b', note: 'ISO 30107-3 L2 certified' },
            { name: 'Didit', type: 'Passive/Active', cost: '$0.10–$0.33', accuracy: 'Good', color: '#22c55e', note: 'iBeta L1, $0.10 passive, $0.15 active, $0.33 full KYC, 500 free/mo' },
            { name: 'iProov', type: 'Active (cloud)', cost: 'Contact', accuracy: 'Excellent', color: '#a855f7', note: 'Govt-grade, iBeta L2, used by UK Home Office' },
          ].map((p, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              style={{ background: `${p.color}08`, borderRadius: 10, padding: '12px 14px', border: `1px solid ${p.color}22` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
                <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 14 }}>{p.name}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: `${p.color}22`, color: p.color, fontWeight: 600 }}>{p.type}</span>
                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: '#1e293b', color: '#94a3b8' }}>{p.cost}</span>
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.4 }}>{p.note}</div>
            </motion.div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'liveness-passive-heuristic',
    title: 'Passive Liveness',
    subtitle: '8-metric pixel-level analysis — no API calls, $0 per check',
    section: 'Comparison',
    content: (
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 1.8, marginBottom: 16 }}>
          A self-contained passive liveness provider that runs entirely server-side using numpy and PIL. No external API calls, no cloud costs. Analyzes 8 pixel-level metrics to distinguish real faces from photos, screens, and prints.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[
            { metric: 'Sharpness', weight: '20%', desc: 'Laplacian variance — blur detection for out-of-focus prints' },
            { metric: 'Edge Strength', weight: '15%', desc: 'Gradient magnitude — edges are softer on re-photographed images' },
            { metric: 'Color Variance', weight: '15%', desc: 'Channel variance — screens have different color distribution' },
            { metric: 'Histogram Spread', weight: '10%', desc: 'Pixel value distribution — photos have narrower histograms' },
            { metric: 'FFT Frequency', weight: '10%', desc: 'Low vs high frequency ratio — screens lack high frequencies' },
            { metric: 'Specular Highlights', weight: '15%', desc: 'Screen glare detection — bright spots from display reflections' },
            { metric: 'Moiré Patterns', weight: '10%', desc: 'Screen capture artifacts — repeating patterns from camera-scanline interference' },
            { metric: 'Color Banding', weight: '5%', desc: 'Quantization artifacts — reduced color depth in re-captured images' },
          ].map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              style={{ background: '#1e293b', borderRadius: 8, padding: '8px 10px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 12 }}>{m.metric}</span>
                <span style={{ fontSize: 10, color: '#64748b' }}>{m.weight}</span>
              </div>
              <div style={{ color: '#94a3b8', fontSize: 11, lineHeight: 1.4 }}>{m.desc}</div>
            </motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          style={{ background: '#1e293b', borderRadius: 10, padding: '12px 14px', border: '1px solid #334155' }}>
          <div style={{ fontWeight: 700, color: '#fbbf24', marginBottom: 4, fontSize: 14 }}>Scoring & Hybrid Mode</div>
          <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.7 }}>
            Weighted confidence: <code style={{ color: '#a5b4fc' }}>s_blur×0.20 + s_edge×0.15 + s_color×0.15 + s_hist×0.10 + s_freq×0.10 + s_highlight×0.15 + s_moire×0.10 + s_banding×0.05</code><br />
            Threshold: <strong style={{ color: '#4ade80' }}>confidence &gt; 0.70</strong> → PASS. Score mapped to 0-20 scale.<br /><br />
            <strong style={{ color: '#a5b4fc' }}>Hybrid mode</strong>: Combines cloud attributes (40%) with heuristic analysis (60%) for providers like Face++ and AWS DetectFaces. Hybrid threshold: <strong style={{ color: '#4ade80' }}>combined &gt; 0.75</strong>.
          </div>
        </motion.div>
      </div>
    ),
  },
  {
    id: 'liveness-active',
    title: 'Active Liveness',
    subtitle: 'open-face-liveness — browser-based challenge-response',
    section: 'Comparison',
    content: (
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 1.8, marginBottom: 16 }}>
          The browser-based active liveness test uses face-api.js to detect facial landmarks and measure eye aspect ratio (EAR) for blink detection, plus head rotation for turn challenges.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {[
            { metric: 'Blink Detection', desc: 'EAR threshold < 0.25 for both eyes simultaneously indicates a blink. 2 blinks required.', pts: '10 pts' },
            { metric: 'Head Turn', desc: 'Nose position delta > 15px indicates head turn. Left + right turns required.', pts: '30 pts' },
            { metric: 'Face Size', desc: 'Distance between eyes > 40px ensures the face fills enough of the frame.', pts: '20 pts' },
            { metric: 'Texture Analysis', desc: 'Laplacian variance > 20 ensures the image has natural skin texture, not a flat screen.', pts: '20 pts' },
            { metric: 'Motion / Frame Delta', desc: 'Average pixel change between frames > 3 ensures live video, not a static image.', pts: '20 pts' },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              style={{ background: '#1e293b', borderRadius: 10, padding: '12px 14px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 14 }}>{item.metric}</div>
                <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 3, background: '#22c55e22', color: '#4ade80', fontWeight: 600 }}>{item.pts}</span>
              </div>
              <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.5 }}>{item.desc}</div>
            </motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          style={{ background: '#1e293b', borderRadius: 10, padding: '12px 14px', border: '1px solid #334155' }}>
          <div style={{ fontWeight: 700, color: '#fbbf24', marginBottom: 4, fontSize: 14 }}>Scoring Formula</div>
          <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6, fontFamily: 'monospace' }}>
            Total = Blinks(10) + HeadTurn(30) + FaceSize(20) + Texture(20) + Motion(20) = 100<br />
            Threshold: ≥ 75 = PASS
          </div>
        </motion.div>
      </div>
    ),
  },
  {
    id: 'liveness-color-flash',
    title: 'Color Flash Liveness',
    subtitle: 'RGB reflection analysis — the most sophisticated active liveness mechanism',
    section: 'Comparison',
    content: (
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 1.8, marginBottom: 16 }}>
          The color flash test cycles red, green, and blue full-screen overlays while measuring the face's RGB response. A real face reflects the colored light — the dominant channel rises significantly more than the other two. A printed photo or screen replay shows a flat response where all channels shift together.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {[
            { metric: 'Baseline Capture', desc: '40 frames (~2s) of face RGB collected before flash to establish baseline per-channel values.', pts: 'Setup', color: '#64748b' },
            { metric: 'Red Flash', desc: 'Red channel rises vs green+blue average. Real face: discrimination > 8/255 (~3% shift).', pts: '7 pts', color: '#ef4444' },
            { metric: 'Green Flash', desc: 'Green channel rises vs red+blue average. Same 8/255 discrimination threshold.', pts: '7 pts', color: '#22c55e' },
            { metric: 'Blue Flash', desc: 'Blue channel rises vs red+green average. Same 8/255 discrimination threshold.', pts: '7 pts', color: '#3b82f6' },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              style={{ background: i > 0 ? `${item.color}08` : '#1e293b', borderRadius: 10, padding: '12px 14px', border: i > 0 ? `1px solid ${item.color}44` : '1px solid #334155', borderLeft: i > 0 ? `4px solid ${item.color}` : '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ fontWeight: 700, color: i > 0 ? item.color : '#e2e8f0', fontSize: 14 }}>{item.metric}</div>
                <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 3, background: i > 0 ? `${item.color}22` : '#8b5cf622', color: i > 0 ? item.color : '#a78bfa', fontWeight: 600 }}>{item.pts}</span>
              </div>
              <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.5 }}>{item.desc}</div>
            </motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          style={{ background: '#1e293b', borderRadius: 10, padding: '12px 14px', border: '1px solid #334155' }}>
          <div style={{ fontWeight: 700, color: '#fbbf24', marginBottom: 4, fontSize: 14 }}>How It Works</div>
          <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>
            A semi-transparent color overlay (red/green/blue at 55% opacity) is rendered over the video with <code style={{ color: '#a5b4fc' }}>mixBlendMode: screen</code>. The face's mean RGB is sampled from each frame. For each color, the target channel's rise above baseline is compared to the average rise of the other two channels. A real face shows <strong style={{ color: '#4ade80' }}>discrimination {'>'} 8</strong> (3% color shift). A printed photo or screen replay shows a flat response — all channels shift together.
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(74,222,128,0.15))', borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(34,197,94,0.3)', marginTop: 12 }}>
          <div style={{ fontWeight: 700, color: '#86efac', marginBottom: 4, fontSize: 14 }}>Mobile Performance</div>
          <div style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.6 }}>
            The color flash works on <strong style={{ color: '#4ade80' }}>all devices</strong> — mobile and desktop. In fact, it may be <strong style={{ color: '#4ade80' }}>more effective on mobile</strong> because the phone screen is held closer to the face, making the RGB reflection more pronounced. Camera constraints use <code style={{ color: '#a5b4fc' }}>facingMode: user</code> (front camera) with <code style={{ color: '#a5b4fc' }}>playsInline</code> for mobile compatibility. The flash runs identically across platforms — 3 colors × 10 frames each, same discrimination threshold.
          </div>
        </motion.div>
      </div>
    ),
  },
  {
    id: 'liveness-detectlabels',
    title: 'Spoof Detection',
    subtitle: 'Object detection for presentation attack prevention',
    section: 'Comparison',
    content: (
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 1.8, marginBottom: 16 }}>
          The <code style={{ color: '#a5b4fc' }}>/liveness/detect-objects</code> endpoint calls <strong style={{ color: '#93c5fd' }}>AWS Rekognition DetectLabels</strong> with <code style={{ color: '#a5b4fc' }}>MaxLabels=50, MinConfidence=70</code> to scan a single frame for spoof indicators. Detected objects are classified into attack categories.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            { category: 'Phone / Device', labels: 'Mobile Phone, Cell Phone, Smartphone, Phone', risk: 'High (with hand)', color: '#f87171' },
            { category: 'Screen Replay', labels: 'Screen, Display, Monitor, Television, TV', risk: 'Medium', color: '#fbbf24' },
            { category: 'Photo / Print', labels: 'Photo, Photograph, Picture Frame, Paper, Poster, Print', risk: 'High', color: '#f87171' },
            { category: 'ID Document', labels: 'ID Card, Driver\'s License, Passport, Credit Card', risk: 'High', color: '#f87171' },
            { category: 'Hand Holding', labels: 'Hand, Finger (combined with screen/phone)', risk: 'High', color: '#f87171' },
          ].map((cat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              style={{ background: `${cat.color}08`, borderRadius: 10, padding: '10px 12px', border: `1px solid ${cat.color}33` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 13 }}>{cat.category}</div>
                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: `${cat.color}22`, color: cat.color, fontWeight: 600 }}>{cat.risk}</span>
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>{cat.labels}</div>
            </motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ background: '#1e293b', borderRadius: 10, padding: '12px 14px', border: '1px solid #334155' }}>
            <div style={{ fontWeight: 700, color: '#fbbf24', marginBottom: 4, fontSize: 14 }}>Risk Logic</div>
            <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.7, fontFamily: 'monospace' }}>
              All indicators require ≥ 80% confidence to trigger.<br />
              Phone + Hand + Screen → <strong style={{ color: '#f87171' }}>HIGH</strong> risk (-30 pt penalty in active liveness)<br />
              Screen only → <strong style={{ color: '#fbbf24' }}>MEDIUM</strong> risk<br />
              No spoof objects → <strong style={{ color: '#4ade80' }}>LOW</strong> risk<br /><br />
              Generic labels (Device, Electronics, Gadget, Camera, Lens, Arm) are <strong style={{ color: '#fca5a5' }}>excluded</strong> to avoid false positives.
            </div>
          </div>
          <div style={{ background: '#1e293b', borderRadius: 10, padding: '12px 14px', border: '1px solid #334155' }}>
            <div style={{ fontWeight: 700, color: '#a5b4fc', marginBottom: 4, fontSize: 14 }}>Integration in Active Liveness</div>
            <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>
              When provider is <code style={{ color: '#a5b4fc' }}>aws_detect_faces_objects</code>, an initial snapshot is captured at session start and a second capture ~5s in. Both are sent to <code style={{ color: '#a5b4fc' }}>/liveness/detect-objects</code>. If <strong style={{ color: '#f87171' }}>spoof_risk === high</strong>, a <strong style={{ color: '#f87171' }}>-30 point penalty</strong> is applied to the active liveness score.
            </div>
          </div>
        </motion.div>
      </div>
    ),
  },
  {
    id: 'liveness-architecture',
    title: 'Pipeline Architecture',
    subtitle: 'End-to-end flow from capture to verdict',
    section: 'Results',
    content: (
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
        <div style={{ fontSize: 17, color: '#cbd5e1', lineHeight: 1.8, marginBottom: 18 }}>
          The active liveness check runs entirely in-browser at ~20fps, with optional cloud fallback for high-security transactions. Here is the complete pipeline:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
          {[
            { phase: '1. Baseline Collection', dur: '~2s (40 frames)', detail: 'Captures face RGB baseline, median nose position, and face size. Initializes EAR tracking for blink detection.' },
            { phase: '2. Head-Turn Challenges', dur: '~3s (2×30 frames)', detail: '2 random challenges from: turn_left, turn_right, look_up, look_down. Nose delta > 15px for 8+ frames = pass (15 pts each).' },
            { phase: '3. Color Flash Liveness', dur: '~1.5s (3×10 frames)', detail: 'Red → Green → Blue overlay at 55% opacity. Measures RGB channel discrimination. 7 pts per color = 21 pts max.' },
            { phase: '4. Blink Detection', dur: 'Throughout', detail: 'EAR < 0.2 counts as a blink. 2 blinks required for full 10 pts. Runs continuously during all phases.' },
            { phase: '5. Mid-Session AWS', dur: '~5s in', detail: 'Captures frame for DetectLabels or DetectFaces. -30 pt penalty if spoof_risk=high.' },
            { phase: '6. Final Scoring', dur: 'End', detail: 'Face Size (20) + Texture (20) + Motion (20) + Challenges (30) + Blinks (10) + Flash (21) - AWS Penalty. Threshold: ≥ 75 = PASS.' },
          ].map((p, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              style={{ background: '#1e293b', borderRadius: 8, padding: '12px 14px', border: '1px solid #334155', borderTop: `3px solid ${i < 2 ? '#6366f1' : i < 4 ? '#8b5cf6' : '#a855f7'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 15 }}>{p.phase}</span>
                <span style={{ fontSize: 11, color: '#64748b', background: '#0f172a', padding: '2px 8px', borderRadius: 3 }}>{p.dur}</span>
              </div>
              <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5 }}>{p.detail}</div>
            </motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))', borderRadius: 10, padding: '14px 16px', border: '1px solid rgba(99,102,241,0.3)' }}>
          <div style={{ fontWeight: 700, color: '#a5b4fc', marginBottom: 6, fontSize: 16 }}>Passive Liveness Flow</div>
          <div style={{ color: '#cbd5e1', fontSize: 15, lineHeight: 1.7 }}>
            Single frame → provider selection (AWS DetectLabels, AWS DetectFaces, Face++, Heuristic, Hybrid, OpenBiometrics) → server-side analysis → spoof verdict + confidence score. No user interaction required. Ideal as a fast pre-check before active challenge.
          </div>
        </motion.div>
      </div>
    ),
  },
  {
    id: 'liveness-comparison',
    title: 'Comparison Results',
    subtitle: 'Score breakdown across providers',
    section: 'Results',
    content: (
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ fontSize: 15, color: '#94a3b8', marginBottom: 16, lineHeight: 1.6 }}>Each provider's testing status and key characteristics at a glance:</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[
            { name: 'open-face-liveness', type: 'Active (browser)', cost: '$0', badge: '✅ Tested', badgeColor: '#22c55e', desc: 'Browser engine: face size + texture + motion + challenges + blinks + flash. Fully offline.', color: '#22c55e' },
            { name: 'AWS Rekognition - Face Liveness', type: 'Active (cloud)', cost: '~$0.015', badge: '📄 Estimated', badgeColor: '#3b82f6', desc: 'iBeta L1+L2 certified. Score estimated from docs — KVS (~$0.0085/min) + WebSocket (~$1/mo) not implemented.', color: '#3b82f6' },
            { name: 'AWS DetectFaces', type: 'Passive (heuristic)', cost: '~$0.001', badge: '✅ Tested', badgeColor: '#22c55e', desc: 'Heuristic: eyes open + mouth + sharpness + brightness. Good for basic passive checks.', color: '#22c55e' },
            { name: 'AWS DetectLabels', type: 'Passive (spoof)', cost: '~$0.001', badge: '✅ Tested', badgeColor: '#22c55e', desc: 'Spoof object detection: phones, screens, photos, ID docs. Returns risk level. Used in active liveness for -30 pt penalty.', color: '#22c55e' },
            { name: 'Face++', type: 'Passive (cloud)', cost: '~$0.00019', badge: '✅ Tested', badgeColor: '#22c55e', desc: 'Free-plan heuristic: eyes open + blur quality. Cheapest cloud option at $0.00019/check.', color: '#22c55e' },
            { name: 'Azure Face', type: 'Passive (cloud)', cost: '~$0.015', badge: '🚫 Blocked', badgeColor: '#ef4444', desc: 'Subscription request rejected — could not test.', color: '#ef4444' },
            { name: 'OpenBiometrics', type: 'Self-hosted', cost: '$0 (self)', badge: '🔧 Partial', badgeColor: '#f59e0b', desc: 'Proxy integration exists but not properly tested with a live instance.', color: '#f59e0b' },
            { name: 'HyperVerge', type: 'Active (cloud)', cost: 'Contact', badge: '📄 Docs Only', badgeColor: '#64748b', desc: 'ISO 30107-3 L2 certified. Evaluated via documentation.', color: '#64748b' },
            { name: 'Didit', type: 'Passive/Active', cost: '$0.10–$0.33', badge: '📄 Docs Only', badgeColor: '#64748b', desc: '$0.10 passive, $0.15 active, $0.33 full KYC. 500 free/mo. iBeta L1.', color: '#64748b' },
            { name: 'iProov', type: 'Active (cloud)', cost: 'Contact', badge: '📄 Docs Only', badgeColor: '#64748b', desc: 'Govt-grade, iBeta L2, used by UK Home Office. Evaluated via docs.', color: '#64748b' },
          ].map((p, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              style={{ display: 'flex', alignItems: 'center', gap: 14, background: p.badge === '✅ Tested' ? 'rgba(34,197,94,0.06)' : '#1e293b', borderRadius: 10, padding: '12px 16px', border: `1px solid ${p.color}33`, borderLeft: `4px solid ${p.color}` }}>
              <div style={{ flex: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 15 }}>{p.name}</span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: `${p.badgeColor}22`, color: p.badgeColor, fontWeight: 600 }}>{p.badge}</span>
                </div>
                <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5 }}>{p.desc}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>{p.type}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: p.cost === '$0' ? '#4ade80' : p.cost === 'Contact' ? '#fbbf24' : '#e2e8f0' }}>{p.cost}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'liveness-recommendations',
    title: 'Recommendations',
    subtitle: 'Best path forward for production',
    section: 'Conclusion',
    content: (
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 1.8, marginBottom: 16 }}>
          Based on our testing, here are the recommended approaches for different scenarios:
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {[
            { tier: '🥇 Best Free', provider: 'open-face-liveness', desc: 'Browser-only active liveness with blink + head-turn. $0, no server needed. Best for POC and low-volume use.', color: '#22c55e' },
            { tier: '🥇 Best Production', provider: 'AWS Rekognition - Face Liveness + open-face-liveness', desc: 'Hybrid: open-face-liveness as primary (free), AWS Rekognition as fallback for high-risk transactions. Covers iBeta L1+L2. Note: AWS Rekognition alone costs ~$0.015/check + KVS (~$0.0085/min) + WebSocket (~$1/mo), making it the most expensive option.', color: '#8b5cf6' },
            { tier: '🥈 Best Passive & Active', provider: 'AWS DetectFaces / DetectLabels + Heuristic', desc: 'Combined $0.001/check passive analysis — heuristic face metrics (eyes/brightness/sharpness) + spoof object detection (phones/screens/photos). Good for frictionless UX where active challenges are undesirable.', color: '#3b82f6' },
            { tier: '🥉 Cheapest', provider: 'Face++ (Free) + Heuristic', desc: 'Combined passive + active for ~$0.00019/check. Passive heuristic via Face++ free plan + server-side heuristic for defense in depth.', color: '#f59e0b' },
          ].map((r, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
              style={{ background: `${r.color}08`, borderRadius: 10, padding: '14px 16px', border: `1px solid ${r.color}33`, borderLeft: `4px solid ${r.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 16 }}>{r.tier}</span>
                <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 15 }}>{r.provider}</span>
              </div>
              <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>{r.desc}</div>
            </motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))', borderRadius: 12, padding: '14px 18px', border: '1px solid rgba(99,102,241,0.3)' }}>
          <div style={{ fontWeight: 700, color: '#a5b4fc', marginBottom: 6, fontSize: 15 }}>Next Steps</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              'Productionize open-face-liveness with better UI/UX for challenge prompts',
              'Add AWS Rekognition integration for high-security transactions',
              'Implement passive liveness as a fast pre-check before active challenge',
              'Test with more diverse subjects and lighting conditions',
              'Integrate liveness into the unified KYC flow (CPS-220 → CPS-222 → CPS-221)',
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: '#cbd5e1', fontSize: 13 }}>
                <span style={{ color: '#818cf8', marginTop: 1 }}>▸</span>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    ),
  },
  {
    id: 'liveness-thanks',
    title: 'Thank You',
    subtitle: 'CPS-222: Liveness Detection Spike Complete',
    section: 'Conclusion',
    content: (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          style={{ fontSize: 28, fontWeight: 800, background: 'linear-gradient(135deg, #a78bfa, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 6, letterSpacing: -0.5 }}
        >Liveness Detection POC</motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.45 }}
          style={{ fontSize: 14, color: '#94a3b8', marginBottom: 2 }}
        >10 providers tested · Active + Passive · Browser + Cloud</motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}
        >CPS-222 · Liveness detection spike complete</motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.55 }}
          style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}
        >
          <a href="https://svi-jira.atlassian.net/browse/CPS-222" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', textDecoration: 'underline' }}>Jira: CPS-222</a>
          {' · '}
          <a href="https://svi-jira.atlassian.net/wiki/spaces/~71202071852762867849479b4d350bd48b7534/pages/250740911/CPS-221+Spike+Biometric+Face+Matching+UX+vs.+Async+Backend" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', textDecoration: 'underline' }}>Confluence</a>
          {' · '}
          <a href="https://screenrec.com/share/jARxoyaW2G" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', textDecoration: 'underline' }}>Demo Video</a>
        </motion.div>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: 60 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          style={{ height: 2, background: 'linear-gradient(90deg, #6366f1, #a855f7)', margin: '12px 0', borderRadius: 2 }}
        />
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.7 }}
          style={{ fontSize: 16, color: '#cbd5e1', marginBottom: 2, fontWeight: 700, letterSpacing: 2 }}
        >KGV</motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.8 }}
          style={{ fontSize: 12, color: '#64748b' }}
        >RBAC Team</motion.div>
      </motion.div>
    ),
  },
];

export const biometricSlides: Slide[] = [
  {
    id: 'bio-title',
    title: 'Biometric Transaction Authentication',
    subtitle: 'Architecture & Integration Design — CPS-289',
    section: 'Overview',
    content: null,
  },
  {
    id: 'bio-problem',
    title: 'The Problem',
    subtitle: 'Why we need biometric transaction authentication',
    section: 'Overview',
    content: (
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 1.8, marginBottom: 16 }}>
          Our clients need to verify a user's identity at the moment of a high-value transaction — but they cannot access our core identity database directly.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {[
            { title: 'Prevent Data Leakage', desc: 'Client apps must never see raw biometric templates or PII. Identity data stays on our side.', color: '#6366f1' },
            { title: 'Plug-and-Play', desc: 'Clients should add our verification step with minimal code changes — ideally one iframe tag.', color: '#22c55e' },
            { title: 'Invisible Updates', desc: 'We can change the UI or fix bugs without client redeployment. Updates are instant for all clients.', color: '#8b5cf6' },
            { title: 'Transaction Binding', desc: 'Prevent replay attacks where a valid face check is reused for a different transaction.', color: '#f59e0b' },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              style={{ background: `${item.color}08`, borderRadius: 12, padding: '14px 16px', border: `1px solid ${item.color}33`, borderTop: `3px solid ${item.color}` }}>
              <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: 6, fontSize: 15 }}>{item.title}</div>
              <div style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.5 }}>{item.desc}</div>
            </motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))', borderRadius: 12, padding: '14px 18px', border: '1px solid rgba(99,102,241,0.3)' }}>
          <div style={{ fontWeight: 700, color: '#a5b4fc', marginBottom: 4, fontSize: 15 }}>Business Value</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { metric: 'Fraud Reduction', desc: 'Prevents account takeover during high-value transactions' },
              { metric: 'Client Onboarding', desc: 'Plug-and-play widget reduces integration from weeks to days' },
              { metric: 'Operational Cost', desc: 'Centralized updates eliminate per-client maintenance' },
              { metric: 'Compliance', desc: 'Audit trail per transaction with biometric proof' },
            ].map((v, i) => (
              <div key={i} style={{ background: '#1e293b', borderRadius: 6, padding: '8px 10px', border: '1px solid #334155' }}>
                <div style={{ fontWeight: 700, color: '#a5b4fc', fontSize: 13, marginBottom: 2 }}>{v.metric}</div>
                <div style={{ color: '#94a3b8', fontSize: 12 }}>{v.desc}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    ),
  },
  {
    id: 'bio-concept',
    title: 'High-Level Concept',
    subtitle: 'The "Middleman" Architecture',
    section: 'Overview',
    content: (
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 1.8, marginBottom: 16 }}>
          Client apps never access our core identity data directly. Instead, we host the biometric verification securely on our side and expose a lightweight integration surface.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {[
            { phase: '1. Initiate', desc: 'Client backend calls POST /api/v1/auth/session with transaction details. Gets back a session_token and widget_url.', color: '#6366f1' },
            { phase: '2. Launch Widget', desc: 'Client opens the widget URL in an iframe/modal. Widget validates the session token and shows transaction details.', color: '#8b5cf6' },
            { phase: '3. Capture & Verify', desc: 'User captures face via camera. Backend runs passive liveness, spoof detection, and face match against enrolled template.', color: '#22c55e' },
            { phase: '4. Handoff', desc: 'Backend sends signed callback to client with verification result. Client completes the transaction.', color: '#f59e0b' },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              style={{ background: `${item.color}08`, borderRadius: 12, padding: '14px 16px', border: `1px solid ${item.color}33`, borderTop: `3px solid ${item.color}` }}>
              <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: 6, fontSize: 15 }}>{item.phase}</div>
              <div style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.5 }}>{item.desc}</div>
            </motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))', borderRadius: 12, padding: '14px 18px', border: '1px solid rgba(99,102,241,0.3)' }}>
          <div style={{ fontWeight: 700, color: '#a5b4fc', marginBottom: 4, fontSize: 15 }}>Key Principle</div>
          <div style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.6 }}>
            Client apps never access our core identity data directly. We host the biometric verification securely on our side and expose a lightweight integration surface — a secure iframe widget.
          </div>
        </motion.div>
      </div>
    ),
  },
  {
    id: 'bio-architecture',
    title: 'System Architecture',
    subtitle: 'Four-layer design with pluggable providers',
    section: 'Overview',
    content: (
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        <div style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 1.8, marginBottom: 18 }}>
          The architecture is organized into four layers, each with clear responsibilities and pluggable components:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
          {[
            { layer: 'API Gateway', components: 'Auth Session API · Verify API · Callback API', color: '#6366f1' },
            { layer: 'Service Layer', components: 'Session Manager · Biometric Engine · Transaction Binding', color: '#8b5cf6' },
            { layer: 'Provider Layer', components: 'InsightFace · Rekognition · Face++ · Liveness Providers', color: '#22c55e' },
            { layer: 'Data Layer', components: 'Session Store (Redis) · Audit Log (Cassandra) · Biometric Templates', color: '#f59e0b' },
          ].map((l, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              style={{ background: `${l.color}08`, borderRadius: 10, padding: '12px 14px', border: `1px solid ${l.color}33`, borderTop: `3px solid ${l.color}` }}>
              <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 14, marginBottom: 4 }}>{l.layer}</div>
              <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.5 }}>{l.components}</div>
            </motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))', borderRadius: 12, padding: '14px 18px', border: '1px solid rgba(99,102,241,0.3)' }}>
          <div style={{ fontWeight: 700, color: '#a5b4fc', marginBottom: 6, fontSize: 15 }}>API Endpoints</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[
              { endpoint: 'POST /auth/session', desc: 'Create session, get widget URL' },
              { endpoint: 'POST /auth/verify', desc: 'Submit face + liveness data' },
              { endpoint: 'GET /auth/status', desc: 'Check session status' },
              { endpoint: 'POST /auth/cancel', desc: 'Cancel pending session' },
            ].map((e, i) => (
              <div key={i} style={{ background: '#1e293b', borderRadius: 6, padding: '6px 10px', border: '1px solid #334155' }}>
                <div style={{ fontWeight: 600, color: '#a5b4fc', fontSize: 12, fontFamily: 'monospace' }}>{e.endpoint}</div>
                <div style={{ color: '#94a3b8', fontSize: 11 }}>{e.desc}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    ),
  },
  {
    id: 'bio-widget',
    title: 'Widget Architecture',
    subtitle: 'The secure iframe that powers the biometric check',
    section: 'Overview',
    content: (
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 1.8, marginBottom: 16 }}>
          The widget is a self-contained web page hosted at <code style={{ color: '#a5b4fc' }}>https://verify.svi.com/widget</code>. It handles the entire biometric verification flow inside a sandboxed iframe.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
          {[
            { module: 'Session Validator', desc: 'Validates session_token JWT signature, expiry, and usage count. Shows transaction details for user confirmation.', color: '#6366f1' },
            { module: 'Camera Module', desc: 'Multi-constraint camera access with selfie mirroring, face bounding box overlay, and quality checks.', color: '#8b5cf6' },
            { module: 'Liveness Module', desc: 'Passive heuristic + active challenges + flash liveness + spoof object detection. Layered approach.', color: '#22c55e' },
            { module: 'Face Match Module', desc: 'Captures face image, sends to backend for matching against enrolled template. Returns confidence score.', color: '#f59e0b' },
            { module: 'Result Handler', desc: 'Success: sends callback to client. Failure: retry/support flow. Token passed via URL fragment.', color: '#ef4444' },
          ].map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              style={{ background: `${m.color}08`, borderRadius: 10, padding: '12px 14px', border: `1px solid ${m.color}33`, borderTop: `3px solid ${m.color}` }}>
              <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 14, marginBottom: 4 }}>{m.module}</div>
              <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.5 }}>{m.desc}</div>
            </motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          style={{ background: '#1e293b', borderRadius: 10, padding: '12px 14px', border: '1px solid #334155' }}>
          <div style={{ fontWeight: 700, color: '#fbbf24', marginBottom: 4, fontSize: 14 }}>Widget Flow</div>
          <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>
            Session Validator → Camera Module → Liveness Module → Face Match Module → Result Handler
          </div>
        </motion.div>
      </div>
    ),
  },
  {
    id: 'bio-integration',
    title: 'Integration Strategy',
    subtitle: 'Three approaches compared',
    section: 'Comparison',
    content: (
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        <div style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 1.8, marginBottom: 16 }}>
          Three integration approaches evaluated, with the iframe widget as the recommended path:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 18 }}>
          {[
            { name: 'Iframe Widget', badge: '🥇 Recommended', effort: '4-6 weeks', security: 'Best — sandboxed', ux: 'Good — inline modal', updates: 'Instant — server-side', color: '#22c55e' },
            { name: 'Web Component', badge: '🥈 Alternative', effort: '6-8 weeks', security: 'Good — client DOM access', ux: 'Best — native feel', updates: 'CDN cache-busting', color: '#f59e0b' },
            { name: 'Redirect Flow', badge: '🥉 Fallback', effort: '2-3 weeks', security: 'Best — no cross-origin', ux: 'Poor — full page redirect', updates: 'Server-side only', color: '#64748b' },
          ].map((a, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              style={{ background: `${a.color}08`, borderRadius: 12, padding: '14px', border: `1px solid ${a.color}33`, borderTop: `3px solid ${a.color}` }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>{a.badge}</div>
              <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 15, marginBottom: 4 }}>{a.name}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Est. {a.effort}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12, color: '#94a3b8' }}>
                <div><strong style={{ color: '#cbd5e1' }}>Security:</strong> {a.security}</div>
                <div><strong style={{ color: '#cbd5e1' }}>UX:</strong> {a.ux}</div>
                <div><strong style={{ color: '#cbd5e1' }}>Updates:</strong> {a.updates}</div>
              </div>
            </motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(16,185,129,0.15))', borderRadius: 12, padding: '14px 18px', border: '1px solid rgba(34,197,94,0.3)' }}>
          <div style={{ fontWeight: 700, color: '#86efac', marginBottom: 4, fontSize: 15 }}>🥇 Recommended: Iframe Widget</div>
          <div style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.6 }}>
            Client embeds a simple <code style={{ color: '#a5b4fc' }}>&lt;iframe&gt;</code> pointing to our hosted widget URL. The iframe communicates with the parent page via <code style={{ color: '#a5b4fc' }}>postMessage</code> API. Maximum security — client cannot access our DOM, camera stream, or identity data. Invisible updates — we update the widget on our server, all clients get it instantly.
          </div>
        </motion.div>
      </div>
    ),
  },
  {
    id: 'bio-security',
    title: 'Security Architecture',
    subtitle: 'Session tokens, tamper-proofing, and layered liveness',
    section: 'Comparison',
    content: (
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        <div style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 1.8, marginBottom: 16 }}>
          Security is built into every layer — from session token design to image pipeline tamper-proofing.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
          {[
            { control: 'Single-Use Tokens', desc: 'JWT jti stored in Redis with TTL. Marked consumed on first use. Subsequent uses rejected.', color: '#6366f1' },
            { control: 'Short Expiry', desc: 'Default 5 minutes (configurable). Reduces window for replay attacks.', color: '#8b5cf6' },
            { control: 'Transaction Binding', desc: 'Amount + recipient hashed into session token. Widget displays for user confirmation.', color: '#22c55e' },
            { control: 'Callback Signing', desc: 'Verification payload signed with client-specific HMAC secret. Client verifies before acting.', color: '#f59e0b' },
            { control: 'Rate Limiting', desc: '3 attempts/session, 10/min per user, 100/min per IP. Account lockout after 5 failed sessions.', color: '#ef4444' },
            { control: 'Iframe Sandbox', desc: 'sandbox="allow-scripts allow-same-origin" — no popups, no form submission, no navigation.', color: '#6366f1' },
            { control: 'Image Integrity', desc: 'Image signed with HMAC(secret, image + session_token) before transmission. Backend verifies.', color: '#8b5cf6' },
            { control: 'CORS + CSP', desc: 'Widget only loads from our domain. Content-Security-Policy restricts script sources.', color: '#22c55e' },
          ].map((c, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              style={{ background: `${c.color}08`, borderRadius: 8, padding: '10px 12px', border: `1px solid ${c.color}33`, borderLeft: `3px solid ${c.color}` }}>
              <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 13, marginBottom: 2 }}>{c.control}</div>
              <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.4 }}>{c.desc}</div>
            </motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          style={{ background: '#1e293b', borderRadius: 10, padding: '12px 14px', border: '1px solid #334155' }}>
          <div style={{ fontWeight: 700, color: '#fbbf24', marginBottom: 4, fontSize: 14 }}>Session Token Structure</div>
          <div style={{ color: '#94a3b8', fontSize: 12, fontFamily: 'monospace', lineHeight: 1.6 }}>
            JWT: {`{jti, sub, txn, amount, recipient, iat, exp, usage, client_id}`}<br />
            Signed with HMAC-SHA256. Single-use. 5-minute default expiry.
          </div>
        </motion.div>
      </div>
    ),
  },
  {
    id: 'bio-liveness',
    title: 'Layered Liveness Strategy',
    subtitle: 'Four-layer defense against presentation attacks',
    section: 'Comparison',
    content: (
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 1.8, marginBottom: 16 }}>
          Leveraging existing POC work from CPS-222, we implement a layered liveness approach with fallback chain:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
          {[
            { layer: '1. Passive (Pixel)', method: '8-metric heuristic (blur, edges, color, FFT, moire, banding)', cost: '$0', target: 'Printed photo, screen replay', color: '#6366f1' },
            { layer: '2. Spoof Objects', method: 'AWS Rekognition DetectLabels — scan for phone, screen, hand, photo frame', cost: '$0.001', target: 'Presentation attack (phone holding photo)', color: '#8b5cf6' },
            { layer: '3. Active Challenges', method: 'Random head-turn + blink detection via face-api.js landmarks', cost: '$0', target: 'Pre-recorded video, deepfake', color: '#22c55e' },
            { layer: '4. Flash Liveness', method: 'RGB screen flash — measure color channel response', cost: '$0', target: 'Screen replay, high-quality print', color: '#f59e0b' },
          ].map((l, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              style={{ background: `${l.color}08`, borderRadius: 10, padding: '12px 14px', border: `1px solid ${l.color}33`, borderTop: `3px solid ${l.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 14 }}>{l.layer}</span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 3, background: `${l.color}22`, color: l.color, fontWeight: 600 }}>{l.cost}</span>
              </div>
              <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.5, marginBottom: 4 }}>{l.method}</div>
              <div style={{ color: '#64748b', fontSize: 11 }}>Target: {l.target}</div>
            </motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          style={{ background: '#1e293b', borderRadius: 10, padding: '12px 14px', border: '1px solid #334155' }}>
          <div style={{ fontWeight: 700, color: '#fbbf24', marginBottom: 4, fontSize: 14 }}>Fallback Chain</div>
          <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>
            Passive → if confidence &lt; 0.7, add Spoof Objects → if still uncertain, add Active Challenges → if still uncertain, fall back to human review.
          </div>
        </motion.div>
      </div>
    ),
  },
  {
    id: 'bio-mobile',
    title: 'Mobile Compatibility',
    subtitle: 'Browser-based camera in mobile WebViews',
    section: 'Comparison',
    content: (
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 1.8, marginBottom: 16 }}>
          The widget must function correctly when loaded inside a client's custom mobile app (Android WebView, iOS WKWebView, or in-app browser).
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
          {[
            { challenge: 'Camera in iframe', solution: 'iOS: allow="camera" attribute + NSCameraUsageDescription. Android: CAMERA permission in manifest.', color: '#6366f1' },
            { challenge: 'WebView camera access', solution: 'iOS: WKWebView mediaTypesRequiringUserActionForPlayback. Android: WebSettings mediaPlaybackRequiresUserGesture.', color: '#8b5cf6' },
            { challenge: 'In-app browser', solution: 'Cannot control permissions. Fall back to redirect flow (open in system browser).', color: '#f59e0b' },
            { challenge: 'iOS 15+ iframe camera', solution: 'Requires allow="camera" attribute on iframe. Without it, camera returns black/empty.', color: '#22c55e' },
            { challenge: 'Responsive layout', solution: 'Widget uses CSS max-width: 480px + height: 100dvh for mobile-friendly sizing.', color: '#3b82f6' },
          ].map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              style={{ background: `${m.color}08`, borderRadius: 10, padding: '12px 14px', border: `1px solid ${m.color}33`, borderLeft: `3px solid ${m.color}` }}>
              <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 13, marginBottom: 2 }}>{m.challenge}</div>
              <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.5 }}>{m.solution}</div>
            </motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          style={{ background: '#1e293b', borderRadius: 10, padding: '12px 14px', border: '1px solid #334155' }}>
          <div style={{ fontWeight: 700, color: '#fbbf24', marginBottom: 4, fontSize: 14 }}>Camera Access Strategy (from POC)</div>
          <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>
            1. Enumerate devices, sort virtual/OBS cameras to bottom<br />
            2. Constraint fallback: exact device → facingMode + 1280x720 → 640x480 → {`{ video: true }`}<br />
            3. Selfie mirroring via scaleX(-1) on video preview and captured canvas
          </div>
        </motion.div>
      </div>
    ),
  },
  {
    id: 'bio-cost',
    title: 'Cost Analysis',
    subtitle: 'Per-transaction and monthly projections',
    section: 'Comparison',
    content: (
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 1.8, marginBottom: 16 }}>
          The self-hosted approach (InsightFace + heuristic liveness) costs nearly $0 per transaction. Cloud options add provider costs.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            style={{ background: 'rgba(34,197,94,0.08)', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(34,197,94,0.33)', borderTop: '3px solid #22c55e' }}>
            <div style={{ fontWeight: 700, color: '#86efac', fontSize: 15, marginBottom: 8 }}>Self-Hosted (InsightFace)</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#bbf7d0', marginBottom: 4 }}>$0.001</div>
            <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8 }}>per transaction</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12, color: '#94a3b8' }}>
              <div>Passive liveness: <strong style={{ color: '#86efac' }}>$0.00</strong></div>
              <div>Face matching: <strong style={{ color: '#86efac' }}>$0.00</strong></div>
              <div>Spoof detection: <strong style={{ color: '#86efac' }}>$0.001</strong> (if needed)</div>
              <div>Session mgmt: <strong style={{ color: '#86efac' }}>~$0.00001</strong></div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            style={{ background: 'rgba(59,130,246,0.08)', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(59,130,246,0.33)', borderTop: '3px solid #3b82f6' }}>
            <div style={{ fontWeight: 700, color: '#93c5fd', fontSize: 15, marginBottom: 8 }}>Cloud (Rekognition)</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#bfdbfe', marginBottom: 4 }}>$0.017</div>
            <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8 }}>per transaction</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12, color: '#94a3b8' }}>
              <div>Face match: <strong style={{ color: '#93c5fd' }}>$0.001</strong></div>
              <div>Liveness: <strong style={{ color: '#93c5fd' }}>$0.015</strong></div>
              <div>Spoof detection: <strong style={{ color: '#93c5fd' }}>$0.001</strong></div>
            </div>
          </motion.div>
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{ background: '#1e293b', borderRadius: 10, padding: '12px 14px', border: '1px solid #334155' }}>
          <div style={{ fontWeight: 700, color: '#fbbf24', marginBottom: 6, fontSize: 14 }}>Monthly Cost Projections</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {[
              { volume: '1,000', self: '~$1', cloud: '~$17', budget: '~$0.38' },
              { volume: '10,000', self: '~$10', cloud: '~$170', budget: '~$3.80' },
              { volume: '100,000', self: '~$100', cloud: '~$1,700', budget: '~$38' },
              { volume: '1,000,000', self: '~$1,000', cloud: '~$17,000', budget: '~$380' },
            ].map((r, i) => (
              <div key={i} style={{ background: '#0f172a', borderRadius: 6, padding: '8px 10px', border: '1px solid #334155', textAlign: 'center' }}>
                <div style={{ fontWeight: 700, color: '#fbbf24', fontSize: 12, marginBottom: 4 }}>{r.volume}/mo</div>
                <div style={{ fontSize: 11, color: '#86efac' }}>Self: {r.self}</div>
                <div style={{ fontSize: 11, color: '#93c5fd' }}>Cloud: {r.cloud}</div>
                <div style={{ fontSize: 11, color: '#fde68a' }}>Face++: {r.budget}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    ),
  },
  {
    id: 'bio-comparison',
    title: 'Comparison Matrix',
    subtitle: 'Integration approaches and provider comparison',
    section: 'Comparison',
    content: (
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        <div style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 1.8, marginBottom: 16 }}>
          Side-by-side comparison of the three integration approaches:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 18 }}>
          {[
            { criterion: 'Security', iframe: 'Best', web: 'Good', redirect: 'Best' },
            { criterion: 'Integration Effort', iframe: 'Low', web: 'Medium', redirect: 'Low' },
            { criterion: 'UX', iframe: 'Good', web: 'Best', redirect: 'Poor' },
            { criterion: 'Mobile WebView', iframe: 'Needs testing', web: 'Best', redirect: 'Best' },
            { criterion: 'Invisible Updates', iframe: 'Best', web: 'Good', redirect: 'Best' },
            { criterion: 'Customization', iframe: 'None', web: 'Limited', redirect: 'None' },
            { criterion: 'Framework Support', iframe: 'All', web: 'All', redirect: 'All' },
          ].map((row, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              style={{ background: '#1e293b', borderRadius: 8, padding: '8px 10px', border: '1px solid #334155', textAlign: 'center' }}>
              <div style={{ fontWeight: 700, color: '#fbbf24', fontSize: 11, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{row.criterion}</div>
              <div style={{ fontSize: 12, color: '#86efac', marginBottom: 2 }}>Iframe: {row.iframe}</div>
              <div style={{ fontSize: 12, color: '#fde68a', marginBottom: 2 }}>Web: {row.web}</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Redirect: {row.redirect}</div>
            </motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))', borderRadius: 12, padding: '14px 18px', border: '1px solid rgba(99,102,241,0.3)' }}>
          <div style={{ fontWeight: 700, color: '#a5b4fc', marginBottom: 4, fontSize: 15 }}>Session Store Recommendation</div>
          <div style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.6 }}>
            <strong style={{ color: '#fbbf24' }}>Redis</strong> for session tokens (fast TTL, atomic INCR for single-use enforcement). <strong style={{ color: '#fbbf24' }}>Cassandra</strong> for audit log (existing SVI stack, full ACID).
          </div>
        </motion.div>
      </div>
    ),
  },
  {
    id: 'bio-poc',
    title: 'POC Plan',
    subtitle: '5 phases over 6-7 weeks',
    section: 'Results',
    content: (
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 1.8, marginBottom: 16 }}>
          Building on the completed foundation from CPS-220, CPS-221, and CPS-222:
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
          {[
            { phase: 'Phase 0: Foundation', status: '✅ COMPLETED', items: 'Face matching, liveness, OCR, ID registry, multi-provider architecture, camera capture, web app, FastAPI backend', color: '#22c55e' },
            { phase: 'Phase 1: Session API', status: 'WEEK 1-2', items: 'POST /auth/session, JWT tokens, Redis store, rate limiting, client API key auth', color: '#6366f1' },
            { phase: 'Phase 2: Widget Frontend', status: 'WEEK 3-4', items: 'Standalone widget HTML/JS, session validation, camera access, liveness, face capture, postMessage protocol', color: '#8b5cf6' },
            { phase: 'Phase 3: Verify API', status: 'WEEK 4-5', items: 'POST /auth/verify, session validation, liveness integration, face match, callback signing, audit log', color: '#22c55e' },
            { phase: 'Phase 4: Integration & Testing', status: 'WEEK 6', items: 'Iframe sandbox testing, mobile WebView, camera permissions, security pen testing, load testing', color: '#f59e0b' },
            { phase: 'Phase 5: Interactive Prototype', status: 'WEEK 6-7', items: 'Single-file prototype.html with full flow simulation, all states, responsive design', color: '#a855f7' },
          ].map((p, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
              style={{ background: '#1e293b', borderRadius: 8, padding: '10px 14px', border: '1px solid #334155', borderLeft: `3px solid ${p.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 14 }}>{p.phase}</span>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 3, background: `${p.color}22`, color: p.color, fontWeight: 600 }}>{p.status}</span>
              </div>
              <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.5 }}>{p.items}</div>
            </motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          style={{ background: '#1e293b', borderRadius: 10, padding: '12px 14px', border: '1px solid #334155' }}>
          <div style={{ fontWeight: 700, color: '#fbbf24', marginBottom: 4, fontSize: 14 }}>Total Estimated Effort</div>
          <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>
            <strong style={{ color: '#a5b4fc' }}>6-7 weeks</strong> for full implementation. Interactive prototype (prototype.html) already built and functional.
          </div>
        </motion.div>
      </div>
    ),
  },
  {
    id: 'bio-recommendations',
    title: 'Recommendations',
    subtitle: 'Best path forward for production',
    section: 'Conclusion',
    content: (
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 1.8, marginBottom: 16 }}>
          Based on our spike findings, here are the recommended approaches for production:
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {[
            { tier: '🥇 Integration', provider: 'Iframe Widget', desc: 'Maximum security, invisible updates, simple integration. One iframe tag + one postMessage listener.', color: '#22c55e' },
            { tier: '🥇 Face Match', provider: 'AWS Rekognition (cloud)', desc: '100% accuracy across all tested conditions, $0.001/check. InsightFace as self-hosted fallback ($0/check).', color: '#6366f1' },
            { tier: '🥇 Liveness', provider: 'Layered approach', desc: 'Passive heuristic ($0) → Spoof objects ($0.001) → Active challenges ($0) → Flash liveness ($0).', color: '#8b5cf6' },
            { tier: '🥇 Session Store', provider: 'Redis + Cassandra', desc: 'Redis for fast TTL + atomic INCR. Cassandra for audit log (existing SVI stack).', color: '#f59e0b' },
            { tier: '🥇 Client Integration', provider: 'Iframe Widget', desc: 'One iframe tag, one postMessage listener. Works with React, Vue, Angular, vanilla JS, mobile WebViews.', color: '#3b82f6' },
          ].map((r, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
              style={{ background: `${r.color}08`, borderRadius: 10, padding: '12px 14px', border: `1px solid ${r.color}33`, borderLeft: `4px solid ${r.color}`, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 16 }}>{r.tier}</span>
                <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 14 }}>{r.provider}</span>
              </div>
              <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.5 }}>{r.desc}</div>
            </motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))', borderRadius: 12, padding: '14px 18px', border: '1px solid rgba(99,102,241,0.3)' }}>
          <div style={{ fontWeight: 700, color: '#a5b4fc', marginBottom: 6, fontSize: 15 }}>Next Steps</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              'Implement Session Management API (Phase 1 — Week 1-2)',
              'Build Widget Frontend with camera, liveness, and face capture (Phase 2 — Week 3-4)',
              'Implement Verification API with callback signing (Phase 3 — Week 4-5)',
              'Integration testing: iframe sandbox, mobile WebView, security pen testing (Phase 4 — Week 6)',
              'Interactive prototype already built — prototype.html with full flow simulation',
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: '#cbd5e1', fontSize: 13 }}>
                <span style={{ color: '#818cf8', marginTop: 1 }}>▸</span>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    ),
  },
  {
    id: 'bio-thanks',
    title: 'Thank You',
    subtitle: 'CPS-289: Biometric Transaction Authentication Spike Complete',
    section: 'Conclusion',
    content: (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          style={{ fontSize: 28, fontWeight: 800, background: 'linear-gradient(135deg, #818cf8, #22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 6, letterSpacing: -0.5 }}
        >Biometric Transaction Authentication</motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.45 }}
          style={{ fontSize: 14, color: '#94a3b8', marginBottom: 2 }}
        >Iframe Widget · Session API · Layered Liveness · Transaction Binding</motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}
        >CPS-289 · Architecture & Integration Design spike complete</motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.55 }}
          style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}
        >
          <a href="https://svi-jira.atlassian.net/browse/CPS-289" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', textDecoration: 'underline' }}>Jira: CPS-289</a>
          {' · '}
          <a href="https://svi-jira.atlassian.net/wiki/spaces/~71202071852762867849479b4d350bd48b7534/pages/268075010/CPS-289+SPIKE+Architecture+Integration+Design+for+Biometric+Transaction+Authentication" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', textDecoration: 'underline' }}>Confluence</a>
        </motion.div>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: 60 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          style={{ height: 2, background: 'linear-gradient(90deg, #6366f1, #22c55e)', margin: '12px 0', borderRadius: 2 }}
        />
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.7 }}
          style={{ fontSize: 16, color: '#cbd5e1', marginBottom: 2, fontWeight: 700, letterSpacing: 2 }}
        >KGV</motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.8 }}
          style={{ fontSize: 12, color: '#64748b' }}
        >RBAC Team</motion.div>
      </motion.div>
    ),
  },
];

export const ocrSlides: Slide[] = [
  {
    id: 'ocr-title',
    title: 'OCR & ID Type Detection',
    subtitle: 'Optical Character Recognition — CPS-220',
    section: 'Overview',
    content: null,
  },
  {
    id: 'ocr-what',
    title: 'What We Built',
    subtitle: 'OCR pipeline for Philippine government IDs',
    section: 'Overview',
    content: (
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 1.8, marginBottom: 16 }}>
          An OCR pipeline that captures Philippine government ID images, extracts text via AWS Rekognition/Textract/Bedrock, and parses the results into structured fields using AI — all optimized for the unique challenges of Philippine IDs.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {[
            { title: 'ID Capture', desc: 'Front + back camera capture or upload with SVG mockups for framing. Supports rotation, flip, and quality checks.', color: '#6366f1' },
            { title: 'Text Extraction', desc: '3 OCR providers: AWS Rekognition (default), AWS Textract, Amazon Bedrock Claude via 3 different text extraction engines.', color: '#22c55e' },
            { title: 'AI Parsing', desc: 'GROQ (Llama 3.3) or OpenAI (GPT-4o-mini) extracts structured fields using the PH ID Type Registry (14 ID types).', color: '#8b5cf6' },
            { title: 'ID Registry', desc: '14 Philippine ID types (Passport, National ID, UMID, PRC, SSS, GSIS, TIN, Driver\'s License, etc.) with cross-referencing support.', color: '#f59e0b' },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              style={{ background: `${item.color}08`, borderRadius: 12, padding: '14px 16px', border: `1px solid ${item.color}33`, borderTop: `3px solid ${item.color}` }}>
              <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: 6, fontSize: 15 }}>{item.title}</div>
              <div style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.5 }}>{item.desc}</div>
            </motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))', borderRadius: 12, padding: '14px 18px', border: '1px solid rgba(99,102,241,0.3)' }}>
          <div style={{ fontWeight: 700, color: '#a5b4fc', marginBottom: 4, fontSize: 15 }}>CPS-220: Spike Context</div>
          <div style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.7 }}>
            Spike to identify the best approach for OCR and ID type detection for Philippine government IDs. Evaluated 9 OCR providers, built a working pipeline with 3 active backends, and created a PH-specific ID type registry with LLM-based structured data extraction.
          </div>
        </motion.div>
      </div>
    ),
  },
  {
    id: 'ocr-ph-registry',
    title: 'Philippine ID Type Registry',
    subtitle: '14 supported PH government ID types with cross-referencing',
    section: 'Overview',
    content: (
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 1.8, marginBottom: 16 }}>
          The AI prompt contains the full PH ID Type Registry — 14 ID types with codes 0–13. The LLM classifies the ID based on text it reads from the OCR output.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 16 }}>
          {[
            { code: 0, name: 'Other (specify)', color: '#64748b' },
            { code: 1, name: 'Philippines Passport', color: '#6366f1' },
            { code: 2, name: 'National ID (ePhilID)', color: '#22c55e' },
            { code: 3, name: 'National ID (PhilID Card)', color: '#22c55e' },
            { code: 4, name: 'UMID', color: '#8b5cf6' },
            { code: 5, name: 'PRC ID', color: '#f59e0b' },
            { code: 6, name: 'SSS ID', color: '#ef4444' },
            { code: 7, name: 'GSIS ID', color: '#3b82f6' },
            { code: 8, name: 'TIN Card', color: '#f97316' },
            { code: 9, name: 'PWD ID', color: '#06b6d4' },
            { code: 10, name: 'Senior Citizen ID', color: '#a855f7' },
            { code: 11, name: 'PhilHealth ID', color: '#14b8a6' },
            { code: 12, name: 'Postal ID', color: '#e11d48' },
            { code: 13, name: 'Driver\'s License', color: '#2563eb' },
          ].map((id, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#1e293b', borderRadius: 8, padding: '8px 12px', borderLeft: `3px solid ${id.color}` }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: id.color, minWidth: 24 }}>{id.code}</span>
              <span style={{ fontSize: 13, color: '#e2e8f0' }}>{id.name}</span>
            </motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          style={{ background: '#1e293b', borderRadius: 10, padding: '12px 14px', border: '1px solid #334155' }}>
          <div style={{ fontWeight: 700, color: '#fbbf24', marginBottom: 4, fontSize: 14 }}>Cross-Referencing</div>
          <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>
            When multiple IDs are uploaded (e.g., Passport + Driver's License), the AI prompt instructs the LLM to cross-reference and reconcile discrepancies across ID sources. The id_information field captures per-ID data separately for comparison.
          </div>
        </motion.div>
      </div>
    ),
  },
  {
    id: 'ocr-challenges',
    title: 'Key Challenges',
    subtitle: 'Philippine ID-specific OCR difficulties',
    section: 'Overview',
    content: (
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 1.8, marginBottom: 16 }}>
          Philippine government IDs present unique OCR challenges that informed our design decisions:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            { icon: '🌐', title: 'Bilingual Content', desc: 'Filipino + English on same ID. Field mapping complexity for AI parsing.' },
            { icon: '📐', title: 'Variable Layouts', desc: 'Same ID type can have different versions/regions. No standard template.' },
            { icon: '✨', title: 'Holographic Overlays', desc: 'Security holograms and reflective coatings create OCR artifacts and glare.' },
            { icon: '🔍', title: 'Low Print Quality', desc: 'Pixelated or blurry text from low-resolution ID printing.' },
            { icon: '💔', title: 'Physical Damage', desc: 'Worn, faded, or damaged cards cause missing or incorrect fields.' },
            { icon: '📋', title: 'Non-Standard Names', desc: 'Field names vary across ID types — mapping to unified schema is complex.' },
          ].map((c, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              style={{ background: 'rgba(245,158,11,0.06)', borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(245,158,11,0.25)' }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{c.icon}</div>
              <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: 2, fontSize: 14 }}>{c.title}</div>
              <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.5 }}>{c.desc}</div>
            </motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          style={{ background: '#1e293b', borderRadius: 10, padding: '12px 14px', border: '1px solid #334155' }}>
          <div style={{ fontWeight: 700, color: '#fbbf24', marginBottom: 4, fontSize: 14 }}>Mitigations</div>
          <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>
            Per-image OCR avoids composite quality loss. Anti-hallucination prompts prevent AI from inventing data. Multi-ID cross-referencing reconciles discrepancies. Image quality warnings alert users to poor captures.
          </div>
        </motion.div>
      </div>
    ),
  },
  {
    id: 'ocr-pipeline',
    title: 'OCR Pipeline Architecture',
    subtitle: 'End-to-end flow from capture to structured data',
    section: 'Overview',
    content: (
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        <div style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 1.8, marginBottom: 18 }}>
          The pipeline processes ID images individually and uses AI to extract structured fields from raw OCR text:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
          {[
            { phase: '1. Capture', detail: 'Camera or file upload. Front + back per ID entry. SVG mockups for alignment. Rotation/flip controls.' },
            { phase: '2. OCR Detect', detail: 'POST /ocr/detect with provider param. AWS Rekognition detect_text() + detect_labels() for ID type.' },
            { phase: '3. Text Assembly', detail: 'Each side OCR\'d individually (no stitching). Texts deduplicated before AI parsing.' },
            { phase: '4. AI Parse', detail: 'POST /ocr/parse with GROQ/OpenAI. PH ID Type Registry prompt extracts structured fields.' },
            { phase: '5. Field Validation', detail: 'Enforces gender (M/F), civil status (S/M/D/W), blood type (A/B/AB/O ±), date formats.' },
            { phase: '6. Cross-Reference', detail: 'When multiple IDs uploaded, AI reconciles discrepancies across ID sources.' },
          ].map((p, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              style={{ background: '#1e293b', borderRadius: 8, padding: '12px 14px', border: '1px solid #334155', borderTop: `3px solid ${i < 2 ? '#6366f1' : i < 4 ? '#8b5cf6' : '#f59e0b'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 15 }}>{p.phase}</span>
              </div>
              <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5 }}>{p.detail}</div>
            </motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))', borderRadius: 10, padding: '14px 16px', border: '1px solid rgba(99,102,241,0.3)' }}>
          <div style={{ fontWeight: 700, color: '#a5b4fc', marginBottom: 4, fontSize: 14 }}>Key Design Decision</div>
          <div style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.6 }}>
            Per-image OCR instead of stitching — each ID side is OCR'd separately to avoid composite image quality loss. The stitchImages function exists but is intentionally unused in the OCR flow.
          </div>
        </motion.div>
      </div>
    ),
  },
  {
    id: 'ocr-providers',
    title: 'OCR Providers',
    subtitle: '9 providers evaluated — 3 implemented, 6 server placeholders',
    section: 'Provider Comparisons',
    content: (
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        <div style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 1.8, marginBottom: 16 }}>
          The server implements 3 OCR backends. The remaining 6 are frontend-only options that fall through to the default provider.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { name: 'AWS Rekognition OCR', status: '✅ Active', cost: '$0.001/check', color: '#22c55e', note: 'Default provider. Uses rekognition.detect_text() for text + detect_labels() for ID type classification.' },
            { name: 'AWS Textract', status: '✅ Active', cost: '~$0.0015/page', color: '#22c55e', note: 'Uses textract.detect_document_text(). Better for dense text. Falls back to error if not enabled.' },
            { name: 'Amazon Bedrock Claude', status: '✅ Active', cost: '~$0.003/call', color: '#22c55e', note: 'Claude 3 Sonnet via bedrock-runtime. Extracts text via vision. Falls back to error text on failure.' },
            { name: 'Verihubs', status: '🔧 Placeholder', cost: 'Contact', color: '#f59e0b', note: 'Frontend option only — no server implementation. Falls to Rekognition default.' },
            { name: 'ZOLOZ', status: '🔧 Placeholder', cost: 'Contact', color: '#f59e0b', note: 'Frontend option only — no server implementation. Falls to Rekognition default.' },
            { name: 'Tencent Cloud', status: '🔧 Placeholder', cost: 'Contact', color: '#f59e0b', note: 'Frontend option only — no server implementation. Falls to Rekognition default.' },
            { name: 'Google DocAI', status: '🔧 Placeholder', cost: '~$0.015/page', color: '#f59e0b', note: 'Frontend option only — no server implementation. Falls to Rekognition default.' },
            { name: 'Mindee', status: '🔧 Placeholder', cost: '~$0.01/page', color: '#f59e0b', note: 'Frontend option only — no server implementation. Falls to Rekognition default.' },
            { name: 'Azure DI', status: '🔧 Placeholder', cost: '~$0.01/page', color: '#f59e0b', note: 'Frontend option only — no server implementation. Falls to Rekognition default.' },
          ].map((p, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              style={{ background: p.status.includes('✅') ? `${p.color}08` : '#1e293b', borderRadius: 10, padding: '12px 14px', border: `1px solid ${p.color}33`, borderLeft: `4px solid ${p.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 14 }}>{p.name}</span>
                <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: `${p.color}22`, color: p.color, fontWeight: 600 }}>{p.status}</span>
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 2 }}>{p.cost}</div>
              <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.4 }}>{p.note}</div>
            </motion.div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'ocr-ai-parsing',
    title: 'AI Parsing with LLM',
    subtitle: 'GROQ (Llama 3.3) or OpenAI (GPT-4o-mini) — structured extraction from raw OCR',
    section: 'Provider Comparisons',
    content: (
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 1.8, marginBottom: 16 }}>
          The <code style={{ color: '#a5b4fc' }}>POST /ocr/parse</code> endpoint sends raw OCR text to an LLM with a carefully engineered prompt that includes the full PH ID Type Registry, strict JSON schema, and anti-hallucination guards.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          {[
            { metric: 'GROQ (Default)', desc: 'llama-3.3-70b-versatile via api.groq.com. Fast inference, free tier available. GROQ_API_KEY env var.', pts: 'Default' },
            { metric: 'Gemini (Fallback)', desc: 'gemini-2.0-flash via Google AI. GEMINI_API_KEY env var.', pts: 'Fallback' },
            { metric: 'OpenAI', desc: 'gpt-4o-mini via api.openai.com. More reliable structure. OPENAI_API_KEY env var.', pts: 'Optional' },
            { metric: 'Temperature', desc: '0.1 — low creativity, high determinism. Ensures consistent structured output.', pts: '0.1' },
            { metric: 'Anti-Hallucination', desc: 'Only extract values that literally appear in OCR text. NEVER invent, guess, or assume.', pts: 'Critical' },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              style={{ background: '#1e293b', borderRadius: 10, padding: '12px 14px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 14 }}>{item.metric}</div>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 3, background: '#8b5cf622', color: '#a78bfa', fontWeight: 600 }}>{item.pts}</span>
              </div>
              <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.5 }}>{item.desc}</div>
            </motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          style={{ background: '#1e293b', borderRadius: 10, padding: '12px 14px', border: '1px solid #334155' }}>
          <div style={{ fontWeight: 700, color: '#fbbf24', marginBottom: 4, fontSize: 14 }}>Extracted Fields</div>
          <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.7 }}>
            <strong style={{ color: '#a5b4fc' }}>personal_data</strong>: first_name, middle_name, last_name, birth_date<br />
            <strong style={{ color: '#a5b4fc' }}>other_fields</strong>: id_number, gender (M/F), nationality, address, expiry_date, issue_date, blood_type (A/B/AB/O ±), civil_status (S/M/D/W), occupation, mother_maiden_name, father_name, place_of_birth, height, weight, eye_color, restrictions<br />
            <strong style={{ color: '#a5b4fc' }}>id_information</strong>: per-ID data (id_label, id_type_code, id_type_name, id_number) for multi-ID cross-referencing
          </div>
        </motion.div>
      </div>
    ),
  },
  {
    id: 'ocr-ai-eval',
    title: 'AI Parser Evaluation',
    subtitle: 'GROQ vs OpenAI — speed, cost, and accuracy comparison',
    section: 'Provider Comparisons',
    content: (
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            { name: 'GROQ (Llama 3.3 70B)', role: 'Default', speed: 'Fast (~1-2s)', cost: 'Free tier (5K req/min) or ~$0.0002/call', accuracy: 'Good', note: 'Fast inference, free tier, good for high volume. Occasional JSON drift under load.', color: '#8b5cf6' },
            { name: 'Gemini (Gemini-2.0-flash)', role: 'Fallback', speed: 'Fast (~1-2s)', cost: 'Free tier available, then ~$0.00015/call', accuracy: 'Excellent', note: 'Google AI. GEMINI_API_KEY env var. Fast and reliable.', color: '#8b5cf6' },
            { name: 'OpenAI (GPT-4o-mini)', role: 'Optional', speed: 'Moderate (~2-4s)', cost: '~$0.00015/call, no free tier', accuracy: 'Excellent', note: 'More consistent JSON, better at ambiguous fields. Slower but reliable.', color: '#22c55e' },
            { name: 'Anthropic Claude 3.5 Haiku', role: 'Recommended', speed: 'Moderate (~2-3s)', cost: '~$0.003/call, no free tier', accuracy: 'Excellent', note: 'Best structured output of all tested. Already integrated via Bedrock for OCR vision.', color: '#f59e0b' },
            { name: 'Google Gemini 2.0 Flash', role: 'Recommended', speed: 'Fast (~1-2s)', cost: 'Free tier (1,500 req/day) or ~$0.0001/call', accuracy: 'Very good', note: 'Competitive with GROQ on speed. Strong structured output. Generous free tier.', color: '#3b82f6' },
            { name: 'DeepSeek V3', role: 'Worth trying', speed: 'Fast (~1-2s)', cost: 'Free tier or ~$0.0001/call', accuracy: 'Good', note: 'Very cheap, good structured output. Growing ecosystem.', color: '#f59e0b' },
            { name: 'Together AI (Mixtral 8x22B)', role: 'Worth trying', speed: 'Moderate (~2-3s)', cost: 'Free tier ($25 credit) or ~$0.0009/call', accuracy: 'Good', note: 'Open-source models, similar to GROQ. Good alternative.', color: '#f97316' },
          ].map((p, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              style={{ background: `${p.color}08`, borderRadius: 12, padding: '12px 14px', border: `1px solid ${p.color}33`, borderTop: `3px solid ${p.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 14 }}>{p.name}</span>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 3, background: `${p.color}22`, color: p.color, fontWeight: 600 }}>{p.role}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, marginBottom: 4 }}>
                <div style={{ fontSize: 12, color: '#94a3b8' }}><strong style={{ color: '#cbd5e1' }}>Speed:</strong> {p.speed}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}><strong style={{ color: '#cbd5e1' }}>Cost:</strong> {p.cost}</div>
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}><strong style={{ color: '#cbd5e1' }}>Note:</strong> {p.note}</div>
            </motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,102,241,0.15))', borderRadius: 12, padding: '14px 18px', border: '1px solid rgba(139,92,246,0.3)' }}>
          <div style={{ fontWeight: 700, color: '#c4b5fd', marginBottom: 6, fontSize: 15 }}>Recommendation</div>
          <div style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.7 }}>
            <strong style={{ color: '#a5b4fc' }}>GROQ (Llama 3.3 70B)</strong> as the default — it's fast, free-tier available, and produces consistently good structured output for PH ID parsing. Use <strong style={{ color: '#86efac' }}>OpenAI (GPT-4o-mini)</strong> as a fallback when GROQ is unavailable or when you need more reliable JSON structure for edge cases. For production, consider <strong style={{ color: '#fbbf24' }}>Anthropic Claude (Haiku)</strong> as a premium option — it has the most reliable structured output of all tested models, though at higher cost (~$0.003/call). <strong style={{ color: '#93c5fd' }}>Google Gemini 2.0 Flash</strong> is a strong free-tier alternative with competitive speed and accuracy.
          </div>
        </motion.div>
      </div>
    ),
  },
  {
    id: 'ocr-flow',
    title: 'End-to-End Flow',
    subtitle: 'From capture to structured JSON in 3 API calls',
    section: 'Provider Comparisons',
    content: (
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 1.8, marginBottom: 16 }}>
          The complete flow from ID capture to structured data extraction:
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {[
            { step: '1. Capture', detail: 'User captures or uploads ID front + back via ImageCapture component. SVG mockups guide framing. Camera or file upload.' },
            { step: '2. OCR Detect', detail: 'Frontend sends each image to POST /ocr/detect. Server runs rekognition.detect_text() + detect_labels(). Returns raw text_lines + id_type.' },
            { step: '3. OCR All (Bulk)', detail: 'runAllOcr() iterates all images across all ID entries, calls /ocr/detect per image. Stores results per entry.' },
            { step: '4. Deduplicate', detail: 'OCR texts from all sides/entries are collected, deduplicated to avoid redundant AI processing.' },
            { step: '5. AI Parse', detail: 'POST /ocr/parse with deduplicated text. LLM uses PH ID Type Registry prompt. Returns structured JSON.' },
            { step: '6. Display', detail: '2-column layout: left shows raw OCR text with ID/side headers, right shows AI-parsed result in organized sections.' },
          ].map((p, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
              style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: '#1e293b', borderRadius: 8, padding: '10px 14px', border: '1px solid #334155', borderLeft: `3px solid ${i < 2 ? '#6366f1' : i < 4 ? '#8b5cf6' : '#22c55e'}` }}>
              <span style={{ fontWeight: 700, color: '#a5b4fc', fontSize: 14, minWidth: 80 }}>{p.step}</span>
              <span style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5 }}>{p.detail}</span>
            </motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          style={{ background: '#1e293b', borderRadius: 10, padding: '12px 14px', border: '1px solid #334155' }}>
          <div style={{ fontWeight: 700, color: '#fbbf24', marginBottom: 4, fontSize: 14 }}>Provider Detection</div>
          <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>
            ID type is detected via <strong style={{ color: '#93c5fd' }}>AWS Rekognition detect_labels()</strong> at ≥70% confidence (labels: ID Card, Passport, Driver\'s License, etc.). The AI parser then classifies more precisely using the PH ID Type Registry based on text content.
          </div>
        </motion.div>
      </div>
    ),
  },
  {
    id: 'ocr-recommendations',
    title: 'Recommendations',
    subtitle: 'Best path forward for production',
    section: 'Conclusion',
    content: (
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ fontSize: 15, color: '#cbd5e1', lineHeight: 1.8, marginBottom: 16 }}>
          Based on our spike findings, here are the recommended approaches for production:
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {[
            { tier: '🥇 Best OCR', provider: 'AWS Textract', desc: 'Better accuracy than Rekognition for dense ID text. Handles Philippine IDs well. ~$0.0015/page.', color: '#22c55e' },
            { tier: '🥇 Best AI Parser', provider: 'GROQ (Llama 3.3)', desc: 'Fast, free tier available, good structured output. Falls back to OpenAI GPT-4o-mini if GROQ is unavailable.', color: '#8b5cf6' },
            { tier: '🥈 Fallback OCR', provider: 'AWS Rekognition OCR', desc: 'Default provider, always available. detect_text() for OCR + detect_labels() for ID type. $0.001/check.', color: '#3b82f6' },
            { tier: '🥉 Vision OCR', provider: 'Bedrock Claude 3', desc: 'Vision-based extraction via Claude. Can read text that traditional OCR misses. Slower and more expensive.', color: '#f59e0b' },
          ].map((r, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
              style={{ background: `${r.color}08`, borderRadius: 10, padding: '14px 16px', border: `1px solid ${r.color}33`, borderLeft: `4px solid ${r.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 16 }}>{r.tier}</span>
                <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 15 }}>{r.provider}</span>
              </div>
              <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>{r.desc}</div>
            </motion.div>
          ))}
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))', borderRadius: 12, padding: '14px 18px', border: '1px solid rgba(99,102,241,0.3)' }}>
          <div style={{ fontWeight: 700, color: '#a5b4fc', marginBottom: 6, fontSize: 15 }}>Next Steps</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              'Implement additional OCR providers (Google DocAI, Azure DI) for comparison',
              'Add explicit country detection logic for non-PH IDs',
              'Improve image quality heuristics for Philippine ID-specific layouts',
              'Add field-level confidence scores from AI parsing',
              'Integrate OCR pipeline with liveness + face matching for unified KYC flow (CPS-220 → CPS-222 → CPS-221)',
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: '#cbd5e1', fontSize: 13 }}>
                <span style={{ color: '#818cf8', marginTop: 1 }}>▸</span>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    ),
  },
  {
    id: 'ocr-thanks',
    title: 'Thank You',
    subtitle: 'CPS-220: OCR & ID Type Detection Spike Complete',
    section: 'Conclusion',
    content: (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          style={{ fontSize: 28, fontWeight: 800, background: 'linear-gradient(135deg, #818cf8, #22c55e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 6, letterSpacing: -0.5 }}
        >OCR & ID Type Detection</motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.45 }}
          style={{ fontSize: 14, color: '#94a3b8', marginBottom: 2 }}
        >9 providers evaluated · 3 active backends · 14 PH ID types</motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}
        >CPS-220 · OCR & ID Type Detection spike complete</motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.55 }}
          style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}
        >
          <a href="https://svi-jira.atlassian.net/browse/CPS-220" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', textDecoration: 'underline' }}>Jira: CPS-220</a>
          {' · '}
          <a href="https://svi-jira.atlassian.net/wiki/spaces/~71202071852762867849479b4d350bd48b7534/pages/250740911/CPS-221+Spike+Biometric+Face+Matching+UX+vs.+Async+Backend" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', textDecoration: 'underline' }}>Confluence</a>
        </motion.div>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: 60 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          style={{ height: 2, background: 'linear-gradient(90deg, #6366f1, #22c55e)', margin: '12px 0', borderRadius: 2 }}
        />
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.7 }}
          style={{ fontSize: 16, color: '#cbd5e1', marginBottom: 2, fontWeight: 700, letterSpacing: 2 }}
        >KGV</motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.8 }}
          style={{ fontSize: 12, color: '#64748b' }}
        >RBAC Team</motion.div>
      </motion.div>
    ),
  },
];
