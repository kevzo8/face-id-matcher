import React, { useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';

type DetectionModel = 'fast' | 'accurate';
type FileEntry = { code: string; label: string; name: string; file: File; element: HTMLImageElement | null };
type PairResult = {
  code: string;
  name: string;
  similarity: number;
  distance: number;
  match: boolean;
  error?: string;
  warnings?: string[];
  idUrl?: string;
  selfieUrl?: string;
  override?: boolean | null;
};

const LABEL_PATTERNS = ['id', 'selfie', 'face', 'photo'];

function parseFilename(filename: string): { code: string; label: string; name: string } | null {
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
  const parts = nameWithoutExt.split('_');
  if (parts.length < 2) return null;
  const code = parts[0];
  const labelRaw = parts[1].toLowerCase();
  const label = LABEL_PATTERNS.find((p) => labelRaw.startsWith(p)) || labelRaw;
  const name = parts.slice(2).join('_') || '';
  return { code, label, name };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load: ${file.name}`));
    img.src = URL.createObjectURL(file);
  });
}

function checkOrientation(detection: faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>): string | null {
  const landmarks = detection.landmarks;
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();
  if (!leftEye.length || !rightEye.length) return null;
  const lx = leftEye.reduce((s, p) => s + p.x, 0) / leftEye.length;
  const ly = leftEye.reduce((s, p) => s + p.y, 0) / leftEye.length;
  const rx = rightEye.reduce((s, p) => s + p.x, 0) / rightEye.length;
  const ry = rightEye.reduce((s, p) => s + p.y, 0) / rightEye.length;
  const angle = Math.abs(Math.atan2(ry - ly, rx - lx) * (180 / Math.PI));
  if (angle < 10 || angle > 170) return null;
  if (angle > 30 && angle < 150) return 'Face is tilted';
  return null;
}

type Provider = 'local' | 'rekognition' | 'megamatcher' | 'insightface';

interface BatchMatcherProps {
  detectionModel: DetectionModel;
  provider: Provider;
  serverUrl: string;
  threshold: number;
  onBack: () => void;
}

function toBase64(img: HTMLImageElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  canvas.getContext('2d')!.drawImage(img, 0, 0);
  return canvas.toDataURL('image/jpeg').split(',')[1];
}

export function BatchMatcher({ detectionModel, provider, serverUrl, threshold, onBack }: BatchMatcherProps) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [results, setResults] = useState<PairResult[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [showPhotos, setShowPhotos] = useState(true);
  const [comparePair, setComparePair] = useState<PairResult | null>(null);
  const [orphans, setOrphans] = useState<FileEntry[]>([]);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const parsed: FileEntry[] = [];
    for (const file of Array.from(files)) {
      const parsedName = parseFilename(file.name);
      if (!parsedName) continue;
      parsed.push({ ...parsedName, file, element: null });
    }
    if (parsed.length === 0) {
      alert('No files matched the naming pattern. Use: CODE_LABEL_NAME.jpg (e.g. 1_ID_Kevin, 1_Selfie_Kevin)');
      return;
    }

    // Detect orphans (files without a matching partner)
    const idCodes = new Set(parsed.filter((e) => e.label === 'id').map((e) => e.code));
    const selfieCodes = new Set(parsed.filter((e) => e.label !== 'id').map((e) => e.code));
    setOrphans(parsed.filter((e) =>
      e.label === 'id' ? !selfieCodes.has(e.code) : !idCodes.has(e.code)
    ));

    setEntries(parsed);
    setResults([]);
  }, []);

  const runBatch = useCallback(async () => {
    if (entries.length === 0) return;

    const idEntries = entries.filter((e) => e.label === 'id');
    const selfieEntries = entries.filter((e) => e.label !== 'id');

    if (idEntries.length === 0 || selfieEntries.length === 0) {
      alert('Need at least one ID photo and one selfie/face/photo.');
      return;
    }

    const codeToSelfie = new Map<string, FileEntry[]>();
    for (const s of selfieEntries) {
      const arr = codeToSelfie.get(s.code) || [];
      arr.push(s);
      codeToSelfie.set(s.code, arr);
    }

    const pairs: { code: string; id: FileEntry; selfie: FileEntry }[] = [];
    for (const id of idEntries) {
      const selfies = codeToSelfie.get(id.code) || [];
      for (const selfie of selfies) {
        pairs.push({ code: id.code, id, selfie });
      }
    }

    if (pairs.length === 0) {
      alert('No matching pairs found. Make sure ID and selfie share the same code prefix (e.g. 1_ID and 1_Selfie).');
      return;
    }

    setProcessing(true);
    setResults([]);
    setProgress(0);
    setTotal(pairs.length);

    const batchResults: PairResult[] = [];
    for (let i = 0; i < pairs.length; i++) {
      const { code, id, selfie } = pairs[i];
      const name = id.name || selfie.name || code;

      try {
        if (provider !== 'local') {
          const idEl = id.element || await loadImage(id.file);
          const selfieEl = selfie.element || await loadImage(selfie.file);
          if (!id.element) id.element = idEl;
          if (!selfie.element) selfie.element = selfieEl;

          const res = await fetch(`${serverUrl}/compare`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              source_image: toBase64(idEl),
              target_image: toBase64(selfieEl),
              threshold,
            }),
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || `Server error: ${res.status}`);
          }

          const data = await res.json();
          batchResults.push({
            code,
            name,
            similarity: data.similarity ?? 0,
            distance: data.distance ?? 1,
            match: data.match ?? false,
            warnings: data.warnings ?? undefined,
            idUrl: idEl.src,
            selfieUrl: selfieEl.src,
          });
        } else {
          const idEl = id.element || await loadImage(id.file);
          const selfieEl = selfie.element || await loadImage(selfie.file);

          if (!id.element) id.element = idEl;
          if (!selfie.element) selfie.element = selfieEl;

          const detectorOptions =
            detectionModel === 'fast'
              ? new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.1 })
              : new faceapi.SsdMobilenetv1Options({ minConfidence: 0.1 });

          const idDet = await faceapi
            .detectSingleFace(idEl, detectorOptions)
            .withFaceLandmarks()
            .withFaceDescriptor();

          const selfieDet = await faceapi
            .detectSingleFace(selfieEl, detectorOptions)
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (!idDet || !selfieDet) {
            batchResults.push({
              code, name, similarity: 0, distance: 1, match: false,
              error: !idDet ? 'No face in ID' : 'No face in selfie',
              idUrl: idEl.src,
              selfieUrl: selfieEl.src,
            });
          } else {
            const orientWarnings: string[] = [];
            const idOrient = checkOrientation(idDet);
            const selfieOrient = checkOrientation(selfieDet);
            if (idOrient) orientWarnings.push('ID: ' + idOrient);
            if (selfieOrient) orientWarnings.push('Selfie: ' + selfieOrient);

            const distance = faceapi.euclideanDistance(idDet.descriptor, selfieDet.descriptor);
            const similarity = Math.max(0, Math.min(100, (1 - distance) * 100));
            batchResults.push({
              code, name, similarity, distance, match: distance < threshold,
              error: orientWarnings.length ? orientWarnings.join('; ') : undefined,
              idUrl: idEl.src,
              selfieUrl: selfieEl.src,
            });
          }
        }
      } catch (e) {
        batchResults.push({ code, name, similarity: 0, distance: 1, match: false, error: String(e) });
      }

      setProgress(i + 1);
    }

    setResults(batchResults);
    setProcessing(false);
  }, [entries, detectionModel, threshold, provider, serverUrl]);

  const downloadCSV = () => {
    const headers = ['code', 'name', 'similarity', 'distance', 'match', 'override', 'error'];
    const rows = results.map((r) =>
      headers.map((h) => JSON.stringify((r as any)[h] ?? '')).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'batch_results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Instructions */}
      <div
        style={{
          padding: '8px 12px',
          background: '#1e293b',
          borderRadius: 8,
          marginBottom: 12,
          fontSize: 12,
          color: '#94a3b8',
          lineHeight: 1.6,
        }}
      >
        Name your files: <strong style={{ color: '#e2e8f0' }}>CODE_LABEL_NAME.jpg</strong><br />
        Label can be: <strong style={{ color: '#22c55e' }}>ID</strong> or{' '}
        <strong style={{ color: '#3b82f6' }}>Selfie</strong> / Face / Photo<br />
        Example: <code style={{ background: '#0f172a', padding: '1px 6px', borderRadius: 4 }}>1_ID_Kevin.jpg</code> +
        <code style={{ background: '#0f172a', padding: '1px 6px', borderRadius: 4 }}>1_Selfie_Kevin.jpg</code>
      </div>

      {entries.length === 0 ? (
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
          <span style={{ fontSize: 13, color: '#94a3b8' }}>Drop files here or click to select</span>
          <span style={{ fontSize: 11, color: '#64748b' }}>Select multiple files at once — IDs and selfies</span>
          <input
            type="file"
            multiple
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </label>
      ) : (
        <>
          {/* File list */}
          <div
            style={{
              background: '#1e293b',
              borderRadius: 8,
              padding: 10,
              marginBottom: 10,
              maxHeight: 100,
              overflowY: 'auto',
            }}
          >
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>
              {entries.length} files loaded
            </div>
            {orphans.length > 0 && (
              <div style={{ fontSize: 11, color: '#f59e0b', marginBottom: 6, padding: '4px 8px', background: '#451a03', borderRadius: 4 }}>
                Warning: {orphans.length} file{orphans.length > 1 ? 's' : ''} without matching partner — will be skipped
                {orphans.map((o, i) => (
                  <span key={i} style={{ display: 'block', fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                    {o.code}_{o.label}_{o.name} (missing {o.label === 'id' ? 'selfie' : 'ID'} for code {o.code})
                  </span>
                ))}
              </div>
            )}
            {entries.map((e, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '2px 0',
                  fontSize: 12,
                }}
              >
                <span
                  style={{
                    padding: '1px 6px',
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 600,
                    background: e.label === 'id' ? '#22c55e22' : '#3b82f622',
                    color: e.label === 'id' ? '#22c55e' : '#3b82f6',
                  }}
                >
                  {e.label.toUpperCase()}
                </span>
                <span style={{ color: '#e2e8f0' }}>{e.code}</span>
                <span style={{ color: '#64748b' }}>{e.name || '(no name)'}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 10 }}>
            <button
              onClick={runBatch}
              disabled={processing}
              style={{
                padding: '8px 20px',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                borderRadius: 6,
                cursor: processing ? 'not-allowed' : 'pointer',
                background: processing ? '#334155' : '#a855f7',
                color: '#fff',
              }}
            >
              {processing ? `Processing ${progress}/${total}...` : '\u2696 Match All Pairs'}
            </button>
            <button
              onClick={() => { setEntries([]); setResults([]); setOrphans([]); }}
              style={{
                padding: '8px 16px',
                fontSize: 13,
                border: '1px solid #475569',
                borderRadius: 6,
                cursor: 'pointer',
                background: 'transparent',
                color: '#94a3b8',
              }}
            >
              Clear
            </button>
          </div>

          {/* Progress bar */}
          {processing && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ height: 4, background: '#1e293b', borderRadius: 2, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${(progress / total) * 100}%`,
                    background: '#a855f7',
                    borderRadius: 2,
                    transition: 'width 0.3s',
                  }}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div
          style={{
            background: '#1e293b',
            borderRadius: 8,
            padding: 10,
            marginBottom: 10,
            maxHeight: 600,
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
              Results ({results.filter((r) => r.match).length}/{results.length} matched)
            </span>
            <button
              onClick={downloadCSV}
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
              Download CSV
            </button>
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
          </div>
          <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: '#64748b', textAlign: 'left' }}>
                {showPhotos && <th style={{ padding: '4px 6px' }}>ID Photo</th>}
                {showPhotos && <th style={{ padding: '4px 6px' }}>Selfie</th>}
                <th style={{ padding: '4px 6px' }}>Code</th>
                <th style={{ padding: '4px 6px' }}>Name</th>
                <th style={{ padding: '4px 6px', textAlign: 'right' }}>Similarity</th>
                <th style={{ padding: '4px 6px', textAlign: 'center' }}>Match</th>
                <th style={{ padding: '4px 6px' }}>Error</th>
                <th style={{ padding: '4px 6px', textAlign: 'center' }}>Action</th>
                <th style={{ padding: '4px 6px', textAlign: 'center' }}>Override</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr
                  key={i}
                  style={{
                    borderTop: '1px solid #334155',
                    color: r.error ? '#ef4444' : r.match ? '#22c55e' : '#f59e0b',
                  }}
                >
                  {showPhotos && (
                    <td style={{ padding: '4px 6px' }}>
                      {r.idUrl && <img src={r.idUrl} alt="ID" style={{ height: 100, borderRadius: 4, objectFit: 'cover' }} />}
                    </td>
                  )}
                  {showPhotos && (
                    <td style={{ padding: '4px 6px' }}>
                      {r.selfieUrl && <img src={r.selfieUrl} alt="Selfie" style={{ height: 100, borderRadius: 4, objectFit: 'cover' }} />}
                    </td>
                  )}
                  <td style={{ padding: '4px 6px', color: '#e2e8f0' }}>{r.code}</td>
                  <td style={{ padding: '4px 6px', color: '#94a3b8' }}>{r.name}</td>
                  <td style={{ padding: '4px 6px', textAlign: 'right' }}>{r.similarity.toFixed(1)}%</td>
                  <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                    {r.error ? '-' : r.match ? 'YES' : 'NO'}
                  </td>
                  <td style={{ padding: '4px 6px', color: '#ef4444', fontSize: 11 }}>
                    {r.error || ''}
                    {!r.error && r.warnings && r.warnings.length > 0 && (
                      <span style={{ color: '#f59e0b', cursor: 'default' }} title={r.warnings.join('\n')}>
                        ⚠ {r.warnings.length}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                    {r.idUrl && r.selfieUrl && (
                      <button
                        onClick={() => setComparePair(r)}
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
                  <td style={{ padding: '4px 6px', textAlign: 'center', color: r.override === true ? '#22c55e' : r.override === false ? '#ef4444' : '#475569', fontSize: 11 }}>
                    {r.override === true ? 'YES' : r.override === false ? 'NO' : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Compare modal */}
      {comparePair && (
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
              {comparePair.code} &mdash; {comparePair.name} &middot; Similarity: {comparePair.similarity.toFixed(1)}% &middot; {comparePair.match ? 'MATCH' : 'NO MATCH'}
            </div>
            {comparePair.warnings && comparePair.warnings.length > 0 && (
              <div style={{ marginBottom: 8, fontSize: 10, color: '#f59e0b', background: '#451a03', borderRadius: 6, padding: '6px 10px', lineHeight: 1.5 }}>
                <strong style={{ fontSize: 11 }}>Quality issues:</strong>
                {comparePair.warnings.map((w, i) => (
                  <div key={i} style={{ marginLeft: 4 }}>&bull; {w}</div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ color: '#22c55e', fontSize: 11, marginBottom: 4, fontWeight: 600 }}>ID Photo</div>
                <img src={comparePair.idUrl} alt="ID" style={{ width: '100%', maxHeight: 400, objectFit: 'contain', borderRadius: 8 }} />
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ color: '#3b82f6', fontSize: 11, marginBottom: 4, fontWeight: 600 }}>Selfie</div>
                <img src={comparePair.selfieUrl} alt="Selfie" style={{ width: '100%', maxHeight: 400, objectFit: 'contain', borderRadius: 8 }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
              <span style={{ color: '#94a3b8', fontSize: 12, alignSelf: 'center' }}>Override:</span>
              <button
                onClick={() => {
                  setResults((prev) => prev.map((p) => p === comparePair ? { ...p, override: true } : p));
                  setComparePair(null);
                }}
                style={{
                  padding: '4px 16px',
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: '#22c55e',
                  color: '#fff',
                }}
              >
                MATCH
              </button>
              <button
                onClick={() => {
                  setResults((prev) => prev.map((p) => p === comparePair ? { ...p, override: false } : p));
                  setComparePair(null);
                }}
                style={{
                  padding: '4px 16px',
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: '#ef4444',
                  color: '#fff',
                }}
              >
                NO MATCH
              </button>
              <button
                onClick={() => setComparePair(null)}
                style={{
                  padding: '4px 16px',
                  fontSize: 12,
                  border: '1px solid #475569',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: 'transparent',
                  color: '#94a3b8',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <button
          onClick={onBack}
          style={{
            padding: '6px 16px',
            fontSize: 12,
            border: '1px solid #475569',
            borderRadius: 6,
            cursor: 'pointer',
            background: 'transparent',
            color: '#94a3b8',
          }}
        >
          &larr; Back to Single Compare
        </button>
      </div>
    </div>
  );
}
