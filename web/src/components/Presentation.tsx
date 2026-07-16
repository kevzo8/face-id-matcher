import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { slides, livenessSlides, ocrSlides, biometricSlides, Slide } from '../data/slides.tsx';

const sectionColors: Record<string, string> = {
  Overview: '#6366f1',
  'Provider Comparisons': '#22c55e',
  Results: '#f59e0b',
  'PH Registry': '#f97316',
  'AI Parsing': '#8b5cf6',
  Conclusion: '#a855f7',
};

const darkTheme = {
  bg: '#0f172a',
  sidebarBg: '#1e293b',
  cardBg: '#1e293b',
  border: '#334155',
  text: '#e2e8f0',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  textSubtle: '#475569',
  accent: '#a5b4fc',
  link: '#818cf8',
  dotInactive: '#334155',
  footerBg: '#0f172a',
  footerBorder: '#1e293b',
};

const lightTheme = {
  bg: '#f8fafc',
  sidebarBg: '#ffffff',
  cardBg: '#ffffff',
  border: '#e2e8f0',
  text: '#1e293b',
  textSecondary: '#475569',
  textMuted: '#64748b',
  textSubtle: '#94a3b8',
  accent: '#4f46e5',
  link: '#4f46e5',
  dotInactive: '#cbd5e1',
  footerBg: '#f8fafc',
  footerBorder: '#e2e8f0',
};

const MOBILE_BP = 768;

export default function Presentation({ feature = 'id_to_face', initialSlide = 0, onClose }: { feature?: string; initialSlide?: number; onClose: () => void }) {
  const currentSlides = feature === 'liveness' ? livenessSlides : feature === 'ocr' ? ocrSlides : feature === 'biometric' ? biometricSlides : slides;
  const [current, setCurrent] = useState(initialSlide);
  const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BP);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= MOBILE_BP);
  const [dark, setDark] = useState(true);
  const total = currentSlides.length;
  const t = dark ? darkTheme : lightTheme;

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < MOBILE_BP);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const baseRoute = '/' + ({ id_to_face: 'face-id', liveness: 'liveness', ocr: 'ocr', biometric: 'biometric' })[feature] + '/presentation/';

  const goTo = useCallback((i: number) => {
    if (i >= 0 && i < total) {
      setCurrent(i);
      window.history.replaceState(null, '', `${baseRoute}${i}`);
      if (isMobile) setSidebarOpen(false);
    }
  }, [total, isMobile, baseRoute]);

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        prev();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [next, prev, onClose]);

  const section = currentSlides[current].section;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const btnStyle: React.CSSProperties = {
    background: t.sidebarBg, border: `1px solid ${t.border}`,
    borderRadius: 6, color: t.textSecondary, cursor: 'pointer',
    padding: '4px 8px', fontSize: 13, whiteSpace: 'nowrap',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', background: t.bg, color: t.text,
      fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
    }}>
      {/* Mobile overlay backdrop */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 199 }}
        />
      )}

      {/* Left Sidebar */}
      <motion.aside
        animate={{ width: sidebarOpen ? 240 : 0, opacity: sidebarOpen ? 1 : 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        style={{
          overflow: 'hidden', flexShrink: 0,
          background: t.sidebarBg, borderRight: `1px solid ${t.border}`,
          display: 'flex', flexDirection: 'column',
          ...(isMobile ? { position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 200, width: sidebarOpen ? 240 : 0 } : {}),
        }}
      >
        <div style={{ padding: '18px 16px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>Face ID Matcher</div>
            <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>CPS-221 POC</div>
          </div>
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} style={{ ...btnStyle, padding: '2px 6px' }}>✕</button>
          )}
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '6px 0' }}>
          {(() => {
            let lastSection = '';
            return currentSlides.map((slide, i) => {
              const showSection = slide.section !== lastSection;
              lastSection = slide.section;
              return (
                <React.Fragment key={slide.id}>
                  {showSection && (
                    <div style={{
                      fontSize: 10, fontWeight: 700, color: t.textMuted,
                      padding: '10px 16px 4px', textTransform: 'uppercase',
                      letterSpacing: 1.2,
                    }}>
                      {slide.section}
                    </div>
                  )}
                  <motion.div
                    whileHover={{ background: 'rgba(99,102,241,0.08)' }}
                    onClick={() => goTo(i)}
                    style={{
                      padding: '8px 16px', cursor: 'pointer', fontSize: 13,
                      fontWeight: i === current ? 600 : 400,
                      color: i === current ? t.text : t.textSecondary,
                      background: i === current ? 'rgba(99,102,241,0.15)' : 'transparent',
                      borderLeft: i === current ? '3px solid #6366f1' : '3px solid transparent',
                      transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}
                  >
                    <motion.span
                      animate={i === current ? { scale: [1, 1.15, 1] } : {}}
                      transition={{ duration: 0.4 }}
                      style={{
                        width: 20, height: 20, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700,
                        background: i === current ? 'linear-gradient(135deg, #6366f1, #a855f7)' : t.dotInactive,
                        color: i === current ? '#fff' : t.textMuted,
                        flexShrink: 0,
                      }}>{i + 1}</motion.span>
                    <span style={{ lineHeight: 1.4 }}>{slide.title}</span>
                  </motion.div>
                </React.Fragment>
              );
            });
          })()}
        </div>
        <div style={{ padding: '14px 16px', borderTop: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 8 }}>
            {current + 1} of {total}
          </div>
          <div style={{
            height: 3, background: t.dotInactive, borderRadius: 2, overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', background: 'linear-gradient(90deg, #6366f1, #a855f7)',
              width: `${((current + 1) / total) * 100}%`,
              borderRadius: 2, transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
        <div style={{ padding: '10px 16px 14px', borderTop: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Switch Presentation</div>
          <button onClick={() => window.location.href = '/face-id/presentation/0'}
            style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 6, cursor: 'pointer', background: feature === 'id_to_face' ? 'rgba(168,85,247,0.2)' : 'transparent', color: feature === 'id_to_face' ? '#d8b4fe' : t.textMuted, textAlign: 'left', borderLeft: `3px solid ${feature === 'id_to_face' ? '#a855f7' : 'transparent'}` }}>
            Face to ID
          </button>
          <button onClick={() => window.location.href = '/liveness/presentation/0'}
            style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'transparent', color: feature === 'liveness' ? '#fdba74' : t.textMuted, textAlign: 'left', borderLeft: `3px solid ${feature === 'liveness' ? '#f97316' : 'transparent'}` }}>
            Liveness
          </button>
          <button onClick={() => window.location.href = '/ocr/presentation/0'}
            style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'transparent', color: feature === 'ocr' ? '#86efac' : t.textMuted, textAlign: 'left', borderLeft: `3px solid ${feature === 'ocr' ? '#22c55e' : 'transparent'}` }}>
            OCR & ID Type
          </button>
          <button onClick={() => window.location.href = '/biometric/presentation/0'}
            style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'transparent', color: feature === 'biometric' ? '#fbbf24' : t.textMuted, textAlign: 'left', borderLeft: `3px solid ${feature === 'biometric' ? '#fbbf24' : 'transparent'}` }}>
            Biometric Auth
          </button>
          <button onClick={() => window.location.href = '/'}
            style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, border: '1px solid #475569', borderRadius: 4, cursor: 'pointer', background: 'transparent', color: t.textMuted, textAlign: 'center', marginTop: 4 }}>
            Back to App
          </button>
        </div>
      </motion.aside>

      {/* Top toolbar */}
      <div style={{
        position: 'absolute', top: 8, left: 8, right: 8, zIndex: 100,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        pointerEvents: 'none',
      }}>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{ ...btnStyle, pointerEvents: 'auto', marginLeft: sidebarOpen && !isMobile ? 248 : 0, transition: 'margin-left 0.3s' }}
        >
          {sidebarOpen ? '◀' : '☰'}
        </button>
        <div style={{ display: 'flex', gap: 6, pointerEvents: 'auto' }}>
          <button onClick={() => setDark(!dark)} style={btnStyle}>
            {dark ? '☀' : '🌙'}
          </button>
          <button onClick={onClose} style={btnStyle}>✕</button>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        data-theme={dark ? 'dark' : 'light'}
        style={{
          flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          background: '#0f172a', color: '#e2e8f0',
          filter: dark ? 'none' : 'invert(1) hue-rotate(180deg)',
        }}
      >
        <style>{`
          [data-theme="light"] img {
            filter: hue-rotate(180deg) invert(1);
          }
        `}</style>
        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden', padding: isMobile ? '52px 12px 8px' : '52px 24px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', overflowY: 'auto' }}>
          {/* Section indicator */}
          <motion.div
            key={`indicator-${current}`}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, paddingLeft: isMobile ? 0 : 20, flexWrap: 'wrap' }}
          >
            <span style={{
              display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
              background: sectionColors[section] || '#6366f1',
              boxShadow: `0 0 12px ${sectionColors[section] || '#6366f1'}66`,
            }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1.5 }}>
              {section}
            </span>
            <span style={{ color: '#334155' }}>·</span>
            <span style={{ fontSize: 11, color: '#475569' }}>Slide {current + 1} of {total}</span>
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {(() => {
                const sid = currentSlides[current].id;
                const titleConfig: Record<string, {
                  icon: React.ReactNode; title: string; subtitle: string; fullTitle: string;
                  badges: { label: string; color: string; bgFrom: string; bgTo: string }[];
                  desc: string; jira: string; links: { label: string; url: string }[];
                  gradFrom: string; gradTo: string; gradMid: string;
                  btnGradFrom: string; btnGradTo: string;
                } | undefined> = {
                  app: {
                    icon: <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 6 }}>
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>,
                    title: 'Face ID Matcher', subtitle: 'Biometric Face Matching — CPS-221', fullTitle: 'CPS-221: Spike — Biometric Face Matching (UX vs. Async Backend)',
                    badges: [
                      { label: '7 Providers', color: '#a5b4fc', bgFrom: 'rgba(99,102,241,0.25)', bgTo: 'rgba(129,140,248,0.15)' },
                      { label: '40 Test Pairs', color: '#86efac', bgFrom: 'rgba(34,197,94,0.25)', bgTo: 'rgba(74,222,128,0.15)' },
                      { label: '27 Subjects', color: '#fde68a', bgFrom: 'rgba(234,179,8,0.25)', bgTo: 'rgba(250,204,21,0.15)' },
                      { label: '100% Accuracy', color: '#d8b4fe', bgFrom: 'rgba(168,85,247,0.25)', bgTo: 'rgba(192,132,252,0.15)' },
                    ],
                    desc: "Benchmarking seven face verification providers for SVI's KYC identity verification flow. Results validated on Kaggle dataset at 800px and full resolution.",
                    jira: 'CPS-221',
                    links: [
                      { label: 'Jira: CPS-221', url: 'https://svi-jira.atlassian.net/browse/CPS-221' },
                      { label: 'Confluence', url: 'https://svi-jira.atlassian.net/wiki/spaces/~71202071852762867849479b4d350bd48b7534/pages/250740911/CPS-221+Spike+Biometric+Face+Matching+UX+vs.+Async+Backend' },
                      { label: 'Live App', url: 'https://vegamatcher.kevinguadalupevega.com/' },
                      { label: 'Demo Video', url: 'https://screenrec.com/share/irItDuPKEv' },
                    ],
                    gradFrom: '#818cf8', gradMid: '#a78bfa', gradTo: '#c084fc',
                    btnGradFrom: '#6366f1', btnGradTo: '#a855f7',
                  },
                  'liveness-title': {
                    icon: <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 6 }}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>,
                    title: 'Liveness Detection POC', subtitle: 'Biometric Liveness — CPS-222', fullTitle: 'CPS-222: Spike — Research Non-PhilSys Liveness Detection (Passive & Active)',
                    badges: [
                      { label: '10 Providers Tested', color: '#fdba74', bgFrom: 'rgba(249,115,22,0.25)', bgTo: 'rgba(251,146,60,0.15)' },
                      { label: 'Active + Passive', color: '#86efac', bgFrom: 'rgba(34,197,94,0.25)', bgTo: 'rgba(74,222,128,0.15)' },
                      { label: 'Browser + Cloud', color: '#fdba74', bgFrom: 'rgba(249,115,22,0.25)', bgTo: 'rgba(251,146,60,0.15)' },
                    ],
                    desc: 'Evaluating 10 liveness detection providers across active (challenge-response) and passive (single-frame analysis) methods for SVI KYC.',
                    jira: 'CPS-222',
                    links: [
                      { label: 'Jira: CPS-222', url: 'https://svi-jira.atlassian.net/browse/CPS-222' },
                      { label: 'Confluence', url: 'https://svi-jira.atlassian.net/wiki/spaces/~71202071852762867849479b4d350bd48b7534/pages/250740911/CPS-221+Spike+Biometric+Face+Matching+UX+vs.+Async+Backend' },
                    ],
                    gradFrom: '#f97316', gradMid: '#ea580c', gradTo: '#fdba74',
                    btnGradFrom: '#ea580c', btnGradTo: '#f97316',
                  },
                  'ocr-title': {
                    icon: <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 6 }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>,
                    title: 'OCR & ID Type Detection POC', subtitle: 'Optical Character Recognition — CPS-220', fullTitle: 'CPS-220: SPIKE: Auto-Detect ID Type and OCR Extraction',
                    badges: [
                      { label: '9 Providers Evaluated', color: '#a5b4fc', bgFrom: 'rgba(99,102,241,0.25)', bgTo: 'rgba(129,140,248,0.15)' },
                      { label: '3 Active Backends', color: '#86efac', bgFrom: 'rgba(34,197,94,0.25)', bgTo: 'rgba(74,222,128,0.15)' },
                      { label: '14 PH ID Types', color: '#d8b4fe', bgFrom: 'rgba(139,92,246,0.25)', bgTo: 'rgba(192,132,252,0.15)' },
                    ],
                    desc: 'OCR pipeline for Philippine government IDs with AI-powered structured extraction. 9 providers evaluated, 3 implemented, PH ID Type Registry with LLM parsing.',
                    jira: 'CPS-220',
                    links: [
                      { label: 'Jira: CPS-220', url: 'https://svi-jira.atlassian.net/browse/CPS-220' },
                      { label: 'Confluence', url: 'https://svi-jira.atlassian.net/wiki/spaces/~71202071852762867849479b4d350bd48b7534/pages/250740911/CPS-221+Spike+Biometric+Face+Matching+UX+vs.+Async+Backend' },
                    ],
                    gradFrom: '#818cf8', gradMid: '#4ade80', gradTo: '#22c55e',
                    btnGradFrom: '#16a34a', btnGradTo: '#22c55e',
                  },
                  'bio-title': {
                    icon: <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 6 }}>
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>,
                    title: 'Biometric Transaction Authentication', subtitle: 'Architecture & Integration Design — CPS-289', fullTitle: 'CPS-289: SPIKE: Architecture & Integration Design for Biometric Transaction Authentication',
                    badges: [
                      { label: 'Iframe Widget', color: '#fbbf24', bgFrom: 'rgba(245,158,11,0.25)', bgTo: 'rgba(251,191,36,0.15)' },
                      { label: 'Layered Liveness', color: '#86efac', bgFrom: 'rgba(34,197,94,0.25)', bgTo: 'rgba(74,222,128,0.15)' },
                      { label: '3 Providers', color: '#a5b4fc', bgFrom: 'rgba(99,102,241,0.25)', bgTo: 'rgba(129,140,248,0.15)' },
                      { label: 'Redis + Cassandra', color: '#d8b4fe', bgFrom: 'rgba(139,92,246,0.25)', bgTo: 'rgba(192,132,252,0.15)' },
                    ],
                    desc: 'Secure, plug-and-play architecture for injecting biometric verification into client apps before high-value transactions. Iframe widget + backend session API, layered liveness, and transaction binding without exposing identity data.',
                    jira: 'CPS-289',
                    links: [
                      { label: 'Jira: CPS-289', url: 'https://svi-jira.atlassian.net/browse/CPS-289' },
                      { label: 'Confluence', url: 'https://svi-jira.atlassian.net/wiki/spaces/~71202071852762867849479b4d350bd48b7534/pages/268075010/CPS-289+SPIKE+Architecture+Integration+Design+for+Biometric+Transaction+Authentication' },
                    ],
                    gradFrom: '#fbbf24', gradMid: '#f59e0b', gradTo: '#fcd34d',
                    btnGradFrom: '#d97706', btnGradTo: '#f59e0b',
                  },
                };

                const cfg = titleConfig[sid];
                if (cfg) {
                  return (
                    <div style={{ textAlign: 'center', paddingTop: isMobile ? '2vh' : '8vh' }}>
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      >
                        {cfg.icon}
                        <div style={{ fontSize: isMobile ? 26 : 36, fontWeight: 800, background: `linear-gradient(135deg, ${cfg.gradFrom}, ${cfg.gradMid}, ${cfg.gradTo})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8 }}>
                          {cfg.title}
                        </div>
                        <div style={{ fontSize: isMobile ? 14 : 18, color: '#94a3b8', marginBottom: 4, fontWeight: 500 }}>
                          {cfg.subtitle}
                        </div>
                        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 28, letterSpacing: 0.5 }}>
                          {cfg.fullTitle}
                        </div>
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.2 }}
                          style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 36, flexWrap: 'wrap' }}
                        >
                          {cfg.badges.map((b, i) => (
                            <span key={i} style={{ background: `linear-gradient(135deg, ${b.bgFrom}, ${b.bgTo})`, color: b.color, padding: '6px 14px', borderRadius: 8, fontSize: isMobile ? 11 : 13, fontWeight: 600, border: `1px solid ${b.bgFrom}` }}>{b.label}</span>
                          ))}
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.4, delay: 0.35 }}
                          style={{ color: '#94a3b8', fontSize: 14, maxWidth: 520, margin: '0 auto', lineHeight: 1.8 }}
                        >
                          {cfg.desc}
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.4, delay: 0.45 }}
                          style={{ marginTop: 16, fontSize: 12, color: '#64748b' }}
                        >
                          {cfg.links.map((l, i) => (
                            <span key={i}>
                              {i > 0 && <span> · </span>}
                              <a href={l.url} target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', textDecoration: 'underline' }}>{l.label}</a>
                            </span>
                          ))}
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.5 }}
                          style={{ marginTop: 12, fontSize: 13, color: '#64748b', letterSpacing: 1 }}
                        >
                          Presented by <span style={{ color: '#a5b4fc', fontWeight: 600 }}>Kevin G. Vega</span>
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.65 }}
                          style={{ marginTop: 32, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}
                        >
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={next}
                            style={{ padding: '12px 28px', background: `linear-gradient(135deg, ${cfg.btnGradFrom}, ${cfg.btnGradTo})`, color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: `0 4px 20px ${cfg.btnGradFrom}66` }}
                          >
                            Start Presentation <motion.span animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>→</motion.span>
                          </motion.button>
                          <button onClick={onClose} style={{ padding: '12px 28px', background: t.sidebarBg, color: t.textSecondary, border: `1px solid ${t.border}`, borderRadius: 10, fontSize: 14, cursor: 'pointer' }}>
                            Back to App
                          </button>
                        </motion.div>
                      </motion.div>
                    </div>
                  );
                }
                return null;
              })()}
              {currentSlides[current].id !== 'app' && currentSlides[current].id !== 'liveness-title' && currentSlides[current].id !== 'ocr-title' && currentSlides[current].id !== 'bio-title' && currentSlides[current].content === null ? (
                <div style={{ textAlign: 'center', paddingTop: isMobile ? '4vh' : '10vh' }}>
                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <div style={{ fontSize: isMobile ? 26 : 36, fontWeight: 800, background: 'linear-gradient(135deg, #818cf8, #a78bfa, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8 }}>
                      {currentSlides[current].title}
                    </div>
                    {currentSlides[current].subtitle && (
                      <div style={{ fontSize: isMobile ? 14 : 18, color: '#94a3b8', marginBottom: 4, fontWeight: 500 }}>{currentSlides[current].subtitle}</div>
                    )}
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.4 }}
                      style={{ marginTop: 32, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}
                    >
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} onClick={next}
                        style={{ padding: '12px 28px', background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}>
                        Start Presentation <motion.span animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>→</motion.span>
                      </motion.button>
                      <button onClick={onClose} style={{ padding: '12px 28px', background: t.sidebarBg, color: t.textSecondary, border: `1px solid ${t.border}`, borderRadius: 10, fontSize: 14, cursor: 'pointer' }}>
                        Back to App
                      </button>
                    </motion.div>
                  </motion.div>
                </div>
              ) : currentSlides[current].id === 'thankyou' || currentSlides[current].id === 'liveness-thanks' || currentSlides[current].id === 'ocr-thanks' ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                >
                  {currentSlides[current].content}
                </motion.div>
              ) : (
                <div>
                  <motion.div
                    initial={{ opacity: 0, y: -15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.05, ease: 'easeOut' }}
                  >
                    <h2 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, color: '#e2e8f0', marginBottom: 2, letterSpacing: -0.5 }}>{currentSlides[current].title}</h2>
                    {currentSlides[current].subtitle && (
                      <p style={{ fontSize: isMobile ? 13 : 16, color: '#64748b', marginBottom: isMobile ? 12 : 20, lineHeight: 1.6 }}>{currentSlides[current].subtitle}</p>
                    )}
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.12, ease: 'easeOut' }}
                  >
                    {currentSlides[current].content}
                  </motion.div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{
            borderTop: '1px solid #1e293b', padding: isMobile ? '6px 12px' : '8px 24px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: '#0f172a', gap: isMobile ? 8 : 0,
          }}
        >
          <motion.button
            whileHover={current > 0 ? { scale: 1.05, borderColor: '#6366f1', color: '#e2e8f0' } : {}}
            whileTap={current > 0 ? { scale: 0.97 } : {}}
            onClick={prev}
            disabled={current === 0}
            style={{
              padding: isMobile ? '6px 12px' : '8px 20px', borderRadius: 8, border: '1px solid #334155',
              background: '#1e293b',
              color: current === 0 ? '#334155' : '#94a3b8',
              cursor: current === 0 ? 'not-allowed' : 'pointer',
              fontSize: isMobile ? 12 : 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all 0.2s',
            }}
          >
            ← {isMobile ? 'Prev' : 'Previous'}
          </motion.button>

          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {currentSlides.map((_, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: i === current ? 1 : 1.5 }}
                  onClick={() => goTo(i)}
                  animate={{
                    width: i === current ? 24 : 7,
                    background: i === current ? '#6366f1' : '#334155',
                  }}
                  transition={{ duration: 0.3 }}
                  style={{ height: 7, borderRadius: 4, cursor: 'pointer' }}
                />
              ))}
            </div>
          )}

          {isMobile && (
            <span style={{ fontSize: 11, color: '#64748b' }}>{current + 1}/{total}</span>
          )}

          <motion.button
            whileHover={current < total - 1 ? { scale: 1.05, borderColor: '#6366f1', color: '#e2e8f0' } : {}}
            whileTap={current < total - 1 ? { scale: 0.97 } : {}}
            onClick={next}
            disabled={current === total - 1}
            style={{
              padding: isMobile ? '6px 12px' : '8px 20px', borderRadius: 8, border: '1px solid #334155',
              background: '#1e293b',
              color: current === total - 1 ? '#334155' : '#94a3b8',
              cursor: current === total - 1 ? 'not-allowed' : 'pointer',
              fontSize: isMobile ? 12 : 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all 0.2s',
            }}
          >
            Next →
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
