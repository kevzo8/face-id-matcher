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
      All providers had zero false positives — every provider is conservative, favoring no-match over wrong match.<br />
      Detection errors are resolution-specific (not person-specific): retrying at 2000px+ eliminates most failures.
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
    title: 'Face ID Matcher POC',
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
          <a href="https://vegamatcher.kevinguadalupevega.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', textDecoration: 'underline' }}>Live Demo</a>
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
