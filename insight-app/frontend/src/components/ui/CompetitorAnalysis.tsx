/* CompetitorAnalysis — directly consumes the backend /analyse response shape.
   No mapping layer — uses Competitor and AnalyseResult from api.ts verbatim.
   Fields previously discarded by toCompetitorData() (dominant_complaint,
   pricing, status_signal, mention_count) are now surfaced in the UI.
   platform_split field is retained in the type but not used for display. */

import { useState } from 'react';
import { type Competitor, type AnalyseResult, type NicheEvaluation } from '../../services/api';

interface Props {
  data: AnalyseResult;
  ideaSummary?: string;
  onNext?: () => void;
  onBack?: () => void;
}

/* ── Colour helpers ──────────────────────────────────────────────────── */

/* Colour shifts red (near-clone) → amber (overlapping) → emerald (adjacent).
   Applied to the similarity badge, fill bar, and left accent border of each card. */
function similarityStyle(score: number) {
  if (score >= 75) return { badge: 'bg-red-50 text-red-500 border-red-200',        bar: 'bg-red-400',     leftBorder: 'border-l-red-300'     };
  if (score >= 50) return { badge: 'bg-amber-50 text-amber-500 border-amber-200',  bar: 'bg-amber-400',   leftBorder: 'border-l-amber-300'   };
  return             { badge: 'bg-emerald-50 text-emerald-600 border-emerald-200', bar: 'bg-emerald-400', leftBorder: 'border-l-emerald-300' };
}

/* Maps backend status_signal string to display tokens.
   "dead" = Graveyard category, "declining" = churn language dominant,
   "active" = default. Anything else is treated as active. */
const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  active:   { label: 'Active',    dot: 'bg-emerald-400', text: 'text-emerald-600' },
  declining: { label: 'Declining', dot: 'bg-amber-400',   text: 'text-amber-500'  },
  dead:     { label: 'Dead',      dot: 'bg-zinc-300',    text: 'text-zinc-400'   },
};

/* Maps backend pricing string to display tokens.
   Backend values: "free" | "paid" | "freemium" | "unknown". */
const PRICING_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  free:     { label: 'Free',     bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  paid:     { label: 'Paid',     bg: 'bg-zinc-100',   text: 'text-zinc-500',   border: 'border-zinc-200'   },
  freemium: { label: 'Freemium', bg: 'bg-violet-50',  text: 'text-violet-600', border: 'border-violet-200' },
  unknown:  { label: '?',        bg: 'bg-zinc-50',    text: 'text-zinc-400',   border: 'border-zinc-100'   },
};


/* ── Niche & Audience Fit box ────────────────────────────────────────── */

/*
 * Answers a different question from the Market Assessment box below.
 * Market Assessment = are users happy with existing tools in general?
 * Niche Evaluation  = do ANY of these tools actually serve the specific
 *                     audience this idea targets, or are they all generic?
 *
 * A high niche_score (7–10) means competitors are generic household tools
 * repurposed for this audience — nobody has built for them specifically.
 * Suggestions are anchored on the audience's real context (curriculum,
 * age group, workflow) — not generic product advice.
 */
function NicheEvaluationBox({ evaluation }: { evaluation: NicheEvaluation }) {
  return (
    <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm mb-6 overflow-hidden">

      <div className="px-6 py-6 space-y-6">

        {/* ── Target Audience ── */}
        <div>
          <p className="text-xs font-semibold tracking-widest text-zinc-400 uppercase mb-2">
            Target Audience
          </p>
          <p className="text-sm font-bold text-zinc-900 leading-snug">{evaluation.audience}</p>
        </div>

        <div className="h-px bg-zinc-100" />

        {/* ── Why Competitors Miss This Audience ── */}
        <div>
          <p className="text-xs font-semibold tracking-widest text-zinc-400 uppercase mb-2">
            Why Competitors Miss This
          </p>
          <p className="text-sm text-zinc-600 leading-relaxed">{evaluation.gap_summary}</p>
        </div>

        <div className="h-px bg-zinc-100" />

        {/* ── How to Go Deeper on the Niche ── */}
        <div>
          <p className="text-xs font-semibold tracking-widest text-zinc-400 uppercase mb-3">
            How to Go Deeper on the Niche
          </p>
          <div className="flex flex-col gap-3">
            {evaluation.suggestions.map((s, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center text-[10px] font-bold text-violet-500 shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-zinc-700 leading-snug">{s}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}


/* ── Market Assessment box ───────────────────────────────────────────── */

/*
 * Qualitative market read derived from competitor data — no score number shown.
 *
 * Logic reads the actual competitor mix (categories, similarity scores, gaps) and
 * produces analyst-style verdicts rather than formula outputs. Three questions:
 *   1. What does the competitive landscape actually look like?
 *   2. Is the problem solved — specifically for this niche?
 *   3. Where is the untaken gap?
 *
 * "Is It Solved?" is anchored on directCount (are there apps doing the same thing?)
 * and avgSimilarity (how close is the closest?) — not on a sentiment score formula.
 * This prevents contradictions between "What Exists" and "Is It Solved?".
 *
 * Receives competitors and differentiators directly from AnalyseResult — no wrapping object.
 */
function EvaluationStatement({ competitors, differentiators }: { competitors: Competitor[]; differentiators: string[] }) {
  const sorted  = [...competitors].sort((a, b) => (b.similarity_score ?? 0) - (a.similarity_score ?? 0));
  const top     = sorted[0];
  const second  = sorted[1];
  const total   = competitors.length;

  /* "Direct" category or high feature overlap (≥75%) counts as direct competition.
     Backend also uses "Substitute" / "Graveyard" / "Mechanism analog" — none of those
     count as Direct because they solve the problem via a fundamentally different mechanism. */
  const directCount   = competitors.filter(c => c.category === 'Direct' || (c.similarity_score ?? 0) >= 75).length;
  const avgSimilarity = total > 0
    ? Math.round(competitors.reduce((sum, c) => sum + (c.similarity_score ?? 0), 0) / total)
    : 0;

  /* Strip a leading "<AppName> [is ]" prefix the LLM sometimes bakes into descriptions.
     Without this, templates like "${name} ${asClause(desc)}" double-print the name:
     "Lumosity is lumosity is a brain training app". The regex is case-insensitive and
     handles both "Lumosity is a..." and "Lumosity a..." forms. */
  const stripName = (desc: string, name: string) =>
    desc.trim().replace(new RegExp(`^${name}\\s+(is\\s+)?`, 'i'), '');

  const topDesc = stripName(top?.description  ?? '', top?.name  ?? '');
  const topLim0 = top?.weaknesses[0] ?? '';
  const topLim1 = top?.weaknesses[1] ?? '';
  const secDesc = stripName(second?.description ?? '', second?.name ?? '');
  const secLim0 = second?.weaknesses[0] ?? '';

  /* Lowercases a description and ensures it reads as a clause after a subject.
     Only skips "is" when the description already leads with "is" — all other forms
     (including "a/an X") get "is" prepended so "It an X" never occurs. */
  const asClause = (desc: string) => {
    const d = desc.trim().replace(/\.$/, '').toLowerCase();
    return d.startsWith('is ') ? d : `is ${d}`;
  };

  /* ── What Exists ── */
  const whatExists = (() => {
    if (total === 0)
      return [
        'No apps found competing directly in this space.',
        'The market may be early-stage, or the niche is specific enough that no established player has moved here yet.',
        'That is either a wide-open opportunity or a signal to validate demand before building.',
      ];
    if (directCount === 0 && avgSimilarity < 35)
      return [
        `${total} app${total !== 1 ? 's' : ''} exist in this problem space, but none are building what you are.`,
        `${top?.name} ${asClause(topDesc)}. ${second ? `${second.name} ${asClause(secDesc)}.` : ''} Different mechanisms, different core capabilities.`,
        `Average feature overlap across all ${total} tools is ${avgSimilarity}%. That is substitute or adjacent territory, not direct competition.`,
      ];
    if (directCount === 0 && avgSimilarity >= 35)
      return [
        `${total} apps overlap meaningfully with your idea at an average of ${avgSimilarity}% feature match.`,
        `${top?.name} (${top?.similarity_score ?? 0}%) ${asClause(topDesc)}. ${second ? `${second.name} (${second.similarity_score ?? 0}%) ${asClause(secDesc)}.` : ''} They address the same end problem, but through a different mechanism.`,
        'Demand is validated. No one has built the specific solution yet. That is the opening.',
      ];
    if (directCount === 1)
      return [
        `${total} apps are in this space. ${top?.name} is the one to watch at ${top?.similarity_score ?? 0}% feature overlap. It ${asClause(topDesc)}.`,
        `The remaining ${total - 1} take different approaches. ${second ? `${second.name} ${asClause(secDesc)}.` : 'Adjacent tooling users reach for in the absence of a better option.'}`,
        'It is not crowded, but it is not empty. Study that player closely. Their ceiling is your entry point.',
      ];
    return [
      `${total} apps compete here. ${top?.name} (${top?.similarity_score ?? 0}%) and ${second?.name ?? 'others'} (${second?.similarity_score ?? 'unknown'}%) are the closest to what you are building.`,
      `${top?.name} ${asClause(topDesc)}. ${second ? `${second.name} ${asClause(secDesc)}.` : ''} The market is active and aware of this problem.`,
      'This is a contested space. Winning means owning a specific sub-niche and executing sharper than what already exists.',
    ];
  })();

  /* ── Is It Solved? ── */
  type Verdict = { dot: string; headline: string; lines: string[] };
  const verdict: Verdict = (() => {
    if (directCount === 0 && avgSimilarity < 40)
      return {
        dot: 'bg-emerald-400',
        headline: 'No, not the way you are building it',
        lines: [
          `The closest existing tool is ${top?.name} at ${top?.similarity_score ?? 0}%. It ${asClause(topDesc)}. That is a fundamentally different capability from what you are building.`,
          `${top?.name}'s core gap: ${topLim0}. ${second ? `${second.name} (${second.similarity_score ?? 0}%) has the same ceiling: ${secLim0}.` : ''} Neither comes close to your specific mechanism.`,
          'No existing product has productized this mechanism. Users are either cobbling workarounds together or going without. That is the opportunity.',
        ],
      };
    if (directCount === 0 && avgSimilarity >= 40)
      return {
        dot: 'bg-amber-400',
        headline: 'Not quite. The problem is recognised but your mechanism is not built yet',
        lines: [
          `${top?.name} (${top?.similarity_score ?? 0}%) comes closest. It ${asClause(topDesc)}, but stops short of the specific capability you are building.`,
          `Its core limit: ${topLim0}. ${second ? `${second.name} (${second.similarity_score ?? 0}%) runs into the same wall: ${secLim0}.` : ''} The pattern repeats across every tool in the space.`,
          'Users settle for these not because they are satisfied, but because nothing better exists. That is the gap you are entering.',
        ],
      };
    if (directCount > 0 && avgSimilarity < 70)
      return {
        dot: 'bg-amber-400',
        headline: 'Contested. One tool is close, but real gaps remain',
        lines: [
          `${top?.name} (${top?.similarity_score ?? 0}%) is genuinely close. It ${asClause(topDesc)} and has real traction. But its structural limit: ${topLim0}.`,
          `${topLim1 ? `Also: ${topLim1}.` : ''} ${second ? `${second.name} (${second.similarity_score ?? 0}%) has the same constraints: ${secLim0}.` : ''} These are not feature gaps. They are ceiling limits baked into how these products are built.`,
          'The users who are frustrated by those limits are your earliest adopters. Build explicitly for them first.',
        ],
      };
    return {
      dot: 'bg-red-400',
      headline: 'Yes. Strong direct competition is already in place',
      lines: [
        `${top?.name} (${top?.similarity_score ?? 0}%) already covers this. It ${asClause(topDesc)} with real users and real traction. This is not an empty space.`,
        `What they do well: ${top?.strengths[0] ?? 'established user base'} and ${top?.strengths[1] ?? 'market presence'}. Competing head-on means fighting that directly.`,
        `The narrow path in: ${topLim0} is the structural gap ${top?.name} cannot close. Own that sub-niche completely before broadening.`,
      ],
    };
  })();

  return (
    <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm mb-10 overflow-hidden">

      {/* Header strip */}
      <div className="px-6 pt-5 pb-4 border-b border-zinc-100">
        <p className="text-xs font-bold tracking-widest text-violet-500 uppercase">
          Market Assessment
        </p>
      </div>

      <div className="px-6 py-6 space-y-6">

        {/* ── What Exists ── */}
        <div>
          <p className="text-xs font-semibold tracking-widest text-zinc-400 uppercase mb-3">
            What Exists
          </p>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-zinc-800 leading-snug">
              {whatExists[0]}
            </p>
            {whatExists.slice(1).map((line, i) => (
              <p key={i} className="text-sm text-zinc-500 leading-relaxed">
                {line}
              </p>
            ))}
          </div>
        </div>

        <div className="h-px bg-zinc-100" />

        {/* ── Is It Solved? ── */}
        <div>
          <p className="text-xs font-semibold tracking-widest text-zinc-400 uppercase mb-3">
            Is It Solved?
          </p>
          <div className="flex items-start gap-3">
            <span className={`w-2 h-2 rounded-full shrink-0 mt-[5px] ${verdict.dot}`} />
            <div className="space-y-2">
              <p className="text-sm font-bold text-zinc-900 leading-snug">
                {verdict.headline}
              </p>
              {verdict.lines.map((line, i) => (
                <p key={i} className="text-sm text-zinc-500 leading-relaxed">
                  {line}
                </p>
              ))}
            </div>
          </div>
        </div>

        <div className="h-px bg-zinc-100" />

        {/* ── Your Gap ── */}
        <div>
          <p className="text-xs font-semibold tracking-widest text-zinc-400 uppercase mb-3">
            Your Gap
          </p>
          <div className="flex flex-col gap-3">
            {differentiators.map((d, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center text-[10px] font-bold text-violet-500 shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-zinc-700 leading-snug">{d}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}


/* ── Competitor card — fixed width for horizontal rows ───────────────── */

/* w-[252px] h-[340px] is set on the perspective wrapper and both faces fill it
   with h-full — this is the single source of truth for tile size. Content that
   exceeds the fixed height is clamped (line-clamp) rather than stretching the card.
   The flip mechanism mirrors PersonaCard: perspective → grid-stacked faces →
   rotateY(180deg) on group-hover. */
function CompetitorCard({ competitor, rank }: { competitor: Competitor; rank: number }) {
  const score      = competitor.similarity_score ?? 0;
  const style      = similarityStyle(score);
  const statusCfg  = competitor.status_signal ? (STATUS_CONFIG[competitor.status_signal] ?? STATUS_CONFIG.active) : null;
  const pricingKey = (competitor.pricing ?? 'unknown').toLowerCase();
  const pricingCfg = PRICING_CONFIG[pricingKey] ?? PRICING_CONFIG.unknown;

  /* Avatar colour follows similarity — gives an instant at-a-glance read
     on the front face before the user flips the card. */
  const avatarColor = score >= 75
    ? 'bg-red-50 text-red-500'
    : score >= 50
      ? 'bg-amber-50 text-amber-600'
      : 'bg-emerald-50 text-emerald-600';

  return (
    /* Perspective wrapper — w and h locked here; both faces fill it with h-full */
    <div className="[perspective:1000px] group cursor-pointer w-[252px] h-[340px]">

      {/* Flipper — grid stacks front & back in the same cell */}
      <div className="grid h-full [transform-style:preserve-3d] transition-[transform] duration-700 ease-in-out group-hover:[transform:rotateY(180deg)]">

        {/* ── FRONT — name and comparison score only ── */}
        <div className="[grid-area:1/1] h-full [backface-visibility:hidden] bg-white rounded-xl shadow-sm border border-zinc-100 group-hover:border-violet-200 flex flex-col items-center justify-center px-6 py-8 text-center gap-3">

          {/* Rank avatar — colour-coded by similarity score */}
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold ${avatarColor}`}>
            {rank}
          </div>

          <div>
            <p className="text-lg font-extrabold text-zinc-900 leading-tight">{competitor.name}</p>
            <p className="text-xs text-zinc-400 font-light mt-1">{competitor.category ?? 'Competitor'}</p>
          </div>

          {/* Similarity score badge — the only data point shown on the front */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${style.badge}`}>
            <span className="text-base font-black">{score}%</span>
            <span className="text-xs text-zinc-400">match</span>
          </div>

          <p className="text-[10px] text-zinc-300 font-light">hover to explore</p>
        </div>

        {/* ── BACK — full detail, rotated 180° to start hidden ── */}
        <div className={`[grid-area:1/1] h-full [backface-visibility:hidden] [transform:rotateY(180deg)] bg-white rounded-xl shadow-md border border-zinc-100 border-l-[3px] ${style.leftBorder} flex flex-col overflow-hidden`}>

          {/* Header */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${avatarColor}`}>
                {rank}
              </span>
              <h3 className="text-sm font-bold text-zinc-900 leading-tight truncate flex-1">{competitor.name}</h3>
              {statusCfg && (
                <div className="flex items-center gap-1 shrink-0">
                  <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                  <span className={`text-[10px] font-semibold ${statusCfg.text}`}>{statusCfg.label}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-zinc-400 leading-snug line-clamp-2 mb-2.5">
              {competitor.description}
            </p>

            {/* Similarity bar */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-1 bg-zinc-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${score}%` }} />
              </div>
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${style.badge}`}>
                {score}%
              </span>
            </div>

            {/* Pricing + category + mention count */}
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${pricingCfg.bg} ${pricingCfg.text} ${pricingCfg.border}`}>
                {pricingCfg.label}
              </span>
              <p className="text-xs text-zinc-400">{competitor.category ?? 'Competitor'}</p>
              {competitor.mention_count != null && (
                <p className="text-[10px] text-zinc-300 ml-auto">{competitor.mention_count} mentions</p>
              )}
            </div>
          </div>

          {/* Strengths + weaknesses — overflow-hidden prevents content from
              escaping the fixed card height; line-clamp keeps items compact */}
          <div className="border-t border-zinc-100 px-4 py-3 flex-1 overflow-hidden space-y-2.5">
            <div>
              <p className="text-[9px] font-bold tracking-widest text-zinc-400 uppercase mb-1">Strengths</p>
              <ul className="space-y-0.5">
                {competitor.strengths.slice(0, 2).map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-600 leading-snug">
                    <span className="text-emerald-500 font-bold shrink-0">✓</span>
                    <span className="line-clamp-1">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[9px] font-bold tracking-widest text-zinc-400 uppercase mb-1">Weaknesses</p>
              <ul className="space-y-0.5">
                {competitor.weaknesses.slice(0, 2).map((w, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-600 leading-snug">
                    <span className="text-red-400 font-bold shrink-0">✕</span>
                    <span className="line-clamp-1">{w}</span>
                  </li>
                ))}
              </ul>
            </div>

            {competitor.dominant_complaint && (
              <div className="border-t border-zinc-100 pt-2">
                <p className="text-[9px] font-bold tracking-widest text-zinc-400 uppercase mb-0.5">Top Complaint</p>
                <p className="text-xs text-zinc-500 italic leading-snug line-clamp-2">"{competitor.dominant_complaint}"</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}


/* ── Competitors carousel — left/right arrow navigation ─────────────── */

/* Shows CARDS_PER_PAGE tiles at once. Prev/Next buttons step one card at a time.
   Buttons are disabled at the boundaries so the user always knows the edges. */
const CARDS_PER_PAGE = 4;

function CompetitorsRow({ competitors }: { competitors: Competitor[] }) {
  const [index, setIndex] = useState(0);
  if (competitors.length === 0) return null;

  const canPrev = index > 0;
  const canNext = index + CARDS_PER_PAGE < competitors.length;
  const visible = competitors.slice(index, index + CARDS_PER_PAGE);

  return (
    <div className="mb-10">

      {/* Title + arrow buttons on the same row */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-extrabold text-zinc-900 tracking-tight">Here is your competition</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIndex(i => i - 1)}
            disabled={!canPrev}
            className="w-9 h-9 rounded-full border border-zinc-200 bg-white flex items-center justify-center text-zinc-500 hover:bg-zinc-50 hover:border-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
          >
            ←
          </button>
          <span className="text-xs text-zinc-400 font-light tabular-nums">
            {index + 1}–{Math.min(index + CARDS_PER_PAGE, competitors.length)} of {competitors.length}
          </span>
          <button
            onClick={() => setIndex(i => i + 1)}
            disabled={!canNext}
            className="w-9 h-9 rounded-full border border-zinc-200 bg-white flex items-center justify-center text-zinc-500 hover:bg-zinc-50 hover:border-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
          >
            →
          </button>
        </div>
      </div>

      {/* Tile row — fixed slots, no overflow scroll */}
      <div className="flex gap-4">
        {visible.map((competitor, i) => (
          <CompetitorCard key={competitor.name} competitor={competitor} rank={index + i + 1} />
        ))}
      </div>

    </div>
  );
}


/* ── Main component ─────────────────────────────────────────────────── */

export default function CompetitorAnalysis({ data, onNext, onBack }: Props) {

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-8 py-10">

        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-600 text-sm font-medium mb-6 transition-colors duration-150"
          >
            ← Back
          </button>
        )}

        {/* Page header */}
        <div className="mb-8">
          <p className="text-xs font-bold tracking-[0.25em] text-violet-500 uppercase mb-4">◆ Insight</p>
          <h1 className="text-[2.6rem] font-extrabold text-zinc-900 leading-tight tracking-tight">
            Competitor Landscape
          </h1>
          <p className="text-zinc-400 mt-2 text-sm font-light">
            {data.competitors.length} solutions mapped across Reddit and App Store.
          </p>
        </div>

        {/* Niche fit — audience-specific gap */}
        {data.niche_evaluation && (
          <>
            <h2 className="text-lg font-extrabold text-zinc-900 tracking-tight mb-4">Here are my thoughts on your idea</h2>
            <NicheEvaluationBox evaluation={data.niche_evaluation} />
          </>
        )}

        {/* Competitor tiles — below niche fit, above market assessment */}
        <CompetitorsRow competitors={data.competitors} />

        {/* Evaluation statement — verdict + score + edge */}
        <EvaluationStatement competitors={data.competitors} differentiators={data.differentiators} />

        {onNext && (
          <button
            onClick={onNext}
            className="w-full mt-2 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-700 active:scale-[0.99] text-white font-semibold text-sm transition-all duration-150 tracking-wide"
          >
            Continue to User Personas →
          </button>
        )}

        {/* Sources — only shown when real scraping data is present */}
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
