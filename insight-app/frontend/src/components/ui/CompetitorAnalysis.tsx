/* CompetitorAnalysis — rendered after the loading phase.
   Layout: 3-column competitor grid (left) + sticky score card (right).
   Data shape mirrors what the backend scraping endpoint will return.
   Currently driven by mock data in App.tsx; swap props.data for the real API response when ready. */

export interface Competitor {
  name: string;
  description: string;
  similarityScore: number; // 0–100
  category: 'Direct' | 'Indirect' | 'Adjacent';
  strengths: string[];
  limitations: string[];
}

export interface MarketScore {
  score: number; // 0–10
  insights: string[];
  differentiators: string[]; // what sets the user's idea apart from every competitor
}

export interface CompetitorData {
  competitors: Competitor[];
  marketScore: MarketScore;
  sources?: string[];
}

interface Props {
  data: CompetitorData;
  onNext?: () => void;
  onBack?: () => void;
}

/* ── Colour helpers ──────────────────────────────────────────────────── */

/* Colour shifts from red (near-clone) → amber (overlapping) → emerald (adjacent).
   Applied to the badge, fill bar, and left accent border of each card. */
function similarityStyle(score: number) {
  if (score >= 75) return { badge: 'bg-red-50 text-red-500 border-red-200', bar: 'bg-red-400', leftBorder: 'border-l-red-300' };
  if (score >= 50) return { badge: 'bg-amber-50 text-amber-500 border-amber-200', bar: 'bg-amber-400', leftBorder: 'border-l-amber-300' };
  return { badge: 'bg-emerald-50 text-emerald-600 border-emerald-200', bar: 'bg-emerald-400', leftBorder: 'border-l-emerald-300' };
}

function scoreColor(score: number) {
  if (score >= 7) return 'text-emerald-500';
  if (score >= 5) return 'text-amber-500';
  return 'text-red-500';
}

function scoreLabel(score: number) {
  if (score >= 7) return 'Strong Opportunity';
  if (score >= 5) return 'Viable Entry';
  return 'Crowded Market';
}

/* ── Compressed competitor card ─────────────────────────────────────── */

function CompetitorCard({ competitor, rank }: { competitor: Competitor; rank: number }) {
  const style = similarityStyle(competitor.similarityScore);

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-zinc-100 border-l-[3px] ${style.leftBorder} flex flex-col overflow-hidden`}>

      {/* Top section */}
      <div className="px-4 pt-4 pb-3">

        {/* Rank + name row */}
        <div className="flex items-center gap-2 mb-1">
          <span className="w-5 h-5 rounded-md bg-zinc-50 border border-zinc-200 flex items-center justify-center text-[10px] font-bold text-zinc-400 shrink-0">
            {rank}
          </span>
          <h3 className="text-sm font-bold text-zinc-900 leading-tight truncate">{competitor.name}</h3>
        </div>

        {/* Description — single line, truncated */}
        <p className="text-[11px] text-zinc-400 font-light leading-snug truncate mb-3">
          {competitor.description}
        </p>

        {/* Similarity bar + % inline */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${style.bar}`}
              style={{ width: `${competitor.similarityScore}%` }}
            />
          </div>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${style.badge}`}>
            {competitor.similarityScore}%
          </span>
        </div>

        {/* Category tag */}
        <p className="text-[10px] text-zinc-400 font-light mt-1.5">{competitor.category} Competitor</p>
      </div>

      {/* Strengths & Limitations — stacked, 2 items each */}
      <div className="border-t border-zinc-100 px-4 py-3 flex-1 space-y-3">

        <div>
          <p className="text-[9px] font-bold tracking-[0.15em] text-zinc-400 uppercase mb-1.5">Strengths</p>
          <ul className="space-y-1">
            {competitor.strengths.slice(0, 2).map((s, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-zinc-600 leading-snug">
                <span className="text-emerald-500 font-bold shrink-0 mt-px">✓</span>
                <span className="truncate">{s}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-[9px] font-bold tracking-[0.15em] text-zinc-400 uppercase mb-1.5">Limitations</p>
          <ul className="space-y-1">
            {competitor.limitations.slice(0, 2).map((l, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-zinc-600 leading-snug">
                <span className="text-red-400 font-bold shrink-0 mt-px">✕</span>
                <span className="truncate">{l}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ── Score card — tall column on the right ──────────────────────────── */

function MarketScoreCard({ marketScore }: { marketScore: MarketScore }) {
  const labelStyle = marketScore.score >= 7
    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
    : marketScore.score >= 5
    ? 'bg-amber-50 text-amber-600 border-amber-200'
    : 'bg-red-50 text-red-500 border-red-200';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-zinc-100 flex flex-col px-5 py-6 h-full">

      <p className="text-[9px] font-bold tracking-[0.2em] text-zinc-400 uppercase mb-6">
        Market Score
      </p>

      {/* Big score number */}
      <div className="text-center mb-6">
        <p className={`text-7xl font-extrabold leading-none tracking-tight ${scoreColor(marketScore.score)}`}>
          {marketScore.score.toFixed(1)}
        </p>
        <p className="text-zinc-300 text-xs mt-2 font-light">out of 10</p>
        <span className={`inline-block mt-3 text-[11px] font-semibold px-3 py-1 rounded-full border ${labelStyle}`}>
          {scoreLabel(marketScore.score)}
        </span>
      </div>

      {/* Thin divider */}
      <div className="w-full h-px bg-zinc-100 mb-5" />

      {/* Your Edge — replaces the summary, sits directly below the score */}
      <div className="flex-1">
        <p className="text-[9px] font-bold tracking-[0.2em] text-zinc-400 uppercase mb-3">
          Your Edge
        </p>
        <ul className="space-y-2">
          {marketScore.differentiators.map((d, i) => (
            <li key={i} className="flex items-start gap-2 text-[11px] text-zinc-600 leading-snug">
              <span className="text-violet-500 font-bold shrink-0 mt-px">◆</span>
              {d}
            </li>
          ))}
        </ul>
      </div>

      {/* Insight chips */}
      <div className="mt-5 flex flex-col gap-2">
        {marketScore.insights.map((insight, i) => (
          <span
            key={i}
            className="text-[10px] font-medium bg-violet-50 text-violet-600 border border-violet-100 px-3 py-1.5 rounded-lg text-center"
          >
            {insight}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────── */

export default function CompetitorAnalysis({ data, onNext, onBack }: Props) {
  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-6xl mx-auto px-8 py-10">

        {/* Back button — returns to Problem Validation */}
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-600 text-sm font-medium mb-6 transition-colors duration-150"
          >
            ← Back to Problem Validation
          </button>
        )}

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-bold tracking-[0.25em] text-violet-500 uppercase mb-4">◆ Insight</p>
          <h1 className="text-[2.6rem] font-extrabold text-zinc-900 leading-tight tracking-tight">
            Competitor Landscape
          </h1>
          <p className="text-zinc-400 mt-2 text-sm font-light">
            Top {data.competitors.length} solutions competing in your space.
          </p>
        </div>

        {/* Main layout: card grid (left) + score column (right) */}
        <div className="flex gap-5 items-start">

          {/* Competitor cards — 3 per row */}
          <div className="flex-1 grid grid-cols-3 gap-4">
            {data.competitors.map((competitor, i) => (
              <CompetitorCard key={competitor.name} competitor={competitor} rank={i + 1} />
            ))}
          </div>

          {/* Score card — sticky so it stays visible while scrolling cards */}
          <div className="w-56 shrink-0 sticky top-8 self-start">
            <MarketScoreCard marketScore={data.marketScore} />
          </div>
        </div>

        {onNext && (
          <button
            onClick={onNext}
            className="w-full mt-2 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-700 active:scale-[0.99] text-white font-semibold text-sm transition-all duration-150 tracking-wide"
          >
            Continue to User Personas →
          </button>
        )}

        {/* Sources — only shown when real Reddit data is present */}
        {data.sources && data.sources.length > 0 && (
          <div className="mt-6 border-t border-zinc-100 pt-5 pb-4">
            <p className="text-[9px] font-bold tracking-[0.2em] text-zinc-400 uppercase mb-3">Sources</p>
            <ul className="space-y-1.5">
              {data.sources.map((url, i) => (
                <li key={i}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-violet-500 hover:text-violet-700 hover:underline truncate block"
                  >
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-center text-zinc-300 text-xs font-light mt-2 pb-4">
          Analysis based on current competitor landscape
        </p>
      </div>
    </div>
  );
}
