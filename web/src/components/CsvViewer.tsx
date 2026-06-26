import React, { useState, useCallback } from 'react';

type CsvRow = Record<string, string>;

function fileNameFromPath(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || path;
}

export function CsvViewer() {
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [showPhotos, setShowPhotos] = useState(true);
  const [comparePair, setComparePair] = useState<CsvRow | null>(null);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());

  const hasCol = (name: string) => headers.some((h) => h.toLowerCase() === name.toLowerCase());
  const col = (name: string) => headers.find((h) => h.toLowerCase() === name.toLowerCase()) || '';

  const idPathCol = col('id_image_path') || col('id_path') || col('id_url') || col('idurl');
  const selfiePathCol = col('selfie_image_path') || col('selfie_path') || col('selfie_url') || col('selfieurl') || col('photo_path');
  const decisionCol = col('decision') || col('match');
  const similarityCol = col('similarity');
  const distanceCol = col('distance');
  const nameCol = col('name');
  const idNameCol = col('id_name') || col('idname');
  const selfieNameCol = col('selfie_name') || col('selfiename');
  const codeCol = col('applicant_id') || col('code') || col('pair_id') || col('id');
  const errorCol = col('error');

  const total = rows.length;
  const autoApproved = decisionCol ? rows.filter((r) => r[decisionCol]?.toLowerCase() === 'auto_approve' || r[decisionCol]?.toLowerCase() === 'true' || r[decisionCol]?.toLowerCase() === 'yes').length : 0;
  const manualReview = decisionCol ? rows.filter((r) => r[decisionCol]?.toLowerCase() === 'manual_review' || r[decisionCol]?.toLowerCase() === 'false' || r[decisionCol]?.toLowerCase() === 'no').length : 0;
  const errors = rows.filter((r) => r[errorCol] && r[errorCol] !== '').length;
  const hasPhotos = hasCol('id_image_path') || hasCol('selfie_image_path') || hasCol('id_path') || hasCol('selfie_path') || hasCol('id_url') || hasCol('selfie_url');
  const hasLocalPaths = hasPhotos && rows.length > 0 && (rows[0][idPathCol]?.startsWith('/') || rows[0][idPathCol]?.match(/^[A-Za-z]:\\/));
  const normalisePath = (path: string) => path.replace(/\\/g, '/');

  const getDecision = (row: CsvRow): 'pass' | 'fail' | 'error' | null => {
    if (errorCol && row[errorCol]) return 'error';
    if (decisionCol) {
      const d = row[decisionCol].toLowerCase();
      if (d === 'auto_approve' || d === 'true' || d === 'yes') return 'pass';
      if (d === 'manual_review' || d === 'false' || d === 'no') return 'fail';
    }
    if (similarityCol && distanceCol) {
      const dist = parseFloat(row[distanceCol]);
      if (!isNaN(dist)) return dist <= 1 && dist > 0 ? 'pass' : 'fail';
    }
    return null;
  };

  const getSimilarity = (row: CsvRow): number | null => {
    if (similarityCol) {
      const v = parseFloat(row[similarityCol]);
      if (!isNaN(v)) return v;
    }
    return null;
  };

  const getCode = (row: CsvRow): string => codeCol ? row[codeCol] : '';
  const getName = (row: CsvRow): string => nameCol ? row[nameCol] : '';

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter((l) => l.trim());
      if (lines.length < 2) {
        alert('CSV must have at least a header row and one data row.');
        return;
      }

      const delim = lines[0].includes('\t') ? '\t' : ',';
      const hdrs = lines[0].split(delim).map((h) => h.trim().replace(/^"|"$/g, ''));
      const parsed: CsvRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(delim).map((v) => v.trim().replace(/^"|"$/g, ''));
        if (vals.length < hdrs.length) continue;
        const row: CsvRow = {};
        hdrs.forEach((h, j) => { row[h] = vals[j] || ''; });
        parsed.push(row);
      }

      setBrokenImages(new Set());
      setHeaders(hdrs);
      setRows(parsed);
    };
    reader.readAsText(file);
  }, []);

  const decisionColor = (row: CsvRow) => {
    const d = getDecision(row);
    if (d === 'error') return '#ef4444';
    if (d === 'pass') return '#22c55e';
    if (d === 'fail') return '#f59e0b';
    return '#e2e8f0';
  };

  const decisionText = (row: CsvRow) => {
    const d = getDecision(row);
    if (d === 'error') return 'ERROR';
    if (d === 'pass') return 'YES';
    if (d === 'fail') return 'NO';
    return '-';
  };

  const markBroken = (path: string) => setBrokenImages((prev) => new Set(prev).add(path));
  const isBroken = (path: string) => brokenImages.has(path);

  const ImgCell = ({ path, label, name }: { path: string; label: string; name?: string }) => {
    if (!path) return <td style={{ padding: '4px 6px', color: '#475569', fontSize: 10 }}>no path</td>;
    const url = normalisePath(path);
    if (isBroken(path)) {
      return (
        <td style={{ padding: '4px 6px' }}>
          <span style={{ color: '#64748b', fontSize: 10, wordBreak: 'break-all' }}>{fileNameFromPath(path)}</span>
        </td>
      );
    }
    return (
      <td style={{ padding: '4px 6px', textAlign: 'center' }}>
        <img
          src={url}
          alt={label}
          style={{ height: 100, borderRadius: 4, objectFit: 'cover', maxWidth: 80 }}
          onError={() => markBroken(path)}
        />
        {name && <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>{name}</div>}
      </td>
    );
  };

  return (
    <div>
      {hasLocalPaths && (
        <div style={{ background: '#451a03', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 11, color: '#f59e0b', lineHeight: 1.5 }}>
          <strong>Note:</strong> The CSV contains local file paths (e.g. <code style={{ background: '#0f172a', padding: '1px 4px', borderRadius: 2 }}>C:\...</code> or <code style={{ background: '#0f172a', padding: '1px 4px', borderRadius: 2 }}>/home/...</code>).
          Browsers cannot load local files for security. Image paths are shown as filenames.
        </div>
      )}

      {/* Upload area */}
      {rows.length === 0 ? (
        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            padding: 40,
            border: '2px dashed #475569',
            borderRadius: 8,
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: 14, color: '#94a3b8' }}>Upload a CSV file to view</span>
          <span style={{ fontSize: 11, color: '#64748b' }}>
            Supports results CSV (applicant_id, name, similarity, decision, ...)
            {'\nor'} pairs CSV with image paths (id_image_path, selfie_image_path, ...)
          </span>
          <input
            type="file"
            accept=".csv,.tsv"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </label>
      ) : (
        <>
          {/* Summary bar */}
          <div style={{ background: '#1e293b', borderRadius: 8, padding: 10, marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{total} records</span>
              {decisionCol && (
                <>
                  <span style={{ fontSize: 12, color: '#22c55e' }}>{autoApproved} passed</span>
                  <span style={{ fontSize: 12, color: '#f59e0b' }}>{manualReview} failed</span>
                </>
              )}
              {errors > 0 && <span style={{ fontSize: 12, color: '#ef4444' }}>{errors} errors</span>}
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginBottom: 8 }}>
            {hasPhotos && (
              <button
                onClick={() => setShowPhotos(!showPhotos)}
                style={{
                  padding: '4px 12px',
                  fontSize: 11,
                  border: '1px solid #475569',
                  borderRadius: 4,
                  cursor: 'pointer',
                  background: showPhotos ? '#334155' : 'transparent',
                  color: showPhotos ? '#e2e8f0' : '#94a3b8',
                }}
              >
                {showPhotos ? 'Hide Photos' : 'Show Photos'}
              </button>
            )}
            <button
              onClick={() => setRows([])}
              style={{
                padding: '4px 12px',
                fontSize: 11,
                border: '1px solid #475569',
                borderRadius: 4,
                cursor: 'pointer',
                background: 'transparent',
                color: '#94a3b8',
              }}
            >
              Clear
            </button>
          </div>

          {/* Table */}
          <div style={{ background: '#1e293b', borderRadius: 8, padding: 10, maxHeight: 600, overflowY: 'auto' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#64748b', textAlign: 'left' }}>
                    {hasPhotos && showPhotos && idPathCol && <th style={{ padding: '4px 6px' }}>ID Photo</th>}
                    {hasPhotos && showPhotos && selfiePathCol && <th style={{ padding: '4px 6px' }}>Selfie</th>}
                    {codeCol && <th style={{ padding: '4px 6px' }}>Code</th>}
                    {similarityCol && <th style={{ padding: '4px 6px', textAlign: 'right' }}>Similarity</th>}
                    {distanceCol && <th style={{ padding: '4px 6px', textAlign: 'right' }}>Distance</th>}
                    {decisionCol && <th style={{ padding: '4px 6px', textAlign: 'center' }}>Match</th>}
                    {errorCol && <th style={{ padding: '4px 6px' }}>Error</th>}
                    {hasPhotos && idPathCol && selfiePathCol && <th style={{ padding: '4px 6px', textAlign: 'center' }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #334155', color: decisionColor(row) }}>
                      {hasPhotos && showPhotos && idPathCol && <ImgCell path={row[idPathCol]} label="ID" name={idNameCol ? row[idNameCol] : undefined} />}
                      {hasPhotos && showPhotos && selfiePathCol && <ImgCell path={row[selfiePathCol]} label="Selfie" name={selfieNameCol ? row[selfieNameCol] : undefined} />}
                      {codeCol && <td style={{ padding: '4px 6px', color: '#e2e8f0' }}>{getCode(row)}</td>}
                      {similarityCol && <td style={{ padding: '4px 6px', textAlign: 'right' }}>{getSimilarity(row)?.toFixed(1)}%</td>}
                      {distanceCol && <td style={{ padding: '4px 6px', textAlign: 'right' }}>{parseFloat(row[distanceCol]).toFixed(4)}</td>}
                      {decisionCol && <td style={{ padding: '4px 6px', textAlign: 'center' }}>{decisionText(row)}</td>}
                      {errorCol && <td style={{ padding: '4px 6px', color: '#ef4444', fontSize: 11 }}>{row[errorCol]}</td>}
                      {hasPhotos && idPathCol && selfiePathCol && (
                        <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                          {row[idPathCol] && row[selfiePathCol] && (
                            <button
                              onClick={() => setComparePair(row)}
                              style={{
                                padding: '3px 10px',
                                fontSize: 10,
                                border: '1px solid #3b82f6',
                                borderRadius: 4,
                                cursor: 'pointer',
                                background: 'transparent',
                                color: '#3b82f6',
                              }}
                            >
                              Compare
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Compare modal */}
      {comparePair && idPathCol && selfiePathCol && (
        <div
          onClick={() => setComparePair(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            cursor: 'pointer',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0f172a',
              borderRadius: 12,
              padding: 20,
              maxWidth: 800,
              width: '90%',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: 12, color: '#94a3b8', fontSize: 13 }}>
              {getCode(comparePair)} &mdash; {getName(comparePair)}
              {similarityCol && <> &middot; Similarity: {getSimilarity(comparePair)?.toFixed(1)}%</>}
              {decisionCol && <> &middot; {decisionText(comparePair)}</>}
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              {[
                { label: 'ID Photo', color: '#22c55e', path: comparePair[idPathCol], name: idNameCol ? comparePair[idNameCol] : '' },
                { label: 'Selfie', color: '#3b82f6', path: comparePair[selfiePathCol], name: selfieNameCol ? comparePair[selfieNameCol] : '' },
              ].map((side) => (
                <div key={side.label} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ color: side.color, fontSize: 11, marginBottom: 4, fontWeight: 600 }}>{side.label}</div>
                  {side.name && <div style={{ color: '#94a3b8', fontSize: 10, marginBottom: 4 }}>{side.name}</div>}
                  {isBroken(side.path) ? (
                    <div style={{ padding: 40, color: '#64748b', fontSize: 11, wordBreak: 'break-all', background: '#1e293b', borderRadius: 8 }}>
                      {fileNameFromPath(side.path)}
                    </div>
                  ) : (
                    <img
                      src={normalisePath(side.path)}
                      alt={side.label}
                      style={{ width: '100%', maxHeight: 400, objectFit: 'contain', borderRadius: 8 }}
                      onError={() => markBroken(side.path)}
                    />
                  )}
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <button
                onClick={() => setComparePair(null)}
                style={{
                  padding: '6px 20px',
                  fontSize: 12,
                  border: '1px solid #475569',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: 'transparent',
                  color: '#94a3b8',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
