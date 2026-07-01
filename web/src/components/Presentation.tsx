import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { slides, Slide } from '../data/slides.tsx';

const sectionColors: Record<string, string> = {
  Overview: '#6366f1',
  Comparison: '#22c55e',
  Results: '#f59e0b',
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

export default function Presentation({ initialSlide = 0, onClose }: { initialSlide?: number; onClose: () => void }) {
  const [current, setCurrent] = useState(initialSlide);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dark, setDark] = useState(true);
  const total = slides.length;
  const t = dark ? darkTheme : lightTheme;

  const goTo = useCallback((i: number) => {
    if (i >= 0 && i < total) {
      setCurrent(i);
      window.history.replaceState(null, '', `/presentation/${i}`);
    }
  }, [total]);

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

  const section = slides[current].section;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', background: t.bg, color: t.text,
      fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
    }}>
      {/* Left Sidebar */}
      <motion.aside
        animate={{ width: sidebarOpen ? 240 : 0, opacity: sidebarOpen ? 1 : 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        style={{
          overflow: 'hidden', flexShrink: 0,
          background: t.sidebarBg, borderRight: `1px solid ${t.border}`,
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{ padding: '18px 16px', borderBottom: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>Face ID Matcher POC</div>
          <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>CPS-221 POC</div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '6px 0' }}>
          {(() => {
            let lastSection = '';
            return slides.map((slide, i) => {
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
      </motion.aside>

      {/* Toggle sidebar button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          position: 'absolute', top: 12,
          left: sidebarOpen ? 244 : 8,
          zIndex: 100, background: t.sidebarBg, border: `1px solid ${t.border}`,
          borderRadius: 6, color: t.textSecondary, cursor: 'pointer',
          padding: '4px 8px', fontSize: 14, transition: 'left 0.3s',
        }}
      >
        {sidebarOpen ? '◀' : '▶'}
      </button>

      {/* Theme toggle button */}
      <button
        onClick={() => setDark(!dark)}
        style={{
          position: 'absolute', top: 12, right: 80, zIndex: 100,
          background: t.sidebarBg, border: `1px solid ${t.border}`,
          borderRadius: 6, color: t.textSecondary, cursor: 'pointer',
          padding: '4px 10px', fontSize: 13,
        }}
      >
        {dark ? '☀ Light' : '🌙 Dark'}
      </button>

      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 12, right: 12, zIndex: 100,
          background: t.sidebarBg, border: `1px solid ${t.border}`,
          borderRadius: 6, color: t.textSecondary, cursor: 'pointer',
          padding: '4px 10px', fontSize: 13,
        }}
      >
        ✕ Exit
      </button>

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
        <div style={{ flex: 1, overflow: 'hidden', padding: '20px 24px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', overflowY: 'auto' }}>
          {/* Section indicator */}
          <motion.div
            key={`indicator-${current}`}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, paddingLeft: 20 }}
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
              {slides[current].id === 'app' ? (
                <div style={{ textAlign: 'center', paddingTop: '8vh' }}>
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  >
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 6 }}>
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <div style={{ fontSize: 36, fontWeight: 800, background: 'linear-gradient(135deg, #818cf8, #a78bfa, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 8 }}>
                      Face ID Matcher POC
                    </div>
                    <div style={{ fontSize: 18, color: '#94a3b8', marginBottom: 4, fontWeight: 500 }}>
                      Biometric Face Matching — CPS-221
                    </div>
                    <div style={{ fontSize: 13, color: '#64748b', marginBottom: 28, letterSpacing: 0.5 }}>
                      CPS-221: Spike — Biometric Face Matching (UX vs. Async Backend)
                    </div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                      style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 36 }}
                    >
                      <span style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(129,140,248,0.15))', color: '#a5b4fc', padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px solid rgba(99,102,241,0.3)' }}>7 Providers</span>
                      <span style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.25), rgba(74,222,128,0.15))', color: '#86efac', padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px solid rgba(34,197,94,0.3)' }}>40 Test Pairs</span>
                      <span style={{ background: 'linear-gradient(135deg, rgba(234,179,8,0.25), rgba(250,204,21,0.15))', color: '#fde68a', padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px solid rgba(234,179,8,0.3)' }}>27 Subjects</span>
                      <span style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.25), rgba(192,132,252,0.15))', color: '#d8b4fe', padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px solid rgba(168,85,247,0.3)' }}>100% Accuracy</span>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4, delay: 0.35 }}
                      style={{ color: '#94a3b8', fontSize: 14, maxWidth: 520, margin: '0 auto', lineHeight: 1.8 }}
                    >
                      Benchmarking seven face verification providers for SVI's KYC identity verification flow.
                      Results validated on Kaggle dataset at 800px and full resolution.
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4, delay: 0.45 }}
                      style={{ marginTop: 16, fontSize: 12, color: '#64748b' }}
                    >
                      <a href="https://svi-jira.atlassian.net/browse/CPS-221" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', textDecoration: 'underline' }}>Jira: CPS-221</a>
                      {' · '}
                      <a href="https://svi-jira.atlassian.net/wiki/spaces/~71202071852762867849479b4d350bd48b7534/pages/250740911/CPS-221+Spike+Biometric+Face+Matching+UX+vs.+Async+Backend" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', textDecoration: 'underline' }}>Confluence</a>
                      {' · '}
                      <a href="https://vegamatcher.kevinguadalupevega.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', textDecoration: 'underline' }}>Live Demo</a>
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
                      style={{ marginTop: 32, display: 'flex', gap: 12, justifyContent: 'center' }}
                    >
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={next}
                        style={{ padding: '12px 28px', background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}
                      >
                        Start Presentation <motion.span animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>→</motion.span>
                      </motion.button>
                      <button onClick={onClose} style={{ padding: '12px 28px', background: t.sidebarBg, color: t.textSecondary, border: `1px solid ${t.border}`, borderRadius: 10, fontSize: 14, cursor: 'pointer' }}>
                        Back to App
                      </button>
                    </motion.div>
                  </motion.div>
                </div>
              ) : slides[current].id === 'thankyou' ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                >
                  {slides[current].content}
                </motion.div>
              ) : (
                <div>
                  <motion.div
                    initial={{ opacity: 0, y: -15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.05, ease: 'easeOut' }}
                  >
                    <h2 style={{ fontSize: 28, fontWeight: 700, color: '#e2e8f0', marginBottom: 2, letterSpacing: -0.5 }}>{slides[current].title}</h2>
                    {slides[current].subtitle && (
                      <p style={{ fontSize: 16, color: '#64748b', marginBottom: 20, lineHeight: 1.6 }}>{slides[current].subtitle}</p>
                    )}
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.12, ease: 'easeOut' }}
                  >
                    {slides[current].content}
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
            borderTop: '1px solid #1e293b', padding: '8px 24px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: '#0f172a',
          }}
        >
          <motion.button
            whileHover={current > 0 ? { scale: 1.05, borderColor: '#6366f1', color: '#e2e8f0' } : {}}
            whileTap={current > 0 ? { scale: 0.97 } : {}}
            onClick={prev}
            disabled={current === 0}
            style={{
              padding: '8px 20px', borderRadius: 8, border: '1px solid #334155',
              background: '#1e293b',
              color: current === 0 ? '#334155' : '#94a3b8',
              cursor: current === 0 ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all 0.2s',
            }}
          >
            ← Previous
          </motion.button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {slides.map((_, i) => (
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

          <motion.button
            whileHover={current < total - 1 ? { scale: 1.05, borderColor: '#6366f1', color: '#e2e8f0' } : {}}
            whileTap={current < total - 1 ? { scale: 0.97 } : {}}
            onClick={next}
            disabled={current === total - 1}
            style={{
              padding: '8px 20px', borderRadius: 8, border: '1px solid #334155',
              background: '#1e293b',
              color: current === total - 1 ? '#334155' : '#94a3b8',
              cursor: current === total - 1 ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6,
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
