import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { authedRequest } from '../lib/api';
import { useChildren } from '../lib/useChildren';

function PredictionImage({ id }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let active = true;
    let objectUrl;
    authedRequest(`/api/bone-age/${id}/image`, { responseType: 'blob' }).then((blob) => {
      if (active) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); }
    }).catch(() => {});
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [id]);
  return url ? <img src={url} alt="Uploaded hand X-ray" className="h-16 w-16 rounded-lg object-contain" /> : null;
}

export default function BoneAgePage() {
  const inputRef = useRef(null);
  const { children, activeChildId: childId, setActiveChildId, loading, error: profileError } = useChildren();
  const [history, setHistory] = useState([]);
  const [model, setModel] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [modelLoading, setModelLoading] = useState(true);

  useEffect(() => {
    let active = true;
    authedRequest('/api/bone-age/model')
      .then((status) => { if (active) setModel(status); })
      .catch((e) => { if (active) setError(e.message); })
      .finally(() => { if (active) setModelLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!childId) return;
    let active = true;
    let timer;
    async function load() {
      try {
        const rows = await authedRequest(`/api/bone-age?childId=${encodeURIComponent(childId)}`);
        if (!active) return;
        setHistory(rows);
        if (rows.some((row) => row.status === 'PENDING')) timer = setTimeout(load, 2000);
      } catch (e) { if (active) setError(e.message); }
    }
    load();
    return () => { active = false; clearTimeout(timer); };
  }, [childId, uploading]);

  async function handleFile(file) {
    if (!file || uploading) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) { setError('Use a JPEG or PNG image.'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('Maximum image size is 10 MB.'); return; }
    const selected = childId;
    if (!selected) { setError('Create or select a child profile first.'); return; }
    setError(''); setUploading(true);
    const form = new FormData(); form.append('file', file); form.append('childId', selected);
    try {
      const row = await authedRequest('/api/bone-age', { method: 'POST', body: form });
      setHistory((rows) => [row, ...rows]);
    } catch (e) { setError(e.message); }
    finally { setUploading(false); if (inputRef.current) inputRef.current.value = ''; }
  }

  async function deletePrediction(id) {
    if (!window.confirm('Delete this X-ray and its prediction?')) return;
    try {
      await authedRequest(`/api/bone-age/${id}`, { method: 'DELETE' });
      setHistory((rows) => rows.filter((row) => row.id !== id));
    } catch (e) { setError(e.message); }
  }

  const busy = uploading || history.some((row) => row.status === 'PENDING');
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 dark:bg-slate-950">
      <div className="mx-auto max-w-2xl space-y-5 text-slate-900 dark:text-slate-100">
        <h1 className="text-2xl font-bold text-teal-800 dark:text-teal-300">AI Bone Age Analysis</h1>
        <p className="text-sm">Upload an existing hand or wrist X-ray. This is a screening aid, not a clinical diagnosis. Consult a paediatrician or paediatric endocrinologist for assessment.</p>
        {(error || profileError) && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800 dark:bg-red-950 dark:text-red-200">{error || profileError}</p>}
        {(loading || modelLoading) ? <p role="status">Loading profiles and model statusโ€ฆ</p> : (
          <>
            <label className="block font-medium" htmlFor="bone-age-child">Child profile</label>
            <select id="bone-age-child" value={childId} disabled={uploading} onChange={(e) => {
              setActiveChildId(e.target.value); setHistory([]); setError('');
            }} className="w-full rounded-xl border border-slate-300 bg-white p-3 dark:bg-slate-900">
              {!children.length && <option value="">No child profiles</option>}
              {children.map((child) => <option key={child.id} value={child.id}>{child.name} ({child.sex})</option>)}
            </select>
            <Link className="inline-block text-teal-700 underline dark:text-teal-300" to="/children/new">Add a child profile</Link>
            {model?.ready ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Validation average absolute error: {model.maeMonths.toFixed(2)} months on {model.validationSamples.toLocaleString()} images.
                {' '}This average is not a confidence interval for an individual prediction.
              </p>
            ) : <p role="status">Bone age analysis is unavailable. Please try again later.</p>}
            <div className="rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center"
              onDragOver={(e) => e.preventDefault()} onDrop={(e) => {
                e.preventDefault(); if (model?.ready && childId && !busy) handleFile(e.dataTransfer.files?.[0]);
              }}>
              <p className="mb-3 text-sm">JPEG or PNG, maximum 10 MB and 16 megapixels. Use an 8-bit grayscale or RGB export.</p>
              <label htmlFor="bone-age-file" className="block text-sm font-medium">Select a hand X-ray</label>
              <input id="bone-age-file" ref={inputRef} type="file" accept="image/jpeg,image/png"
                disabled={!model?.ready || !childId || busy} onChange={(e) => handleFile(e.target.files?.[0])}
                className="mt-3 w-full min-w-0 text-sm" />
              {busy && <p role="status" className="mt-3">{uploading ? 'Uploadingโ€ฆ' : 'Analysingโ€ฆ'}</p>}
            </div>
          </>
        )}
        <section aria-label="Prediction history" className="rounded-2xl bg-white p-5 dark:bg-slate-900">
          <h2 className="mb-4 text-lg font-semibold">History</h2>
          {!history.length && <p className="text-sm">No uploads for this child yet.</p>}
          {history.map((row) => (
            <article key={row.id} className="flex flex-wrap items-center gap-3 border-b border-slate-200 py-4 dark:border-slate-700">
              <PredictionImage id={row.id} />
              <div className="min-w-0 flex-1 basis-40">
                <p className="text-xs">{new Date(row.createdAt).toLocaleString()}</p>
                {row.status === 'COMPLETED' ? <p className="font-semibold">Estimated bone age: {row.predictedAgeMonths.toFixed(1)} months</p>
                  : <p role="status">{row.status === 'PENDING' ? 'Analysingโ€ฆ' : row.failureReason}</p>}
                {row.status === 'COMPLETED' && <p className="text-xs">Validation average error: {row.maeMonths.toFixed(2)} months.</p>}
              </div>
              <button type="button" onClick={() => deletePrediction(row.id)} className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-600 dark:text-red-300">Delete</button>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
