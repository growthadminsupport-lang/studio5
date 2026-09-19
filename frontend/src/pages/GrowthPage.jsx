import { useState } from 'react';
import { useChartTheme } from '../utils/chartTheme';
import { Link } from 'react-router-dom';
import { ArrowLeftRight, Pencil, Baby, Trash2, Check, X } from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

// No ChildContext or API in this repo yet — same mock child shape used
// across the other pages.
const child = {
  id: 'c1',
  name: 'growth',
  gender: 'Girl',
  ageLabel: '18 Years, 4 Months',
  bornLabel: 'Born May 5, 2008',
};

// ============================================================
// Reference curves — same placeholder milestone approach as
// DashboardPage.jsx. Replace with the real WHO/CDC LMS tables once
// the backend provides them; nothing here is derived from a user's
// actual measurement.
// ============================================================

const HEIGHT_MILESTONES = [
  { age: 0, p3: 46, p50: 49, p97: 53 },
  { age: 1, p3: 71, p50: 76, p97: 80 },
  { age: 2, p3: 80, p50: 86, p97: 92 },
  { age: 5, p3: 100, p50: 109, p97: 118 },
  { age: 10, p3: 126, p50: 138, p97: 150 },
  { age: 15, p3: 150, p50: 162, p97: 172 },
  { age: 20, p3: 152, p50: 163, p97: 173 },
];

const WEIGHT_MILESTONES = [
  { age: 0, p3: 2.4, p50: 3.3, p97: 4.2 },
  { age: 1, p3: 7.0, p50: 9.0, p97: 11.5 },
  { age: 2, p3: 9.0, p50: 12.0, p97: 15.0 },
  { age: 5, p3: 13.5, p50: 18.0, p97: 24.0 },
  { age: 10, p3: 21, p50: 32, p97: 45 },
  { age: 15, p3: 39, p50: 53, p97: 72 },
  { age: 20, p3: 43, p50: 57, p97: 80 },
];

// BMI needs an extra boundary (P95 = obesity threshold) for the
// 5-zone band instead of the simple 3-zone one height/weight use.
const BMI_MILESTONES = [
  { age: 2, p3: 14.5, p50: 16.5, p95: 19.5 },
  { age: 7, p3: 13.2, p50: 15.8, p95: 19.5 },
  { age: 11, p3: 14.0, p50: 17.5, p95: 23.5 },
  { age: 16, p3: 16.0, p50: 20.5, p95: 28.5 },
  { age: 20, p3: 16.5, p50: 21.0, p95: 30.0 },
];

function lerpTable(table, age, keys) {
  let lower = table[0];
  let upper = table[table.length - 1];
  for (let i = 0; i < table.length - 1; i++) {
    if (age >= table[i].age && age <= table[i + 1].age) {
      lower = table[i];
      upper = table[i + 1];
      break;
    }
  }
  const span = upper.age - lower.age || 1;
  const t = (age - lower.age) / span;
  const out = {};
  keys.forEach((k) => {
    out[k] = lower[k] + (upper[k] - lower[k]) * t;
  });
  return out;
}

// 3-band curve (Below P3 / Typical range / Above P97) for height & weight.
function build3BandCurve(table, minAge, maxAge) {
  const ceiling = Math.max(...table.map((m) => m.p97)) * 1.08;
  const years = [];
  for (let a = minAge; a <= maxAge; a++) years.push(a);

  return years.map((age) => {
    const { p3, p50, p97 } = lerpTable(table, age, ['p3', 'p50', 'p97']);
    return {
      age,
      ageLabel: `${age}y`,
      p3,
      p50,
      p97,
      belowP3: p3,
      typicalRange: p97 - p3,
      aboveP97: ceiling - p97,
    };
  });
}

// 5-band curve (Underweight / Healthy weight / Overweight / Obesity /
// Severe obesity) for BMI-for-age. P85 (overweight threshold) isn't in
// the milestone table, so it's estimated between P50 and P95.
function buildBmiCurve(table, minAge, maxAge) {
  const ceiling = Math.max(...table.map((m) => m.p95)) * 1.3;
  const years = [];
  for (let a = minAge; a <= maxAge; a++) years.push(a);

  return years.map((age) => {
    const { p3, p50, p95 } = lerpTable(table, age, ['p3', 'p50', 'p95']);
    const p85 = p50 + 0.7 * (p95 - p50);
    const severe = p95 * 1.2;

    return {
      age,
      ageLabel: `${age}y`,
      p3,
      p50,
      p95,
      severe,
      underweight: p3,
      healthy: p85 - p3,
      overweight: p95 - p85,
      obesity: severe - p95,
      severeBand: ceiling - severe,
    };
  });
}

const heightCurve = build3BandCurve(HEIGHT_MILESTONES, 0, 20);
const weightCurve = build3BandCurve(WEIGHT_MILESTONES, 0, 20);
const bmiCurve = buildBmiCurve(BMI_MILESTONES, 2, 20);

// ============================================================
// Small confirm dialog for deleting a measurement
// ============================================================

function ConfirmDeleteDialog({ onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Delete measurement?</h3>
        <p className="mt-1 mb-5 text-sm text-slate-500 dark:text-slate-400">
          This removes the entry from the growth chart and history.
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
// A reference percentile chart card — shared shape for the three
// charts below, only the curve/unit/bands differ.
// ============================================================

function HeightWeightChart({ title, unit, curve }) {
  const chart = useChartTheme();
  return (
    <div className="mb-6 rounded-2xl bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-700 shadow-2xs">
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
        Dashed lines are the 3rd/50th/97th percentile reference curves for the child&apos;s age and sex.
      </p>

      <div className="mt-3 h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={curve} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
            <XAxis
              dataKey="ageLabel"
              ticks={['0y', '5y', '10y', '15y', '20y']}
              tick={{ fill: chart.tick, fontSize: 11 }}
              axisLine={{ stroke: chart.axis }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: chart.tick, fontSize: 11 }}
              axisLine={{ stroke: chart.axis }}
              tickLine={false}
              width={40}
              tickFormatter={(v) => `${Math.round(v)}${unit}`}
            />
            <Tooltip
              formatter={(value, name) => [`${Number(value).toFixed(1)}${unit}`, name]}
              labelFormatter={(label) => `Age ${label}`}
              contentStyle={chart.tooltipStyle}
            />

            <Area type="monotone" dataKey="belowP3" stackId="bands" stroke="none" fill={chart.band("#dbe4f5")} fillOpacity={chart.opacity(0.7)} />
            <Area type="monotone" dataKey="typicalRange" stackId="bands" stroke="none" fill={chart.band("#c8f0dc")} fillOpacity={chart.opacity(0.6)} />
            <Area type="monotone" dataKey="aboveP97" stackId="bands" stroke="none" fill={chart.band("#fde2c8")} fillOpacity={chart.opacity(0.6)} />

            <Line type="monotone" dataKey="p3" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="P3" />
            <Line type="monotone" dataKey="p50" stroke={chart.median} strokeWidth={1.5} strokeDasharray="2 3" dot={false} name="P50 (median)" />
            <Line type="monotone" dataKey="p97" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="P97" />

            {/* The child's own measurements — empty until logged. */}
            <Line type="monotone" dataKey="value" data={[]} stroke={chart.own} strokeWidth={2.5} dot={{ r: 4, fill: chart.own }} name={title} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-[#056559] dark:bg-teal-400" />{title}</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded border-t border-dashed border-slate-400 dark:border-slate-500" />P3</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded border-t border-dashed border-[#00685f] dark:border-teal-300" />P50 (median)</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded border-t border-dashed border-slate-400 dark:border-slate-500" />P97</span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#dbe4f5] dark:bg-blue-500/50" />Below P3</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#c8f0dc] dark:bg-emerald-500/50" />Typical range</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#fde2c8] dark:bg-orange-500/50" />Above P97</span>
      </div>
    </div>
  );
}

function BmiChart({ curve }) {
  const chart = useChartTheme();
  return (
    <div className="mb-6 rounded-2xl bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-700 shadow-2xs">
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">BMI-for-age</h2>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
        Dashed lines are the 3rd and 50th percentile, the 95th (obesity) and 120% of the 95th (severe
        obesity), for the child&apos;s age and sex.
      </p>

      <div className="mt-3 h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={curve} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
            <XAxis
              dataKey="ageLabel"
              ticks={['2y', '7y', '11y', '16y', '20y']}
              tick={{ fill: chart.tick, fontSize: 11 }}
              axisLine={{ stroke: chart.axis }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: chart.tick, fontSize: 11 }}
              axisLine={{ stroke: chart.axis }}
              tickLine={false}
              width={32}
              tickFormatter={(v) => `${Math.round(v)}`}
            />
            <Tooltip
              formatter={(value, name) => [Number(value).toFixed(1), name]}
              labelFormatter={(label) => `Age ${label}`}
              contentStyle={chart.tooltipStyle}
            />

            <Area type="monotone" dataKey="underweight" stackId="bands" stroke="none" fill={chart.band("#dbe4f5")} fillOpacity={chart.opacity(0.7)} />
            <Area type="monotone" dataKey="healthy" stackId="bands" stroke="none" fill={chart.band("#c8f0dc")} fillOpacity={chart.opacity(0.6)} />
            <Area type="monotone" dataKey="overweight" stackId="bands" stroke="none" fill={chart.band("#fbeec2")} fillOpacity={chart.opacity(0.7)} />
            <Area type="monotone" dataKey="obesity" stackId="bands" stroke="none" fill={chart.band("#fde2c8")} fillOpacity={chart.opacity(0.7)} />
            <Area type="monotone" dataKey="severeBand" stackId="bands" stroke="none" fill={chart.band("#f9d3d3")} fillOpacity={chart.opacity(0.6)} />

            <Line type="monotone" dataKey="p3" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="P3" />
            <Line type="monotone" dataKey="p50" stroke={chart.median} strokeWidth={1.5} strokeDasharray="2 3" dot={false} name="P50 (median)" />
            <Line type="monotone" dataKey="p95" stroke="#c2760c" strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="P95 (obesity)" />
            <Line type="monotone" dataKey="severe" stroke="#dc2626" strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="120% of P95 (severe)" />

            <Line type="monotone" dataKey="value" data={[]} stroke={chart.own} strokeWidth={2.5} dot={{ r: 4, fill: chart.own }} name="BMI-for-age" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-[#056559] dark:bg-teal-400" />BMI-for-age</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded border-t border-dashed border-slate-400 dark:border-slate-500" />P3</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded border-t border-dashed border-[#00685f] dark:border-teal-300" />P50 (median)</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded border-t border-dashed border-[#c2760c] dark:border-amber-500" />P95 (obesity)</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded border-t border-dashed border-red-500" />120% of P95 (severe)</span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#dbe4f5] dark:bg-blue-500/50" />Underweight</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#c8f0dc] dark:bg-emerald-500/50" />Healthy weight</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#fbeec2] dark:bg-yellow-500/50" />Overweight</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#fde2c8] dark:bg-orange-500/50" />Obesity</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#f9d3d3] dark:bg-red-500/50" />Severe obesity</span>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        BMI-for-age applies from 2 years. Below that, weight-for-length is the measure clinicians use.
      </p>
    </div>
  );
}

// ============================================================
// Growth Page
// ============================================================

function GrowthPage() {
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [measuredAt, setMeasuredAt] = useState(() => new Date().toISOString().slice(0, 10));

  // Local only — raw entries as typed, no percentile or status
  // computed against them. That scoring needs the real reference
  // tables and belongs on the backend.
  const [history, setHistory] = useState([]);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editHeight, setEditHeight] = useState('');
  const [editWeight, setEditWeight] = useState('');

  function handleAdd(e) {
    e.preventDefault();
    if (!heightCm && !weightKg) return;
    setHistory((prev) => [
      {
        id: `${Date.now()}`,
        measuredAt,
        heightCm: heightCm ? Number(heightCm) : null,
        weightKg: weightKg ? Number(weightKg) : null,
      },
      ...prev,
    ]);
    setHeightCm('');
    setWeightKg('');
  }

  function startEdit(record) {
    setEditingId(record.id);
    setEditHeight(record.heightCm ?? '');
    setEditWeight(record.weightKg ?? '');
  }

  function saveEdit(id) {
    setHistory((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, heightCm: editHeight ? Number(editHeight) : null, weightKg: editWeight ? Number(editWeight) : null }
          : r,
      ),
    );
    setEditingId(null);
  }

  function handleDelete(id) {
    setHistory((prev) => prev.filter((r) => r.id !== id));
    setPendingDeleteId(null);
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 py-8">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">

        {/* ====================================================
            Child Profile
        ==================================================== */}

        <div className="relative mb-6 rounded-2xl bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-700 shadow-2xs sm:p-8">
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

        <h1 className="mb-6 text-xl font-bold text-[#056559] dark:text-teal-300">Growth Tracking</h1>

        {/* ====================================================
            Log a new measurement
        ==================================================== */}

        <div className="mb-6 rounded-2xl bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-700 shadow-2xs">
          <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">Log a new measurement</h2>

          <form onSubmit={handleAdd} className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
            <input
              type="number"
              placeholder="Height (cm)"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-[#056559] dark:focus:border-teal-400"
            />
            <input
              type="number"
              placeholder="Weight (kg)"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-[#056559] dark:focus:border-teal-400"
            />
            <input
              type="date"
              value={measuredAt}
              onChange={(e) => setMeasuredAt(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-[#056559] dark:focus:border-teal-400"
            />
            <button
              type="submit"
              className="rounded-xl bg-[#056559] dark:bg-teal-400 px-4 py-2.5 text-sm font-semibold text-white dark:text-slate-950 transition hover:bg-[#03443c] dark:hover:bg-teal-300"
            >
              Add measurement
            </button>
          </form>
        </div>

        {/* ====================================================
            Reference charts
        ==================================================== */}

        <HeightWeightChart title="Height-for-age" unit="cm" curve={heightCurve} />
        <HeightWeightChart title="Weight-for-age" unit="kg" curve={weightCurve} />
        <BmiChart curve={bmiCurve} />

        {/* ====================================================
            History
        ==================================================== */}

        <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 border border-slate-200 dark:border-slate-700 shadow-2xs">
          <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">History</h2>

          <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {history.map((record) =>
              editingId === record.id ? (
                <div key={record.id} className="flex flex-wrap items-center gap-2 py-3 text-sm">
                  <span className="w-24 shrink-0 text-slate-500 dark:text-slate-400">{formatDate(record.measuredAt)}</span>
                  <input
                    type="number"
                    placeholder="Height (cm)"
                    value={editHeight}
                    onChange={(e) => setEditHeight(e.target.value)}
                    className="w-28 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs outline-none focus:border-[#056559] dark:focus:border-teal-400"
                  />
                  <input
                    type="number"
                    placeholder="Weight (kg)"
                    value={editWeight}
                    onChange={(e) => setEditWeight(e.target.value)}
                    className="w-28 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs outline-none focus:border-[#056559] dark:focus:border-teal-400"
                  />
                  <button
                    type="button"
                    onClick={() => saveEdit(record.id)}
                    aria-label="Save"
                    className="text-[#056559] dark:text-teal-300 hover:text-[#03443c] dark:hover:text-teal-200"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    aria-label="Cancel edit"
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div key={record.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm">
                  <span className="text-slate-500 dark:text-slate-400">{formatDate(record.measuredAt)}</span>
                  <span className="text-slate-900 dark:text-slate-100">{record.heightCm ? `${record.heightCm} cm` : '—'}</span>
                  <span className="text-slate-900 dark:text-slate-100">{record.weightKg ? `${record.weightKg} kg` : '—'}</span>
                  <span className="ml-auto flex items-center gap-2">
                    <button type="button" aria-label="Edit" onClick={() => startEdit(record)} className="text-slate-400 hover:text-[#056559] dark:hover:text-teal-300">
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete"
                      onClick={() => setPendingDeleteId(record.id)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </span>
                </div>
              ),
            )}

            {history.length === 0 && <p className="py-4 text-sm text-slate-500 dark:text-slate-400">No measurements yet.</p>}
          </div>
        </div>

      </div>

      {pendingDeleteId && (
        <ConfirmDeleteDialog onCancel={() => setPendingDeleteId(null)} onConfirm={() => handleDelete(pendingDeleteId)} />
      )}
    </div>
  );
}

export default GrowthPage;