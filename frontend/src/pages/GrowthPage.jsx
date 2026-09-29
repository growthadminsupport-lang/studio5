import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { authedRequest } from '../lib/api';
import { useChildren } from '../lib/useChildren';

const card = 'mb-6 rounded-2xl bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-700';
const input = 'rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-4 py-2';

export default function GrowthPage() {
  const { children, child, activeChildId, setActiveChildId, loading, error, reload } = useChildren();
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  async function save(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setSaveError('');
    try {
      await authedRequest(`/api/children/${child.id}/growth`, {
        method: 'POST', body: { measurement_date: date, height_cm: Number(height), weight_kg: Number(weight) },
      });
      setHeight(''); setWeight(''); reload();
    } catch (reason) { setSaveError(reason.message); }
    finally { setSaving(false); }
  }
  if (loading) return <p role="status" className="p-8">Loading growth records…</p>;
  if (error) return <p role="alert" className="p-8">{error}</p>;
  if (!child) return <div className="p-8">Add a child to track growth. <Link to="/children/new">Add child</Link></div>;
  const history = child.records;
  return <main className="mx-auto max-w-6xl px-4 py-8 text-slate-900 dark:text-slate-100">
    <section className={card}>
      <h1 className="text-xl font-bold">Growth tracking</h1>
      <label className="my-4 block">Child <select className={input} value={activeChildId} onChange={(e) => { setActiveChildId(e.target.value); setSaveError(''); }} disabled={saving}>
        {children.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
      </select></label>
      <p>{child.gender} · {child.ageLabel} · {child.bornLabel}</p>
      <Link to={`/children/${child.id}/edit`}>Edit child profile</Link>
    </section>
    <section className={card}>
      <h2 className="mb-4 font-semibold">Add measurement</h2>
      {saveError && <p role="alert" className="mb-4 text-red-600">{saveError}</p>}
      <form onSubmit={save} className="flex flex-wrap items-end gap-4">
        <label>Height (cm)<input className={`${input} block`} required type="number" min="20" max="250" step="0.1" value={height} onChange={(e) => setHeight(e.target.value)} /></label>
        <label>Weight (kg)<input className={`${input} block`} required type="number" min="0.5" max="300" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} /></label>
        <label>Date<input className={`${input} block`} required type="date" min={child.date_of_birth} max={new Date().toLocaleDateString('en-CA')} value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <button className="rounded-xl bg-teal-700 px-4 py-2 text-white disabled:opacity-60" disabled={saving}>{saving ? 'Saving…' : 'Add measurement'}</button>
      </form>
    </section>
    {history.length > 0 && [['Height', 'height_cm', 'cm'], ['Weight', 'weight_kg', 'kg'], ['BMI', 'bmi', '']].map(([label, key, unit]) => <section className={card} key={key}>
      <h2 className="font-semibold">{label}{unit && ` (${unit})`}</h2>
      <div className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={[...history].reverse()}>
        <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="measurement_date" /><YAxis domain={['auto', 'auto']} /><Tooltip />
        <Line type="linear" dataKey={key} name={label} stroke="#0d9488" connectNulls={false} />
      </LineChart></ResponsiveContainer></div>
    </section>)}
    <section className={card}>
      <h2 className="mb-4 font-semibold">History</h2>
      {!history.length && <p>No measurements yet.</p>}
      {history.map((row) => <div key={row.id} className="border-b border-slate-200 py-3 dark:border-slate-700">
        <p>{row.measurement_date} · {row.height_cm} cm · {row.weight_kg} kg · BMI {row.bmi?.toFixed(2) ?? '—'}</p>
        {row.guidance_message && <p className="text-sm text-slate-500">{row.guidance_message}</p>}
      </div>)}
    </section>
  </main>;
}
