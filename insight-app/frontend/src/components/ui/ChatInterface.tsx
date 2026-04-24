/* ChatInterface — three structured questions, one at a time.
   Design: white card tiles on ruled notebook paper. Header has three
   levitating social icons centred above the heading, with a handwritten
   callout annotation absolutely positioned far to the right. */

import { useState, useEffect } from 'react';
import { type ChatMessage } from '../../services/api';

interface Props {
  onSubmit: (idea: string, conversation: ChatMessage[]) => void;
}

const QUESTIONS = [
  {
    number: 1,
    prompt: 'What does your product do?',
    hint: 'Describe the actual mechanism, not just the category. e.g. "It scans your receipts and auto-categorises spending before your accountant ever sees it."',
    placeholder: 'Describe what it actually does…',
  },
  {
    number: 2,
    prompt: 'What makes it different from everything else out there?',
    hint: 'The specific thing existing tools can\'t do. e.g. "You can have a real conversation with it — not just log tasks."',
    placeholder: 'What can yours do that nothing else can…',
  },
  {
    number: 3,
    prompt: 'Who is it specifically for?',
    hint: 'A specific type of person, not a broad category. e.g. "Freelancers who work alone and struggle with self-discipline."',
    placeholder: 'Describe the exact person…',
  },
];

export default function ChatInterface({ onSubmit }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(['', '', '']);
  const [input, setInput] = useState('');

  /* Gate all pen + text animations on full page load. Lazy initializer
     handles the case where the component mounts after load has already
     fired (e.g. hot-reload). The effect only registers a listener when
     the page isn't loaded yet — setState goes in the callback, not
     the effect body, satisfying react-hooks/set-state-in-effect. */
  const [pageLoaded, setPageLoaded] = useState(() => document.readyState === 'complete');
  useEffect(() => {
    if (pageLoaded) return;
    const onLoad = () => setPageLoaded(true);
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, [pageLoaded]);

  const isLast = step === QUESTIONS.length - 1;

  function handleNext() {
    const trimmed = input.trim();
    if (!trimmed) return;
    const updated = answers.map((a, i) => (i === step ? trimmed : a));
    setAnswers(updated);
    setInput('');
    if (isLast) {
      const conversation: ChatMessage[] = [
        { role: 'user',      content: updated[0] },
        { role: 'assistant', content: QUESTIONS[1].prompt },
        { role: 'user',      content: updated[1] },
        { role: 'assistant', content: QUESTIONS[2].prompt },
        { role: 'user',      content: updated[2] },
      ];
      onSubmit(updated[0], conversation);
    } else {
      setStep(s => s + 1);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleNext();
    }
  }

  return (
    <>
    <style>{`
      @keyframes levitate {
        0%, 100% { transform: translateY(0px);   box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        50%       { transform: translateY(-10px); box-shadow: 0 16px 24px rgba(0,0,0,0.13); }
      }

      /* Pen enters from upper-right (0-14%), writes line 1 (14-34%),
         jumps to line 2 (34-40%), writes it (40-63%),
         jumps to line 3 (63-69%), writes it (69-100%).
         animation-timing-function per keyframe sets linear writing and
         ease-in-out for the quick line jumps. */
      @keyframes pen-write-callout {
        0%   { transform: translateX(70px)  translateY(-20px) rotate(20deg);  opacity: 0; animation-timing-function: ease-out; }
        5%   { opacity: 1; }
        14%  { transform: translateX(0px)   translateY(0px)   rotate(-38deg); opacity: 1; animation-timing-function: linear; }
        34%  { transform: translateX(130px) translateY(0px)   rotate(-38deg); animation-timing-function: ease-in-out; }
        40%  { transform: translateX(0px)   translateY(28px)  rotate(-38deg); animation-timing-function: linear; }
        63%  { transform: translateX(155px) translateY(28px)  rotate(-38deg); animation-timing-function: ease-in-out; }
        69%  { transform: translateX(0px)   translateY(56px)  rotate(-38deg); animation-timing-function: linear; }
        100% { transform: translateX(155px) translateY(56px)  rotate(-38deg); }
      }

      /* Each line is revealed left→right in sync with the pen's horizontal
         travel for that line. */
      @keyframes reveal-line {
        from { clip-path: inset(0 100% 0 0); }
        to   { clip-path: inset(0 0%   0 0); }
      }
    `}</style>

    <div className="flex flex-col min-h-screen max-w-2xl mx-auto px-6 justify-center py-12">

      {/* ── Header ─────────────────────────────────────────────── */}
      {/* overflow: visible lets the absolutely-positioned callout spill
          past the right edge of the max-w-2xl container. */}
      <div className="pb-[28px] shrink-0 text-center relative" style={{ overflow: 'visible' }}>

        {/* Three levitating social icons — centred */}
        <div className="flex justify-center gap-5 mb-10">
          {[
            {
              label: 'X', delay: '0s',
              icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
            },
            {
              label: 'App Store', delay: '0.6s',
              icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.54 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/></svg>,
            },
            {
              label: 'Reddit', delay: '1.2s',
              icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>,
            },
          ].map(({ label, delay, icon }) => (
            <a
              key={label}
              href="#"
              aria-label={label}
              className="w-14 h-14 rounded-2xl bg-white border border-stone-200 flex items-center justify-center text-stone-500 hover:text-stone-800 hover:scale-110 transition-all duration-200"
              style={{ animation: 'levitate 3s ease-in-out infinite', animationDelay: delay }}
            >
              {icon}
            </a>
          ))}
        </div>

        {/* Handwritten callout — absolutely placed far right of the header,
            rotated slightly. The inner div is position:relative so the
            animated pen (position:absolute) is scoped to the text block
            rather than the whole page. */}
        <div
          className="absolute"
          style={{
            top: '-24px',
            right: '-240px',
            transform: 'rotate(-9deg)',
            transformOrigin: 'left top',
          }}
        >
        <div style={{ position: 'relative' }}>
          {/* Pen traces each line in order: writes line 1, jumps, writes line 2,
              jumps, writes line 3. Duration 3.5s, delay 0.3s from load. */}
          <span
            className="absolute text-zinc-500 z-10"
            style={{
              top: '4px',
              left: '0px',
              transformOrigin: 'bottom left',
              /* animation only attaches after window.load so the pen never
                 starts moving while the page is still parsing */
              animation: pageLoaded ? 'pen-write-callout 3.5s linear 0.3s both' : 'none',
              opacity: pageLoaded ? undefined : 0,
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
          </span>

          {/* Each line is timed to match the pen's travel phase:
              line 1 → delay 0.79s (0.3 + 14%×3.5), dur 0.7s (20% of 3.5s)
              line 2 → delay 1.70s (0.3 + 40%×3.5), dur 0.8s (23% of 3.5s)
              line 3 → delay 2.71s (0.3 + 69%×3.5), dur 1.1s (31% of 3.5s) */}
          {[
            { text: "let's hear what",      revealDelay: '0.79s', revealDur: '0.70s' },
            { text: 'reddit, x & facebook', revealDelay: '1.70s', revealDur: '0.81s' },
            { text: 'says about your idea', revealDelay: '2.71s', revealDur: '1.09s' },
          ].map(({ text, revealDelay, revealDur }) => (
            <div key={text} style={{ height: '28px', overflow: 'hidden' }}>
              <span
                style={{
                  fontFamily: "'Caveat', cursive",
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  color: '#57534e',
                  display: 'inline-block',
                  whiteSpace: 'nowrap',
                  lineHeight: '28px',
                  /* keep text fully clipped until page is loaded, then let
                     the reveal animation run in sync with the pen */
                  animation: pageLoaded ? `reveal-line ${revealDur} linear ${revealDelay} both` : 'none',
                  clipPath: pageLoaded ? undefined : 'inset(0 100% 0 0)',
                }}
              >
                {text}
              </span>
            </div>
          ))}
        </div>{/* /relative inner */}
        </div>{/* /absolute outer */}

        <h1 className="text-[2.5rem] font-extrabold text-zinc-900 leading-[56px] tracking-tight">
          Tell us about your idea
        </h1>
        <p className="text-zinc-400 text-sm font-light leading-[28px]">3 questions. That's it.</p>
      </div>

      {/* ── Question tiles ──────────────────────────────────────── */}
      <div className="space-y-3">
        {QUESTIONS.map((q, i) => {
          const isDone    = i < step;
          const isCurrent = i === step;

          return (
            <div
              key={i}
              className={`rounded-xl border px-5 py-4 transition-all duration-200 ${
                isCurrent ? 'bg-white border-stone-200 shadow-md shadow-stone-200/60'
                : isDone   ? 'bg-white border-stone-200 shadow-sm shadow-stone-100/40'
                : 'bg-white/70 border-stone-200 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3 mb-1">
                <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  isDone    ? 'bg-emerald-50 border border-emerald-200 text-emerald-500'
                  : isCurrent ? 'bg-amber-50 border border-amber-200 text-amber-500'
                  : 'bg-stone-100 border border-stone-200 text-stone-400'
                }`}>
                  {isDone ? '✓' : q.number}
                </span>
                <p className={`text-sm font-semibold ${
                  isCurrent ? 'text-zinc-900' : isDone ? 'text-zinc-500' : 'text-zinc-400'
                }`}>
                  {q.prompt}
                </p>
              </div>

              {isDone && (
                <p className="text-[12px] text-zinc-500 font-light ml-8 leading-snug italic">
                  {answers[i]}
                </p>
              )}

              {isCurrent && (
                <p className="text-[11px] text-zinc-400 font-light ml-8 mt-0.5 mb-3 leading-snug">
                  {q.hint}
                </p>
              )}

              {isCurrent && (
                <div className="ml-8 mt-2">
                  <div className="flex gap-3 items-end bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus-within:border-stone-300 focus-within:bg-white transition-all duration-150">
                    <textarea
                      autoFocus
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={q.placeholder}
                      rows={2}
                      className="flex-1 bg-transparent text-zinc-800 text-sm resize-none outline-none placeholder-stone-300 leading-relaxed"
                    />
                    <button
                      onClick={handleNext}
                      disabled={!input.trim()}
                      className="bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 disabled:from-stone-100 disabled:to-stone-100 disabled:text-stone-300 text-white text-sm font-semibold px-4 py-2 rounded-lg shrink-0 transition-all duration-150"
                    >
                      {isLast ? 'Analyse →' : 'Next →'}
                    </button>
                  </div>
                  <p className="text-[10px] text-stone-300 font-light mt-1.5">
                    Enter to continue · Shift+Enter for new line
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
    </>
  );
}
