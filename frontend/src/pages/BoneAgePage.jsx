import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeftRight,
  Pencil,
  Baby,
  UploadCloud,
  Trash2,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';

// Mock child shape used across pages — no ChildContext yet.
const child = {
  id: 'c1',
  name: 'growth',
  gender: 'Girl',
  ageLabel: '18 Years, 4 Months',
  bornLabel: 'Born May 5, 2008',
};

// Demo-only — real calibration/accuracy numbers come from the backend
// once bone-age analysis is actually wired up.
const model = {
  calibration: 'provisional', // 'provisional' | 'confirmed'
  ready: true,
};

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// ============================================================
// Small confirm dialog for deleting an upload
// ============================================================

function ConfirmDeleteDialog({ onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Delete upload?</h3>
        <p className="mt-1 mb-5 text-sm text-slate-500 dark:text-slate-400">
          This removes the X-ray and its analysis from the child&apos;s history.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 transition hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Bone Age Page
// ============================================================

function BoneAgePage() {
  const inputRef = useRef(null);
  const [history, setHistory] = useState([]);
  const [uploadError, setUploadError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  function handleFile(file) {
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setUploadError('Use a JPEG or PNG image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('That image is larger than 10MB. Try a smaller export.');
      return;
    }

    setUploadError(null);
    const id = `${Date.now()}`;
    const previewUrl = URL.createObjectURL(file);

    // Frontend-only for now — this just records the upload as "Analysing…"
    // and leaves it there. Wire up the real upload + result once the
    // backend endpoint exists; no result is computed here.
    setHistory((prev) => [{ id, createdAt: new Date().toISOString(), status: 'PENDING', previewUrl }, ...prev]);
    setNotice('Image uploaded. It will appear in History below once analysis is available.');
  }

  function handleDelete(id) {
    setHistory((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
    setPendingDeleteId(null);
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 py-8">
      <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 lg:px-8">

        {/* ====================================================
            Child Profile
        ==================================================== */}

        <div className="relative mb-6 rounded-2xl bg-white dark:bg-slate-800 p-6 border border-slate-200 dark:border-slate-700 shadow-2xs sm:p-8">
          <Link
            to="/dashboard"
            aria-label="Switch child"
            className="absolute right-6 top-6 text-slate-400 transition hover:text-[#056559] dark:hover:text-teal-300"
          >
            <ArrowLeftRight size={20} />
          </Link>

          <Link
            to={`/children/${child.id}/edit`}
            state={{ child }}
            aria-label="Edit child profile"
            className="absolute right-7 top-16 flex h-7 w-7 items-center justify-center rounded-full bg-[#056559] dark:bg-teal-400 text-white dark:text-slate-950 shadow-sm transition hover:bg-[#03443c] dark:hover:bg-teal-300"
          >
            <Pencil size={13} />
          </Link>

          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#a7ebd9] dark:bg-teal-500/50">
              <Baby size={34} strokeWidth={1.5} className="text-[#056559] dark:text-teal-300" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{child.name}</h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full border border-[#bcece0] dark:border-teal-500/30 px-2 py-0.5 text-xs font-medium text-[#056559] dark:text-teal-300">
                  {child.gender}
                </span>
                <span className="rounded-full border border-[#bcece0] dark:border-teal-500/30 px-2 py-0.5 text-xs font-medium text-[#056559] dark:text-teal-300">
                  {child.ageLabel}
                </span>
                <span className="rounded-full border border-[#bcece0] dark:border-teal-500/30 px-2 py-0.5 text-xs font-medium text-[#056559] dark:text-teal-300">
                  {child.bornLabel}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ====================================================
            Intro
        ==================================================== */}

        <div className="mb-6">
          <h1 className="text-xl font-bold text-[#056559] dark:text-teal-300">AI Bone Age Analysis</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            For parents who <span className="font-medium text-slate-900 dark:text-slate-100">already have a hand X-ray</span> and
            are waiting to find out what it means.
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            This does not replace the hospital visit. Taking the X-ray was never the hard part — the wait is
            usually for someone qualified to read it, and many clinics do not have a paediatric radiologist
            available. This gives you a provisional reading in the meantime, to bring to the appointment.
          </p>
        </div>

        {/* ====================================================
            Alerts
        ==================================================== */}

        {model.calibration === 'provisional' && (
          <div className="mb-4 flex gap-3 rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <span className="font-semibold">Demo calibration.</span> The conversion from the model&apos;s
              raw output to months has not been confirmed by the team that trained it, so the ages below are
              indicative only and must not be relied on.
            </p>
          </div>
        )}

        {!model.ready && (
          <div className="mb-4 flex gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 p-4">
            <Info size={18} className="mt-0.5 shrink-0 text-slate-500 dark:text-slate-400" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Bone age analysis is unavailable right now. Your image is still saved.
            </p>
          </div>
        )}

        {uploadError && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-4">
            <p className="text-sm text-red-700 dark:text-red-300">{uploadError}</p>
            <button type="button" onClick={() => setUploadError(null)} aria-label="Dismiss">
              <X size={16} className="text-red-500" />
            </button>
          </div>
        )}

        {notice && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 p-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">{notice}</p>
            <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss">
              <X size={16} className="text-slate-400" />
            </button>
          </div>
        )}

        {/* ====================================================
            Upload dropzone
        ==================================================== */}

        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          className={`mb-4 flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed bg-white dark:bg-slate-800 p-8 text-center transition ${
            dragActive ? 'border-[#056559] dark:border-teal-400 bg-[#f2fbf9] dark:bg-teal-500/10' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500'
          }`}
        >
          <UploadCloud size={28} className="mb-2 text-slate-400" />
          <p className="font-semibold text-slate-900 dark:text-slate-100">Drag and drop X-ray image here</p>
          <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">Supports JPEG or PNG, max 10MB</p>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
            className="rounded-full bg-[#056559] dark:bg-teal-400 px-5 py-2.5 text-sm font-semibold text-white dark:text-slate-950 transition hover:bg-[#03443c] dark:hover:bg-teal-300"
          >
            Browse Files
          </button>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>

        <p className="mb-6 text-xs text-slate-500 dark:text-slate-400">
          An investigational tool, not a diagnosis. Only a paediatric endocrinologist can say what a bone age
          means for your child.
        </p>

        {/* ====================================================
            History
        ==================================================== */}

        <div className="rounded-2xl bg-white dark:bg-slate-800 p-5 border border-slate-200 dark:border-slate-700 shadow-2xs">
          <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">History</h2>

          <div className="flex flex-col gap-3">
            {history.map((p) => (
              <div key={p.id} className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3 text-sm last:border-0 last:pb-0">
                <img
                  src={p.previewUrl}
                  alt="X-ray upload"
                  className="h-12 w-12 shrink-0 rounded-lg bg-slate-100 dark:bg-slate-800 object-cover"
                />

                <div className="flex-1">
                  <p className="text-slate-500 dark:text-slate-400">{formatDate(p.createdAt)}</p>
                  <p className="font-medium text-slate-500 dark:text-slate-400">Analysing…</p>
                </div>

                <button
                  type="button"
                  aria-label="Delete upload"
                  onClick={() => setPendingDeleteId(p.id)}
                  className="text-slate-400 transition hover:text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            {history.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No uploads yet.</p>}
          </div>
        </div>

      </div>

      {pendingDeleteId && (
        <ConfirmDeleteDialog
          onCancel={() => setPendingDeleteId(null)}
          onConfirm={() => handleDelete(pendingDeleteId)}
        />
      )}
    </div>
  );
}

export default BoneAgePage;