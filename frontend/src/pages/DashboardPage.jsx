import { useState } from 'react';
import { useChartTheme } from '../utils/chartTheme';
import { Link } from 'react-router-dom';
import { useChildren } from '../context/ChildrenContext';
import ChildProfileCard, { NoChildState } from '../components/ChildProfile/ChildProfileCard';
import {
  Ruler,
  Weight,
  Accessibility,
  Sparkles,
  Plus,
  Utensils,
  Bandage,
  Heart,
  Salad,
  AlertTriangle,
} from 'lucide-react';

import growthExploreImg from '../assets/knowledgeImg/growthExplore.png';
import nutritionExploreImg from '../assets/knowledgeImg/nutritionExplore.png';
import pubertyExploreImg from '../assets/knowledgeImg/pubertyExplore.png';
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

// ============================================================
// Growth Measures
// ============================================================

const MEASURES = {
  height: { label: 'Height', unit: 'cm', icon: Ruler, valueKey: 'heightCm', chartTitle: 'Height-for-age vs. Reference', percentileKey: 'heightPercentile' },
  weight: { label: 'Weight', unit: 'kg', icon: Weight, valueKey: 'weightKg', chartTitle: 'Weight-for-age vs. Reference', percentileKey: 'weightPercentile' },
  bmi: { label: 'BMI', unit: '', icon: Accessibility, valueKey: 'bmi', chartTitle: 'BMI-for-age vs. Reference', percentileKey: 'bmiPercentile' },
};

// ============================================================
// Mock Data
// ============================================================

// The child's most recent GrowthRecord (docs/api.md) — the latest entry
// from GET /growth?childId=. null until one is logged, so the tiles show "—".
const latestRecord = null;

// Drives the "Worth a look" banner. null until growth stats flag
// something — comes from the backend's guidance calculation later.
const guidance = null; // shape once wired up: { flagged, nutritionalStatus, message }

// Drives "What to do next" — empty until there's something to suggest
// (a stale measurement, an unflagged puberty screening, etc).
const suggestions = [];

// null | 'PENDING' | 'COMPLETED' | 'FAILED'
const boneAge = {
  status: null,
  ageYears: null,
};

// Placeholder percentile milestones (girls) — replace with the real
// WHO/CDC LMS reference table from the backend once it's wired up.
// Each curve is interpolated across ages 0–20y for a smooth line.
const MILESTONES = {
  height: [
    { age: 0, p3: 46, p50: 49, p97: 53 },
    { age: 1, p3: 71, p50: 76, p97: 80 },
    { age: 2, p3: 80, p50: 86, p97: 92 },
    { age: 5, p3: 100, p50: 109, p97: 118 },
    { age: 10, p3: 126, p50: 138, p97: 150 },
    { age: 15, p3: 150, p50: 162, p97: 172 },
    { age: 20, p3: 152, p50: 163, p97: 173 },
  ],
  weight: [
    { age: 0, p3: 2.4, p50: 3.3, p97: 4.2 },
    { age: 1, p3: 7.0, p50: 9.0, p97: 11.5 },
    { age: 2, p3: 9.0, p50: 12.0, p97: 15.0 },
    { age: 5, p3: 13.5, p50: 18.0, p97: 24.0 },
    { age: 10, p3: 21, p50: 32, p97: 45 },
    { age: 15, p3: 39, p50: 53, p97: 72 },
    { age: 20, p3: 43, p50: 57, p97: 80 },
  ],
  bmi: [
    { age: 0, p3: 11, p50: 13, p97: 15 },
    { age: 1, p3: 14, p50: 16.5, p97: 19 },
    { age: 2, p3: 13, p50: 15.5, p97: 18.5 },
    { age: 5, p3: 12.5, p50: 15, p97: 17.5 },
    { age: 10, p3: 13, p50: 16.5, p97: 20.5 },
    { age: 15, p3: 15, p50: 19, p97: 25 },
    { age: 20, p3: 16.5, p50: 21, p97: 28.5 },
  ],
};

// Same dataset as the "Nurturing Knowledge" section on HomePage.jsx —
// copied in directly for now rather than pulled from a shared file.
// If HomePage's copy ever changes, update this array too.
const articles = [
  {
    id: 1,
    slug: 'navigating-growth-spurts',
    label: 'Article',
    title: 'Growth Spurts',
    desc: 'When and how your body speeds up.',
    category: 'growth',
    image: growthExploreImg,
  },
  {
    id: 2,
    slug: 'nutrition-for-pre-teens',
    label: 'Guide',
    title: 'Nutrition',
    desc: 'Key nutrients for strong bones and healthy growth.',
    category: 'nutrition',
    image: nutritionExploreImg,
  },
  {
    id: 3,
    slug: 'understanding-puberty',
    label: 'Explainer',
    title: 'Puberty',
    desc: 'What to expect and how to prepare.',
    category: 'puberty',
    image: pubertyExploreImg,
  },
];
// ============================================================
// Helpers
// ============================================================

// Interpolates a milestone table (sparse ages) into one point per year
// so the reference lines and bands read as smooth curves like the
// clinical growth charts they're standing in for.
function buildCurve(milestones) {
  const years = Array.from({ length: 21 }, (_, i) => i); // 0..20
  const ceiling = Math.max(...milestones.map((m) => m.p97)) * 1.08;

  return years.map((age) => {
    let lower = milestones[0];
    let upper = milestones[milestones.length - 1];
    for (let i = 0; i < milestones.length - 1; i++) {
      if (age >= milestones[i].age && age <= milestones[i + 1].age) {
        lower = milestones[i];
        upper = milestones[i + 1];
        break;
      }
    }
    const span = upper.age - lower.age || 1;
    const t = (age - lower.age) / span;
    const lerp = (a, b) => a + (b - a) * t;

    const p3 = lerp(lower.p3, upper.p3);
    const p50 = lerp(lower.p50, upper.p50);
    const p97 = lerp(lower.p97, upper.p97);

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

const REFERENCE_CURVES = {
  height: buildCurve(MILESTONES.height),
  weight: buildCurve(MILESTONES.weight),
  bmi: buildCurve(MILESTONES.bmi),
};

// Below P3 or above P97 is "worth a second look" — everything in
// between reads as typical range. Returns null when there's no
// percentile yet (no measurement logged).
function describeStatus(percentile) {
  if (percentile === null || percentile === undefined) return null;
  if (percentile >= 99.5) return { label: '>P99 · well above typical', tone: 'text-amber-600 dark:text-amber-400' };
  if (percentile <= 0.5) return { label: '<P1 · well below typical', tone: 'text-amber-600 dark:text-amber-400' };
  if (percentile < 3) return { label: `P${Math.round(percentile)} · below typical`, tone: 'text-amber-600 dark:text-amber-400' };
  if (percentile > 97) return { label: `P${Math.round(percentile)} · above typical`, tone: 'text-amber-600 dark:text-amber-400' };
  return { label: `P${Math.round(percentile)} · typical range`, tone: 'text-[#056559] dark:text-teal-300' };
}

// ============================================================
// What to do next
// ============================================================

function NextSteps({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="mb-6 rounded-2xl bg-white dark:bg-slate-800 p-5 border border-slate-200 dark:border-slate-700 shadow-2xs">
      <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">What to do next</h2>

      <div className="flex flex-col gap-3">
        {items.map((s) => (
          <div
            key={s.kind}
            className={`flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between ${
              s.severity === 'warning' ? 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10' : 'border-slate-200 dark:border-slate-700'
            }`}
          >
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{s.title}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{s.body}</p>
            </div>

            <Link
              to={s.actionHref}
              className={`inline-flex shrink-0 items-center justify-center rounded-full px-4 py-2 text-xs font-semibold transition ${
                s.severity === 'warning'
                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                  : 'border border-slate-200 dark:border-slate-700 text-[#056559] dark:text-teal-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {s.actionLabel}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Dashboard Page
// ============================================================

function DashboardPage() {
  const chart = useChartTheme();
  const [selectedMeasure, setSelectedMeasure] = useState('height');
  const { activeChild: child } = useChildren();
  const currentMeasure = MEASURES[selectedMeasure];
  const curve = REFERENCE_CURVES[selectedMeasure];

  // No child on the account yet — nothing else on the dashboard makes
  // sense without one, so this replaces the whole page body.
  if (!child) return <NoChildState />;

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 py-5 sm:py-8">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">

        {/* ====================================================
            Child Profile
        ==================================================== */}

        <ChildProfileCard />

        {/* ====================================================
            Worth a look — only renders once growth stats actually
            flag something, so it's never a second copy of a step
            already listed in "What to do next" below.
        ==================================================== */}

        {guidance?.flagged && (
          <div className="mb-6 flex gap-3 rounded-2xl border border-amber-200 dark:border-amber-500/30 border-l-4 border-l-amber-500 dark:border-l-amber-400 bg-amber-50 dark:bg-amber-500/10 p-4">
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Worth a look{guidance.nutritionalStatus ? ` · ${guidance.nutritionalStatus}` : ''}
              </p>
              <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">{guidance.message}</p>
            </div>
          </div>
        )}

        {/* ====================================================
            What to do next
        ==================================================== */}

        <NextSteps items={suggestions} />

        {/* ====================================================
            Growth Trajectory + Puberty
        ==================================================== */}

        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Growth Trajectory */}

          <div className="min-w-0 rounded-2xl bg-white dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700 shadow-2xs sm:p-5 lg:col-span-2">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Growth Trajectory</h2>

              <Link
                to="/growth"
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-[#056559] dark:text-teal-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Plus size={14} />
                Add Measurement
              </Link>
            </div>

            {/* Measure tiles double as tabs. Values and percentile status
                show "—" until this child has a logged measurement. */}
            <div className="mb-5 grid grid-cols-3 gap-2">
              {Object.entries(MEASURES).map(([key, measure]) => {
                const Icon = measure.icon;
                const active = selectedMeasure === key;
                const value = latestRecord?.[measure.valueKey] ?? null;
                const status = describeStatus(latestRecord?.[measure.percentileKey]);

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedMeasure(key)}
                    className={`min-w-0 rounded-xl border p-2.5 text-left transition sm:p-3 ${
                      active
                        ? 'border-[#00685f] dark:border-teal-300 bg-white dark:bg-slate-800 ring-1 ring-[#00685f] dark:ring-teal-400'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-1 truncate text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      <Icon size={12} className="shrink-0" />
                      {measure.label}
                    </span>
                    <span className="mt-1 block truncate text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">
                      {value !== null ? `${value}${measure.unit}` : '—'}
                    </span>
                    {status && (
                      <span className={`mt-0.5 block text-[10px] ${status.tone}`}>{status.label}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div>
              <h3 className="text-sm font-bold text-[#056559] dark:text-teal-300">{currentMeasure.chartTitle}</h3>
              <p className="mt-0.5 text-xs text-slate-400">
                Dashed lines are the 3rd/50th/97th percentile reference curves for the child&apos;s age and sex.
              </p>
            </div>

            <div className="mt-3 h-[220px] w-full sm:h-[260px] lg:h-[280px]">
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
                    width={48}
                    tickFormatter={(v) => `${Math.round(v)}${currentMeasure.unit}`}
                  />
                  <Tooltip
                    formatter={(value, name) => [`${Number(value).toFixed(1)}${currentMeasure.unit}`, name]}
                    labelFormatter={(label) => `Age ${label}`}
                    contentStyle={{ ...chart.tooltipStyle, boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }}
                  />

                  {/* Stacked bands: below P3, typical range, above P97.
                      Background only — hidden from the tooltip. */}
                  <Area type="monotone" dataKey="belowP3" stackId="bands" stroke="none" fill={chart.band("#e2e8f0")} fillOpacity={chart.opacity(0.85)} tooltipType="none" activeDot={false} />
                  <Area type="monotone" dataKey="typicalRange" stackId="bands" stroke="none" fill={chart.band("#bfdbfe")} fillOpacity={chart.opacity(0.65)} tooltipType="none" activeDot={false} />
                  <Area type="monotone" dataKey="aboveP97" stackId="bands" stroke="none" fill={chart.band("#fed7aa")} fillOpacity={chart.opacity(0.6)} tooltipType="none" activeDot={false} />

                  {/* Reference percentile lines */}
                  <Line type="monotone" dataKey="p3" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="P3 (low)" />
                  <Line type="monotone" dataKey="p50" stroke={chart.median} strokeWidth={1.5} strokeDasharray="2 3" dot={false} name="P50 (median)" />
                  <Line type="monotone" dataKey="p97" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="P97 (high)" />

                  {/* The child's own measurements — empty until logged,
                      the legend swatch below stays regardless. */}
                  <Line
                    type="monotone"
                    dataKey={selectedMeasure}
                    data={[]}
                    stroke={chart.own}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: chart.own }}
                    name={currentMeasure.chartTitle}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Custom legend — matches the two-row key under the chart */}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded bg-[#056559] dark:bg-teal-400" />
                {currentMeasure.chartTitle}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded border-t border-dashed border-slate-400 dark:border-slate-500" />
                P3 (low)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded border-t border-dashed border-[#00685f] dark:border-teal-300" />
                P50 (median)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded border-t border-dashed border-slate-400 dark:border-slate-500" />
                P97 (high)
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#e2e8f0] dark:bg-slate-600" />
                Below P3
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#bfdbfe] dark:bg-blue-500/50" />
                Typical range
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#fed7aa] dark:bg-orange-500/50" />
                Above P97
              </span>
            </div>
          </div>

          {/* Puberty Screening */}

          <div className="flex w-full flex-col self-start rounded-2xl bg-white dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700 shadow-2xs sm:p-5">
            <div className="mb-2 flex items-center gap-2.5">
              <Sparkles size={18} className="text-[#056559] dark:text-teal-300" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Puberty Screening</h2>
            </div>

            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
              Answer a short questionnaire to screen for early signs of puberty.
            </p>

            <Link
              to="/puberty"
              className="mt-4 flex w-full items-center justify-center rounded-full bg-[#056559] dark:bg-teal-400 px-4 py-2.5 text-sm font-semibold text-white dark:text-slate-950 transition hover:bg-[#03443c] dark:hover:bg-teal-300"
            >
              Start Screening
            </Link>
          </div>
        </div>

        {/* ====================================================
            Bone Age — copy changes with the status of the last
            upload instead of always showing the same prompt.
        ==================================================== */}

        <div className="mb-6 rounded-2xl bg-white dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700 shadow-2xs sm:p-5">
          <div className="mb-2 flex flex-wrap items-center gap-2.5">
            <Sparkles size={18} className="text-[#056559] dark:text-teal-300" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">AI Bone Age Analysis</h2>
            <span className="rounded-full bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
              BETA
            </span>
          </div>

          <p className="mb-4 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {boneAge.status === 'COMPLETED' && boneAge.ageYears
              ? `Latest estimate: ${boneAge.ageYears} years bone age.`
              : boneAge.status === 'PENDING'
                ? 'Your last X-ray is still being analyzed.'
                : boneAge.status === 'FAILED'
                  ? 'Your last analysis could not be completed — try uploading again.'
                  : 'Upload a left-hand X-ray for a preliminary bone age assessment.'}
          </p>

          <Link
            to="/bone-age"
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-[#056559] dark:text-teal-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Plus size={14} />
            {boneAge.status === 'COMPLETED' || boneAge.status === 'FAILED' ? 'Add New X-Ray' : 'Upload X-Ray'}
          </Link>
        </div>

        {/* ====================================================
            Parenting Resources — same dataset and card look as
            HomePage's "Nurturing Knowledge" section.
        ==================================================== */}

        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Parenting Resources</h2>
          <Link to="/knowledge" className="text-xs font-semibold text-[#00685f] dark:text-teal-300 hover:underline">
            View all
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => (
            <div
              key={a.id}
              className="flex flex-col overflow-hidden rounded-[14px] bg-white dark:bg-slate-800 shadow-[0_4px_12px_rgba(0,0,0,0.02)]"
            >
              <img src={a.image} alt={a.title} className="h-36 w-full object-cover" />
          
              <div className="flex flex-1 flex-col p-4">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{a.title}</h3>
                <p className="mt-1.5 flex-1 text-sm leading-5 text-slate-500 dark:text-slate-400">{a.desc}</p>
          
                <Link
                  to={`/knowledge/${a.slug}`}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#00685f] dark:text-teal-300 hover:underline"
                >
                  Read More →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

export default DashboardPage;