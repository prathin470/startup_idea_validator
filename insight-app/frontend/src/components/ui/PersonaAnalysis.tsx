import { useState, useRef, useEffect } from 'react';
import { chat, type ChatMessage } from '../../services/api';
import { useAsyncError } from '../../hooks';

/* ── Types ───────────────────────────────────────────────────────────── */

export interface PersonaFeeling {
  emoji: string;
  label: string;
}

export interface JourneyStep {
  title: string;
  description: string;
  painPoint: string;
}

export interface Persona {
  id: string;
  name: string;
  age: number;
  role: string;
  context: string;
  redditSource: string;
  commentary: string;
  thoughts: string;
  feelings: PersonaFeeling[];
  ideaScore: number;
  journeySteps: JourneyStep[];
}

export interface PersonaData {
  personas: Persona[];
  exclusivityMatrix: number[][];
}

interface Props {
  data: PersonaData;
  onBack?: () => void;
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

const AVATAR_COLORS = [
  'bg-violet-100 text-violet-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-sky-100 text-sky-700',
  'bg-rose-100 text-rose-700',
];

function ideaScoreColor(score: number) {
  if (score >= 8.5) return 'text-emerald-500';
  if (score >= 6.5) return 'text-amber-500';
  return 'text-zinc-400';
}

function exclusivityCellStyle(score: number) {
  if (score >= 71) return 'bg-emerald-50 text-emerald-700';
  if (score >= 41) return 'bg-amber-50 text-amber-700';
  return 'bg-red-50 text-red-500';
}

/* ── Persona card (flip on hover) ───────────────────────────────────── */

function PersonaCard({
  persona,
  colorClass,
  onViewJourney,
  onChat,
}: {
  persona: Persona;
  colorClass: string;
  onViewJourney: () => void;
  onChat: () => void;
}) {
  const initials = persona.name.split(' ').map(n => n[0]).join('');

  return (
    /* Perspective wrapper — fixed height keeps all tiles uniform across the grid */
    <div className="[perspective:1000px] group cursor-pointer h-[340px]">

      {/* Flipper — h-full fills the fixed height; both faces fill it too */}
      <div className="grid h-full [transform-style:preserve-3d] transition-[transform] duration-700 ease-in-out group-hover:[transform:rotateY(180deg)]">

        {/* ── FRONT — name, age, role only ── */}
        <div className="[grid-area:1/1] h-full [backface-visibility:hidden] bg-white rounded-xl shadow-sm border border-zinc-100 group-hover:border-violet-200 flex flex-col items-center justify-center px-6 py-8 text-center gap-3">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold ${colorClass}`}>
            {initials}
          </div>
          <div>
            <p className="text-lg font-extrabold text-zinc-900 leading-tight">{persona.name}</p>
            <p className="text-xs text-zinc-400 font-light mt-1">{persona.age} · {persona.role}</p>
          </div>
          {/* Feeling labels as a subtle hint there's more */}
          <div className="flex flex-wrap gap-1.5 mt-1 justify-center">
            {persona.feelings.map((f, i) => (
              <span key={i} className="text-[10px] text-zinc-400 font-light border border-zinc-200 rounded-full px-2 py-0.5">{f.label}</span>
            ))}
          </div>
        </div>

        {/* ── BACK — full detail card, rotated 180° to start hidden ── */}
        <div className="[grid-area:1/1] h-full [backface-visibility:hidden] [transform:rotateY(180deg)] bg-white rounded-xl shadow-md border border-violet-200 flex flex-col overflow-hidden">

          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center gap-2.5 mb-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${colorClass}`}>
                {initials}
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-900 leading-tight">{persona.name}</p>
                <p className="text-[11px] text-zinc-400 font-light">{persona.age} · {persona.role}</p>
              </div>
            </div>

            <span className="text-[10px] font-medium text-zinc-400 bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded-full">
              {persona.redditSource}
            </span>

            <p className="text-[11px] text-zinc-500 font-light italic leading-snug mt-3 line-clamp-3">
              {persona.commentary}
            </p>
          </div>

          <div className="px-4 pb-3 flex flex-wrap gap-1.5">
            {persona.feelings.map((f, i) => (
              <span key={i} className="text-[10px] bg-zinc-50 border border-zinc-200 rounded-full px-2 py-0.5 text-zinc-600">
                {f.label}
              </span>
            ))}
          </div>

          <div className="border-t border-zinc-100 px-4 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[9px] font-bold tracking-[0.15em] text-zinc-400 uppercase">Idea helps them</p>
              <p className={`text-sm font-extrabold ${ideaScoreColor(persona.ideaScore)}`}>
                {persona.ideaScore.toFixed(1)}
              </p>
            </div>
            <div className="w-full h-1 bg-zinc-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-violet-500" style={{ width: `${persona.ideaScore * 10}%` }} />
            </div>
          </div>

          <div className="px-4 pb-4 flex gap-2 mt-auto">
            <button
              onClick={e => { e.stopPropagation(); onViewJourney(); }}
              className="flex-1 text-[11px] font-semibold text-violet-600 bg-violet-50 border border-violet-100 px-3 py-1.5 rounded-lg hover:bg-violet-100 transition-colors"
            >
              View Journey
            </button>
            <button
              onClick={e => { e.stopPropagation(); onChat(); }}
              className="flex-1 text-[11px] font-semibold text-zinc-600 bg-zinc-50 border border-zinc-200 px-3 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
            >
              Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Source progress tracker ────────────────────────────────────────── */

type SourceStatus = 'done' | 'active' | 'pending';

const SOURCES: { name: string; status: SourceStatus }[] = [
  { name: 'Twitter',  status: 'done'   },
  { name: 'LinkedIn', status: 'done'   },
  { name: 'Reddit',   status: 'done'   },
  { name: 'Forums',   status: 'active' },
];

function SourceProgressTracker() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-zinc-100 px-5 py-6">
      <p className="text-[9px] font-bold tracking-[0.2em] text-zinc-400 uppercase mb-1">Data Sources</p>
      <p className="text-[10px] text-zinc-400 font-light mb-5">Research pipeline</p>

      <div className="relative">
        {/* Vertical connecting line — sits behind the dots */}
        <div className="absolute left-[8px] top-2 bottom-2 w-px bg-zinc-200" />

        <div className="space-y-5">
          {SOURCES.map((source, i) => {
            const s: SourceStatus = source.status;
            return (
              <div key={i} className="flex items-center gap-3 relative">

                {/* Milestone dot */}
                <div className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 z-10 bg-white ${
                  s === 'done'   ? 'border-violet-500 bg-violet-500' :
                  s === 'active' ? 'border-violet-400'               :
                                   'border-zinc-300'
                }`}>
                  {s === 'done'   && <span className="text-white text-[9px] font-bold leading-none">✓</span>}
                  {s === 'active' && <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />}
                </div>

                {/* Label */}
                <div>
                  <p className={`text-xs font-semibold leading-tight ${
                    s === 'pending' ? 'text-zinc-300' : 'text-zinc-700'
                  }`}>
                    {source.name}
                  </p>
                  <p className={`text-[10px] font-light mt-0.5 ${
                    s === 'done'    ? 'text-emerald-500' :
                    s === 'active'  ? 'text-violet-400'  :
                                     'text-zinc-300'
                  }`}>
                    {s === 'done' ? 'Complete' : s === 'active' ? 'Scraping...' : 'Queued'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Exclusivity matrix ──────────────────────────────────────────────── */

function ExclusivityMatrix({ personas, matrix }: { personas: Persona[]; matrix: number[][] }) {
  const initials = personas.map(p => p.name.split(' ')[0].slice(0, 2));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-zinc-100 px-5 py-6">
      <p className="text-[9px] font-bold tracking-[0.2em] text-zinc-400 uppercase mb-1">Persona Overlap</p>
      <p className="text-[10px] text-zinc-400 font-light mb-4">How distinct each pair is</p>

      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-1 text-center text-[9px] font-bold">
          <thead>
            <tr>
              <td className="w-5" />
              {initials.map((init, i) => (
                <td key={i} className="w-7 text-zinc-400">{init}</td>
              ))}
            </tr>
          </thead>
          <tbody>
            {personas.map((_, row) => (
              <tr key={row}>
                <td className="text-zinc-400 text-right pr-1">{initials[row]}</td>
                {personas.map((_, col) => (
                  <td key={col}>
                    {row === col
                      ? <div className="w-7 h-7 rounded bg-zinc-100" />
                      : <div className={`w-7 h-7 rounded flex items-center justify-center ${exclusivityCellStyle(matrix[row][col])}`}>
                          {matrix[row][col]}
                        </div>
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 space-y-1.5">
        {[
          { color: 'bg-emerald-100', label: 'Distinct (71–100)' },
          { color: 'bg-amber-100',   label: 'Overlapping (41–70)' },
          { color: 'bg-red-100',     label: 'Very similar (0–40)' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2 text-[9px] text-zinc-400">
            <div className={`w-3 h-3 rounded-sm shrink-0 ${color}`} /> {label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Journey modal (centered overlay) ───────────────────────────────── */

function JourneyModal({ persona, colorClass, onClose }: { persona: Persona; colorClass: string; onClose: () => void }) {
  /* Close on Escape key */
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    /* Backdrop — click outside modal to close */
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-8"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${colorClass}`}>
              {persona.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-900">{persona.name}'s Current Process</p>
              <p className="text-[11px] text-zinc-400 font-light">{persona.role} · {persona.redditSource}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Journey steps — horizontal scroll */}
        <div className="px-6 py-6 overflow-x-auto">
          <div className="flex items-stretch gap-0 min-w-max">
            {persona.journeySteps.map((step, i) => (
              <div key={i} className="flex items-stretch shrink-0">
                <div className="w-48 flex flex-col rounded-xl border border-zinc-100 overflow-hidden">
                  <div className="px-4 pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <p className="text-xs font-bold text-zinc-800 leading-tight">{step.title}</p>
                    </div>
                    <p className="text-[10px] text-zinc-500 font-light leading-snug">{step.description}</p>
                  </div>
                  <div className="mt-auto bg-red-50 border-t border-red-100 px-4 py-3">
                    <p className="text-[9px] font-bold text-red-400 uppercase tracking-[0.1em] mb-0.5">Pain</p>
                    <p className="text-[10px] text-red-500 leading-snug">{step.painPoint}</p>
                  </div>
                </div>

                {i < persona.journeySteps.length - 1 && (
                  <div className="flex items-center px-3 text-zinc-300 text-base self-center shrink-0">→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Chat popup (fixed bottom-right corner) ─────────────────────────── */

function ChatPopup({ persona, colorClass, onClose }: { persona: Persona; colorClass: string; onClose: () => void }) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const { handler: sendChat, isLoading, error } = useAsyncError(chat);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  async function sendMessage() {
    if (!input.trim() || isLoading) return;
    const userText = input.trim();
    setInput('');

    const updatedMessages = [...messages, { role: 'user' as const, content: userText }];
    setMessages(updatedMessages);

    /* Persona context is prepended on every call but never stored in state —
       keeps the UI clean while keeping the model in character */
    const apiMessages: ChatMessage[] = [
      {
        role: 'user',
        content: `You are roleplaying as ${persona.name}, ${persona.age}, ${persona.role}. Context: ${persona.context}. Their honest take on current tools: "${persona.thoughts}". Stay in character, respond in first person, be specific and authentic to their frustrations.`,
      },
      {
        role: 'assistant',
        content: `I'm ${persona.name}. What would you like to know?`,
      },
      ...updatedMessages,
    ];

    const response = await sendChat(apiMessages);
    if (response) setMessages(prev => [...prev, { role: 'assistant', content: response }]);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 flex flex-col bg-white rounded-2xl shadow-2xl border border-zinc-200 z-50 overflow-hidden" style={{ height: '460px' }}>

      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b border-zinc-100`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${colorClass}`}>
            {persona.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <p className="text-xs font-bold text-zinc-900">{persona.name}</p>
            <p className="text-[10px] text-zinc-400 font-light">{persona.role}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-400 text-xs transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 px-4 py-3">
        {messages.length === 0 && (
          <p className="text-zinc-300 text-[11px] text-center pt-8 leading-relaxed">
            Ask {persona.name.split(' ')[0]} about their<br />day-to-day challenges
          </p>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] text-[11px] leading-relaxed whitespace-pre-wrap px-3 py-2 rounded-xl
              ${msg.role === 'user'
                ? 'bg-violet-600 text-white rounded-br-sm'
                : 'bg-zinc-50 text-zinc-700 border border-zinc-100 rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-zinc-50 border border-zinc-100 px-3 py-2 rounded-xl rounded-bl-sm">
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-500 text-[10px] px-3 py-2 rounded-xl">
            Backend offline — start the FastAPI server on port 8000.
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-zinc-100 px-3 py-3 flex gap-2 items-end">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Ask ${persona.name.split(' ')[0]}...`}
          rows={2}
          className="flex-1 bg-transparent text-zinc-800 text-[11px] resize-none outline-none placeholder-zinc-300 leading-relaxed"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || isLoading}
          className="bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-100 disabled:text-zinc-300 text-white text-[11px] font-semibold px-3 py-2 rounded-lg shrink-0 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────── */

export default function PersonaAnalysis({ data, onBack }: Props) {
  const [journeyPersonaId, setJourneyPersonaId] = useState<string | null>(null);
  const [chatPersonaId, setChatPersonaId]       = useState<string | null>(null);

  const journeyPersona = data.personas.find(p => p.id === journeyPersonaId) ?? null;
  const journeyIndex   = data.personas.findIndex(p => p.id === journeyPersonaId);
  const chatPersona    = data.personas.find(p => p.id === chatPersonaId) ?? null;
  const chatIndex      = data.personas.findIndex(p => p.id === chatPersonaId);

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-6xl mx-auto px-8 py-10">

        {/* Header */}
        <div className="mb-8">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-700 font-medium mb-5 transition-colors duration-150"
            >
              ← Back to Competitor Landscape
            </button>
          )}
          <p className="text-xs font-bold tracking-[0.25em] text-violet-500 uppercase mb-4">◆ Insight</p>
          <h1 className="text-[2.6rem] font-extrabold text-zinc-900 leading-tight tracking-tight">User Personas</h1>
          <p className="text-zinc-400 mt-2 text-sm font-light">
            {data.personas.length} distinct personas identified from Reddit research. Click any card to explore.
          </p>
        </div>

        {/* Cards + exclusivity matrix */}
        <div className="flex gap-5 items-start">
          <div className="flex-1 grid grid-cols-3 gap-4">
            {data.personas.map((persona, i) => (
              <PersonaCard
                key={persona.id}
                persona={persona}
                colorClass={AVATAR_COLORS[i % AVATAR_COLORS.length]}
                onViewJourney={() => setJourneyPersonaId(persona.id)}
                onChat={() => setChatPersonaId(persona.id)}
              />
            ))}
          </div>

          <div className="w-56 shrink-0 sticky top-8 self-start space-y-4">
            <ExclusivityMatrix personas={data.personas} matrix={data.exclusivityMatrix} />
            <SourceProgressTracker />
          </div>
        </div>

        <p className="text-center text-zinc-300 text-xs font-light mt-8 pb-4">
          Personas derived from Reddit community insights
        </p>
      </div>

      {/* Journey modal — centered overlay, click backdrop or press Esc to close */}
      {journeyPersona && (
        <JourneyModal
          persona={journeyPersona}
          colorClass={AVATAR_COLORS[journeyIndex % AVATAR_COLORS.length]}
          onClose={() => setJourneyPersonaId(null)}
        />
      )}

      {/* Chat popup — fixed bottom-right corner */}
      {chatPersona && (
        <ChatPopup
          persona={chatPersona}
          colorClass={AVATAR_COLORS[chatIndex % AVATAR_COLORS.length]}
          onClose={() => setChatPersonaId(null)}
        />
      )}
    </div>
  );
}
