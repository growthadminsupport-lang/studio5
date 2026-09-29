import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User } from 'lucide-react';
import { useChildren } from '../context/ChildrenContext';

// Placeholder avatar choices — swap `bg` for real illustrated presets
// once art is ready (mirrors CHILD_AVATAR_PRESETS in the reference).
// Not saved yet: the API's Child has no avatar field (docs/api.md).
const AVATAR_PRESETS = [
  { id: 'a1', bg: '#f7d9c4' },
  { id: 'a2', bg: '#dcefe9' },
  { id: 'a3', bg: '#e6dcf5' },
  { id: 'a4', bg: '#fcdce0' },
  { id: 'a5', bg: '#d7e8fc' },
];

function todayIso() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function FloatingLabelField({ label, required, children }) {
  return (
    <div className="relative">
      <label className="absolute -top-2 left-3 bg-white dark:bg-slate-800 px-1 text-xs text-slate-500 dark:text-slate-400">
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
  const { getChild, addChild, updateChild } = useChildren();
  const isEdit = Boolean(id);

  // Looked up by the id in the URL, so refreshing /children/:id/edit
  // still prefills the form.
  const existingChild = isEdit ? getChild(id) : null;

  const [avatarId, setAvatarId] = useState(AVATAR_PRESETS[0].id);
  const [fullName, setFullName] = useState(existingChild?.fullName ?? '');
  const [nickname, setNickname] = useState(existingChild?.nickname ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(existingChild?.dateOfBirth ?? '');
  const [sex, setSex] = useState(existingChild?.sex ?? 'FEMALE'); // 'FEMALE' | 'MALE'
  const [relation, setRelation] = useState(existingChild?.relation ?? 'PARENT');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Back to the page the form was opened from (Growth, Puberty, …);
  // falls back to the dashboard when the form was opened directly.
  function goBack() {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate('/dashboard', { replace: true });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const name = fullName.trim();
    if (!name) {
      setError('Please enter your child’s full name.');
      return;
    }
    if (!dateOfBirth || dateOfBirth > todayIso()) {
      setError('Please enter a date of birth that isn’t in the future.');
      return;
    }

    // Same body as POST /children and PATCH /children/:id in docs/api.md
    const body = {
      fullName: name,
      nickname: nickname.trim() || null,
      sex,
      dateOfBirth,
      relation,
    };

    setSaving(true);
    try {
      if (isEdit) await updateChild(id, body);
      else await addChild(body);
      goBack();
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Couldn’t save. Please try again.');
      setSaving(false);
    }
  }

  if (isEdit && !existingChild) {
    return (
      <div className="min-h-screen px-4 pb-16 pt-10 dark:bg-slate-900">
        <div className="mx-auto w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 p-8 text-center shadow-2xs border border-slate-200 dark:border-slate-700">
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Child not found</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            This profile doesn&apos;t exist or was removed.
          </p>
          <button
            type="button"
            onClick={() => navigate('/dashboard', { replace: true })}
            className="mt-5 rounded-full bg-[#056559] dark:bg-teal-400 px-5 py-2.5 text-sm font-semibold text-white dark:text-slate-950 transition hover:bg-[#03443c] dark:hover:bg-teal-300"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pb-16 pt-10 dark:bg-slate-900">
    <div className="mx-auto w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-2xs border border-slate-200 dark:border-slate-700 sm:p-8">
      <h1 className="text-xl font-bold text-[#056559] dark:text-teal-300">{isEdit ? 'Edit child' : 'Add your child'}</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500 dark:text-slate-400">
        We&apos;ll use this to personalize growth tracking and charts.
      </p>

      {error && (
        <p role="alert" className="mb-5 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <div>
          <p className="mb-1 text-sm font-medium text-slate-900 dark:text-slate-100">Choose an avatar</p>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
            For your child&apos;s privacy, profiles use a picked character instead of a real photo.
          </p>

          <div className="grid grid-cols-5 gap-2">
            {AVATAR_PRESETS.map((preset) => {
              const active = avatarId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setAvatarId(preset.id)}
                  aria-label={preset.id}
                  aria-pressed={active}
                  className={`flex aspect-square items-center justify-center rounded-full transition ${
                    active ? 'ring-2 ring-[#056559] dark:ring-teal-400 ring-offset-2 dark:ring-offset-slate-900' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: preset.bg }}
                >
                  <User size={20} className="text-slate-600" strokeWidth={1.5} />
                </button>
              );
            })}
          </div>
        </div>

        <FloatingLabelField label="Full name" required>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={fieldClasses}
          />
        </FloatingLabelField>

        <FloatingLabelField label="Nickname (optional)">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className={fieldClasses}
          />
        </FloatingLabelField>

        <FloatingLabelField label="Date of birth" required>
          <input
            type="date"
            required
            max={todayIso()}
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
              sex === 'FEMALE' ? 'bg-[#eaf6f3] dark:bg-teal-500/10 text-[#056559] dark:text-teal-300' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Girl
          </button>
          <button
            type="button"
            onClick={() => setSex('MALE')}
            className={`border-l-2 border-slate-200 dark:border-slate-700 py-2.5 text-sm font-semibold transition ${
              sex === 'MALE' ? 'bg-[#eaf6f3] dark:bg-teal-500/10 text-[#056559] dark:text-teal-300' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Boy
          </button>
        </div>

        <FloatingLabelField label="Your relationship to this child">
          <select
            value={relation}
            onChange={(e) => setRelation(e.target.value)}
            className={`${fieldClasses} appearance-none bg-white dark:bg-slate-800`}
          >
            <option value="PARENT">Parent</option>
            <option value="GUARDIAN">Guardian</option>
            <option value="RELATIVE">Relative</option>
          </select>
        </FloatingLabelField>

        <button
          type="submit"
          disabled={saving}
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