import { useEffect, useState } from 'react';

/* Each stage cycles every 1.8s to give the impression of active processing */
const stages = [
  'Parsing your idea...',
  'Scanning the market landscape...',
  'Identifying key competitors...',
  'Mapping user segments...',
  'Building persona profiles...',
  'Detecting opportunity gaps...',
  'Assembling your discovery engine...',
];

interface Props {
  /* Called once all stages have played through — used by App to transition to the next phase */
  onComplete?: () => void;
}

export default function LoadingScreen({ onComplete }: Props) {
  const [stageIndex, setStageIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (finished) return;

    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setStageIndex(prev => {
          const next = prev + 1;

          /* Last stage reached — mark done and fire callback */
          if (next >= stages.length) {
            setFinished(true);
            onComplete?.();
            return prev;
          }

          return next;
        });
        setVisible(true);
      }, 300);
    }, 1800);

    return () => clearInterval(interval);
  }, [finished, onComplete]);

  const progress = ((stageIndex + 1) / stages.length) * 100;

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-stone-50 gap-10">

      {/* Breathing orb — soft layered pulse, no spinning rings */}
      <div className="relative w-20 h-20 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-violet-100 animate-ping opacity-20" />
        <div className="absolute inset-1 rounded-full bg-violet-100 animate-pulse" />
        <div className="absolute inset-3 rounded-full bg-violet-200" />
        <div className="absolute inset-5 rounded-full bg-violet-500 flex items-center justify-center">
          <span className="text-white text-xs">◆</span>
        </div>
      </div>

      {/* Text block */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Analysing your idea</h2>
        <p
          className="text-zinc-400 text-sm font-light h-5 transition-opacity duration-300"
          style={{ opacity: visible ? 1 : 0 }}
        >
          {stages[stageIndex]}
        </p>
      </div>

      {/* Thin progress track */}
      <div className="w-44 h-0.5 bg-zinc-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-violet-500 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step counter */}
      <p className="text-zinc-300 text-xs font-light tracking-wide">
        {stageIndex + 1} / {stages.length}
      </p>
    </div>
  );
}
