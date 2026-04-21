/* ProblemValidation — sits between the loading screen and competitor analysis.
   Shows how well-evidenced the user's problem gap is across 6 signal dimensions.
   Data will come from the backend scraping pipeline; mock data lives in App.tsx. */

export interface ValidationMetric {
  number: number;
  label: string;
  score: number; // 0–10
  description: string;
}

export interface ValidationData {
  metrics: ValidationMetric[];
  resolution_status: 'open' | 'partial' | 'resolved';
  resolution_explanation: string;
}

interface Props {
  data: ValidationData;
  onNext?: () => void;
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

function scoreColor(score: number) {
  if (score >= 8) return 'text-emerald-500';
  if (score >= 6) return 'text-amber-500';
  return 'text-red-400';
}

function barColor(score: number) {
  if (score >= 8) return 'bg-emerald-400';
  if (score >= 6) return 'bg-amber-400';
  return 'bg-red-400';
}

/* ── Metric row card ─────────────────────────────────────────────────── */

function MetricRow({ metric }: { metric: ValidationMetric }) {
  return (
    <div className="bg-white rounded-xl border border-zinc-100 shadow-sm px-5 py-4 flex items-start gap-5">

      {/* Number badge */}
      <span className="w-6 h-6 rounded-md bg-zinc-50 border border-zinc-200 flex items-center justify-center text-[10px] font-bold text-zinc-400 shrink-0 mt-0.5">
        {metric.number}
      </span>

      {/* Label + description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-4 mb-1.5">
          <p className="text-sm font-bold text-zinc-900">{metric.label}</p>
          <p className={`text-2xl font-extrabold leading-none shrink-0 ${scoreColor(metric.score)}`}>
            {metric.score}
          </p>
        </div>
        <p className="text-[11px] text-zinc-500 font-light leading-snug mb-2">
          {metric.description}
        </p>
        {/* Score bar */}
        <div className="w-full h-1 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${barColor(metric.score)} transition-all duration-700`}
            style={{ width: `${metric.score * 10}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Radar chart (pure SVG) ──────────────────────────────────────────── */

function RadarChart({ metrics }: { metrics: ValidationMetric[] }) {
  const cx = 210, cy = 195, r = 130;
  const n = metrics.length;

  /* Angle for axis i — starts at top (−90°), goes clockwise */
  const axisAngle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;

  /* XY coordinate on axis i at a given 0–1 fraction of the radius */
  const pt = (i: number, fraction: number) => ({
    x: cx + r * fraction * Math.cos(axisAngle(i)),
    y: cy + r * fraction * Math.sin(axisAngle(i)),
  });

  /* SVG points string for a polygon at a given scale fraction */
  const polyPoints = (fraction: number) =>
    Array.from({ length: n }, (_, i) => {
      const p = pt(i, fraction);
      return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    }).join(' ');

  /* Data polygon using each metric's score */
  const dataPoints = metrics
    .map((m, i) => {
      const p = pt(i, m.score / 10);
      return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    })
    .join(' ');

  /* Text anchor based on horizontal position relative to center */
  const textAnchor = (i: number) => {
    const cos = Math.cos(axisAngle(i));
    if (cos > 0.1) return 'start';
    if (cos < -0.1) return 'end';
    return 'middle';
  };

  /* Label position — pushed outward from the axis endpoint */
  const labelPt = (i: number) => {
    const angle = axisAngle(i);
    const offset = 24;
    return {
      x: cx + (r + offset) * Math.cos(angle),
      y: cy + (r + offset) * Math.sin(angle),
    };
  };

  /* Dominant baseline nudge for top/bottom labels */
  const baseline = (i: number) => {
    const sin = Math.sin(axisAngle(i));
    if (sin < -0.5) return 'auto';
    if (sin > 0.5) return 'hanging';
    return 'middle';
  };

  return (
    <svg viewBox="0 0 420 390" className="w-full h-full">

      {/* Grid rings at 20%, 40%, 60%, 80%, 100% */}
      {[0.2, 0.4, 0.6, 0.8, 1.0].map(f => (
        <polygon
          key={f}
          points={polyPoints(f)}
          fill="none"
          stroke={f === 1.0 ? '#d4d4d8' : '#e4e4e7'}
          strokeWidth={f === 1.0 ? 1.5 : 1}
        />
      ))}

      {/* Scale labels on the vertical axis (axis 0) */}
      {[2, 4, 6, 8, 10].map(v => {
        const p = pt(0, v / 10);
        return (
          <text
            key={v}
            x={p.x + 5}
            y={p.y}
            fontSize="8"
            fill="#a1a1aa"
            dominantBaseline="middle"
          >
            {v}
          </text>
        );
      })}

      {/* Axis spokes */}
      {metrics.map((_, i) => {
        const p = pt(i, 1);
        return (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={p.x.toFixed(2)} y2={p.y.toFixed(2)}
            stroke="#e4e4e7"
            strokeWidth="1"
          />
        );
      })}

      {/* Data fill polygon */}
      <polygon
        points={dataPoints}
        fill="rgba(139,92,246,0.12)"
        stroke="rgba(139,92,246,0.8)"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {metrics.map((m, i) => {
        const p = pt(i, m.score / 10);
        return (
          <circle
            key={i}
            cx={p.x.toFixed(2)}
            cy={p.y.toFixed(2)}
            r="4"
            fill="rgb(139,92,246)"
            stroke="white"
            strokeWidth="1.5"
          />
        );
      })}

      {/* Axis labels */}
      {metrics.map((m, i) => {
        const lp = labelPt(i);
        return (
          <text
            key={i}
            x={lp.x.toFixed(2)}
            y={lp.y.toFixed(2)}
            textAnchor={textAnchor(i)}
            dominantBaseline={baseline(i)}
            fontSize="11"
            fontWeight="600"
            fill="#52525b"
          >
            {m.label}
          </text>
        );
      })}
    </svg>
  );
}

/* ── Resolution status banner ───────────────────────────────────────── */

/* Maps the three resolution states to display config.
   "open" = green opportunity, "partial" = amber caution, "resolved" = red warning. */
const RESOLUTION_CONFIG = {
  open:     { label: 'Open Problem',          sub: 'No satisfying solution exists in market',          badge: 'bg-emerald-50 border-emerald-200 text-emerald-700', dot: 'bg-emerald-400' },
  partial:  { label: 'Being Resolved',        sub: 'Workarounds exist but people remain frustrated',    badge: 'bg-amber-50 border-amber-200 text-amber-700',   dot: 'bg-amber-400'   },
  resolved: { label: 'Problem Largely Solved', sub: 'Market is well-served — highly competitive space', badge: 'bg-red-50 border-red-200 text-red-600',         dot: 'bg-red-400'     },
} as const;

function ResolutionBanner({ status, explanation }: { status: 'open' | 'partial' | 'resolved'; explanation: string }) {
  const cfg = RESOLUTION_CONFIG[status];
  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 mb-8 ${cfg.badge}`}>
      {/* Status dot */}
      <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${cfg.dot}`} />
      <div>
        <p className="text-sm font-bold leading-snug">{cfg.label}</p>
        <p className="text-xs font-light opacity-80 mt-0.5">{cfg.sub}</p>
        {explanation && (
          <p className="text-[11px] mt-1.5 leading-snug opacity-70">{explanation}</p>
        )}
      </div>
    </div>
  );
}

/* ── Overall signal score ────────────────────────────────────────────── */

function OverallScore({ metrics }: { metrics: ValidationMetric[] }) {
  const avg = metrics.reduce((sum, m) => sum + m.score, 0) / metrics.length;
  const label = avg >= 7.5 ? 'Strong Signal' : avg >= 5.5 ? 'Moderate Signal' : 'Weak Signal';
  const color = avg >= 7.5 ? 'text-emerald-500' : avg >= 5.5 ? 'text-amber-500' : 'text-red-400';
  const badge = avg >= 7.5
    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
    : avg >= 5.5
    ? 'bg-amber-50 text-amber-600 border-amber-200'
    : 'bg-red-50 text-red-500 border-red-200';

  return (
    <div className="flex items-center gap-3 mb-8">
      <span className={`text-5xl font-extrabold leading-none ${color}`}>{avg.toFixed(1)}</span>
      <div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${badge}`}>{label}</span>
        <p className="text-[11px] text-zinc-400 font-light mt-1">Average across 6 validation signals</p>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────── */

export default function ProblemValidation({ data, onNext }: Props) {
  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-6xl mx-auto px-8 py-10">

        {/* Header */}
        <div className="mb-6">
          <p className="text-xs font-bold tracking-[0.25em] text-violet-500 uppercase mb-4">◆ Insight</p>
          <h1 className="text-[2.6rem] font-extrabold text-zinc-900 leading-tight tracking-tight">
            Problem Validation
          </h1>
          <p className="text-zinc-400 mt-2 text-sm font-light">
            How strongly does the evidence support the gap you identified?
          </p>
        </div>

        {/* Overall score */}
        <OverallScore metrics={data.metrics} />

        {/* Resolution status — tells the user if the problem is open, being resolved, or already solved */}
        <ResolutionBanner status={data.resolution_status} explanation={data.resolution_explanation} />

        {/* Main layout: metrics list (left) + radar chart (right) */}
        <div className="flex gap-8 items-start">

          {/* Metric rows */}
          <div className="flex-1 space-y-3">
            {data.metrics.map(metric => (
              <MetricRow key={metric.number} metric={metric} />
            ))}
          </div>

          {/* Radar chart */}
          <div className="w-[420px] shrink-0 sticky top-8 self-start bg-white rounded-xl border border-zinc-100 shadow-sm p-4">
            <p className="text-[9px] font-bold tracking-[0.2em] text-zinc-400 uppercase mb-3">Signal Radar</p>
            <RadarChart metrics={data.metrics} />
          </div>
        </div>

        {/* Continue button */}
        {onNext && (
          <button
            onClick={onNext}
            className="w-full mt-8 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-700 active:scale-[0.99] text-white font-semibold text-sm transition-all duration-150 tracking-wide"
          >
            Continue to Competitor Analysis →
          </button>
        )}

        <p className="text-center text-zinc-300 text-xs font-light mt-4 pb-4">
          Signals derived from public posts, reviews, and community data
        </p>
      </div>
    </div>
  );
}
