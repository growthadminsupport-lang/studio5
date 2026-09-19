import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { User } from 'lucide-react';

// Placeholder avatar choices — swap `bg` for real illustrated presets
// once art is ready (mirrors CHILD_AVATAR_PRESETS in the reference).
const AVATAR_PRESETS = [
  { id: 'a1', bg: '#f7d9c4' },
  { id: 'a2', bg: '#dcefe9' },
  { id: 'a3', bg: '#e6dcf5' },
  { id: 'a4', bg: '#fcdce0' },
  { id: 'a5', bg: '#d7e8fc' },
];

// No ChildContext or API in this repo yet — this form is self-contained
// and just navigates to /dashboard on submit. Wire it up to real child
// state (or an API call) once that exists; until then nothing is
// actually persisted.
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
  const location = useLocation();
  const isEdit = Boolean(id);

  // DashboardPage's edit-pencil link passes the child via router state
  // (state={{ child }}) since there's no shared ChildContext yet.
  // Landing here directly (refresh, bookmark) has nothing to prefill from.
  const existingChild = location.state?.child ?? null;

  const [avatarId, setAvatarId] = useState(AVATAR_PRESETS[0].id);
  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [sex, setSex] = useState('FEMALE'); // 'FEMALE' | 'MALE'
  const [relation, setRelation] = useState('PARENT');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit || !existingChild) return;
    setFullName(existingChild.name ?? '');
    setNickname(existingChild.nickname ?? '');
    setDateOfBirth(existingChild.dateOfBirth ?? '');
    setSex(existingChild.sex ?? 'FEMALE');
    setRelation(existingChild.relation ?? 'PARENT');
  }, [isEdit, existingChild]);

  function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);

    // TODO: persist via ChildContext (or an API call) once one exists.
    // Right now this only returns to the dashboard — edits here don't
    // yet flow back into DashboardPage's own child list.
    navigate('/dashboard');
  }

  return (
    <div className="min-h-screen px-4 pb-16 pt-10 dark:bg-slate-950">
    <div className="mx-auto w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-8 shadow-2xs border border-slate-200 dark:border-slate-700">
      <h1 className="text-xl font-bold text-[#056559] dark:text-teal-300">{isEdit ? 'Edit child' : 'Add your child'}</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500 dark:text-slate-400">
        We&apos;ll use this to personalize growth tracking and charts.
      </p>

      {isEdit && !existingChild && (
        <p className="mb-6 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          Opened this page directly, so the form starts blank — go back and use the edit button on the
          child&apos;s profile card instead to load their current details.
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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

        <FloatingLabelField label="Your relationship to this child">
          <select
            value={relation}
            onChange={(e) => setRelation(e.target.value)}
            className={`${fieldClasses} appearance-none bg-white dark:bg-slate-900`}
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