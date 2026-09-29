import { authedRequest } from '../lib/api';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

function FloatingLabelField({ label, required, children }) {
  return (
    <div className="relative">
      <label className="absolute -top-2 left-3 bg-white dark:bg-slate-900 px-1 text-xs text-slate-500 dark:text-slate-400">
        {label}
        {required && ' *'}
      </label>
      {children}
    </div>
  );
}

const fieldClasses =
  'w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-[#056559] dark:focus:border-teal-400';

function ChildFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [sex, setSex] = useState('FEMALE'); // 'FEMALE' | 'MALE'
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    let active = true;
    authedRequest(`/api/children/${id}`).then((row) => {
      if (!active) return;
      setFullName(row.name); setDateOfBirth(row.date_of_birth); setSex(row.sex.toUpperCase());
    }).catch((reason) => { if (active) setError(reason.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving || loading) return;
    setSaving(true); setError('');
    try {
      await authedRequest(isEdit ? `/api/children/${id}` : '/api/children', {
        method: isEdit ? 'PATCH' : 'POST',
        body: { name: fullName, sex: sex.toLowerCase(), date_of_birth: dateOfBirth },
      });
      navigate('/dashboard');
    } catch (reason) { setError(reason.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="min-h-screen px-4 pb-16 pt-10 dark:bg-slate-950">
    <div className="mx-auto w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-8 shadow-2xs border border-slate-200 dark:border-slate-700">
      <h1 className="text-xl font-bold text-[#056559] dark:text-teal-300">{isEdit ? 'Edit child' : 'Add your child'}</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500 dark:text-slate-400">
        We&apos;ll use this to personalize growth tracking and charts.
      </p>

      {loading && <p role="status">Loading child…</p>}
      {error && <p role="alert">{error}</p>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <FloatingLabelField label="Full name" required>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={fieldClasses}
          />
        </FloatingLabelField>

        <FloatingLabelField label="Date of birth" required>
          <input
            type="date"
            required
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            className={fieldClasses}
          />
        </FloatingLabelField>

        <div className="grid grid-cols-2 overflow-hidden rounded-xl border-2 border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setSex('FEMALE')}
            className={`py-2.5 text-sm font-semibold transition ${
              sex === 'FEMALE' ? 'bg-[#eaf6f3] dark:bg-teal-500/10 text-[#056559] dark:text-teal-300' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Girl
          </button>
          <button
            type="button"
            onClick={() => setSex('MALE')}
            className={`border-l-2 border-slate-200 dark:border-slate-700 py-2.5 text-sm font-semibold transition ${
              sex === 'MALE' ? 'bg-[#eaf6f3] dark:bg-teal-500/10 text-[#056559] dark:text-teal-300' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Boy
          </button>
        </div>

        <button
          type="submit"
          disabled={saving || loading}
          className="mt-1 rounded-xl bg-[#056559] dark:bg-teal-400 py-3 text-sm font-semibold text-white dark:text-slate-950 transition hover:bg-[#03443c] dark:hover:bg-teal-300 disabled:opacity-60"
        >
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save and continue'}
        </button>
      </form>
    </div>
    </div>
  );
}

export default ChildFormPage;