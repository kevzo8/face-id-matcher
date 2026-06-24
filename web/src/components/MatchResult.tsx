import React from 'react';

interface MatchResultProps {
  result: {
    distance: number;
    similarity: number;
    match: boolean;
    threshold: number;
  };
}

export function MatchResult({ result }: MatchResultProps) {
  const { distance, similarity, match, threshold } = result;
  const matchColor = match ? '#22c55e' : '#ef4444';
  const bgColor = match ? '#052e16' : '#450a0a';

  const barColor = match
    ? similarity >= 80 ? '#22c55e' : similarity >= 55 ? '#eab308' : '#f59e0b'
    : '#ef4444';

  const icon = match ? (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );

  return (
    <div
      style={{
        background: bgColor,
        borderRadius: 8,
        padding: 12,
        border: `2px solid ${matchColor}`,
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ color: matchColor, display: 'flex' }}>{icon}</span>
        <span style={{ fontSize: 18, fontWeight: 700, color: matchColor }}>
          {match ? 'IDENTITY VERIFIED' : 'NO MATCH'}
        </span>
        <span style={{
          color: matchColor, fontSize: 11, fontWeight: 600,
          padding: '2px 8px', borderRadius: 10, background: `${matchColor}22`,
        }}>
          {match ? 'Auto-Approve' : 'Manual Review'}
        </span>
      </div>

      {/* Bar */}
      <div style={{ maxWidth: 340, margin: '0 auto 8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2, fontSize: 11, color: '#94a3b8' }}>
          <span>Similarity ({((1 - threshold) * 100).toFixed(0)}% = match threshold)</span>
          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{similarity.toFixed(1)}%</span>
        </div>
        <div style={{ height: 8, background: '#1e293b', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${similarity}%`, background: barColor, borderRadius: 4, transition: 'width 0.5s ease' }} />
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: 11, color: '#64748b' }}>
        <span>Euclidean distance: <strong style={{ color: '#e2e8f0' }}>{distance.toFixed(4)}</strong></span>
        <span>Match if distance &lt; <strong style={{ color: '#e2e8f0' }}>{threshold.toFixed(2)}</strong></span>
      </div>
    </div>
  );
}
