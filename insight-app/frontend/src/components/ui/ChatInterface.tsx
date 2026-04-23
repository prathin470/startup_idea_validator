/* ChatInterface — three structured questions, one at a time.
   Replaces the freeform chatbot. Each answer is locked in before proceeding
   so the analysis pipeline always receives the three inputs it needs:
   what the product does, what makes it different, and who it's for. */

import { useState } from 'react';
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
  const [step, setStep] = useState(0);   // 0-indexed, 0–2
  const [answers, setAnswers] = useState(['', '', '']);
  const [input, setInput] = useState('');

  const isLast = step === QUESTIONS.length - 1;

  function handleNext() {
    const trimmed = input.trim();
    if (!trimmed) return;

    const updated = answers.map((a, i) => (i === step ? trimmed : a));
    setAnswers(updated);
    setInput('');

    if (isLast) {
      /* Build a synthetic conversation from the 3 Q&A pairs.
         The backend query builder reads this as a structured conversation — each
         question/answer pair makes the differentiator and target user explicit
         so the scraping pipeline generates precise, feature-specific queries. */
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
    <div className="flex flex-col min-h-screen max-w-2xl mx-auto px-6 justify-center py-12">

      <div className="pb-5 shrink-0">
        <p className="text-xs font-bold tracking-[0.25em] text-violet-500 uppercase mb-4">◆ Insight</p>
        <h1 className="text-[2.6rem] font-extrabold text-zinc-900 leading-tight tracking-tight">
          Tell us about your idea
        </h1>
        <p className="text-zinc-400 mt-2 text-sm font-light">3 questions. That's it.</p>
      </div>

      {/* Purple wrapper box — encloses all three question cards as a single visual unit.
          The violet border + tinted background signals this is one cohesive form,
          not three independent components. */}
      <div className="border-2 border-violet-200 bg-violet-50/30 rounded-2xl p-5 shadow-md shadow-violet-100/50">
        <div className="space-y-4">

        {QUESTIONS.map((q, i) => {
          const isDone    = i < step;
          const isCurrent = i === step;

          return (
            <div key={i} className={`rounded-xl border px-5 py-4 transition-all duration-200 ${
              isCurrent ? 'bg-white border-violet-200 shadow-sm shadow-violet-100/60'
              : isDone   ? 'bg-zinc-50 border-zinc-100'
              : 'bg-zinc-50/50 border-zinc-100 opacity-40'   /* pending */
            }`}>

              {/* Question header row */}
              <div className="flex items-center gap-3 mb-1">
                <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  isDone    ? 'bg-emerald-50 border border-emerald-200 text-emerald-500'
                  : isCurrent ? 'bg-violet-50 border border-violet-200 text-violet-500'
                  : 'bg-zinc-100 border border-zinc-200 text-zinc-400'
                }`}>
                  {isDone ? '✓' : q.number}
                </span>
                <p className={`text-sm font-semibold ${isCurrent ? 'text-zinc-900' : isDone ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {q.prompt}
                </p>
              </div>

              {/* Answered summary */}
              {isDone && (
                <p className="text-[12px] text-zinc-500 font-light ml-8 leading-snug">
                  {answers[i]}
                </p>
              )}

              {/* Hint text — only on current */}
              {isCurrent && (
                <p className="text-[11px] text-zinc-400 font-light ml-8 mt-0.5 mb-3 leading-snug">
                  {q.hint}
                </p>
              )}

              {/* Input — only on current step */}
              {isCurrent && (
                <div className="ml-8 mt-2">
                  <div className="flex gap-3 items-end bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 focus-within:border-violet-300 focus-within:bg-white focus-within:shadow-sm transition-all duration-150">
                    <textarea
                      autoFocus
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={q.placeholder}
                      rows={2}
                      className="flex-1 bg-transparent text-zinc-800 text-sm resize-none outline-none placeholder-zinc-300 leading-relaxed"
                    />
                    <button
                      onClick={handleNext}
                      disabled={!input.trim()}
                      className="bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-100 disabled:text-zinc-300 text-white text-sm font-semibold px-4 py-2 rounded-lg shrink-0 transition-colors duration-150"
                    >
                      {isLast ? 'Analyse →' : 'Next →'}
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-300 font-light mt-1.5">
                    Enter to continue · Shift+Enter for new line
                  </p>
                </div>
              )}
            </div>
          );
        })}
        </div>
      </div>

    </div>
  );
}
