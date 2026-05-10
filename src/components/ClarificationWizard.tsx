import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, ChevronLeft, Check, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ClarificationQuestion {
  id: string;
  question: string;
  options?: { label: string }[] | null;
  allowFreeText?: boolean;
}

interface Props {
  questions: ClarificationQuestion[];
  initialAnswers?: Record<string, string>;
  initialIndex?: number;
  completed?: boolean;
  onComplete: (answers: Record<string, string>, skippedAll: boolean) => void;
  onStateChange?: (state: { answers: Record<string, string>; currentIndex: number; completed: boolean }) => void;
}

export function ClarificationWizard({
  questions,
  initialAnswers = {},
  initialIndex = 0,
  completed = false,
  onComplete,
  onStateChange,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [index, setIndex] = useState(initialIndex);
  const [freeText, setFreeText] = useState('');
  const [isCompleted, setIsCompleted] = useState(completed);

  const total = questions.length;
  const current = questions[index];

  const persist = (next: { answers: Record<string, string>; currentIndex: number; completed: boolean }) => {
    onStateChange?.(next);
  };

  const submitAnswer = (value: string) => {
    const newAnswers = { ...answers, [current.id]: value };
    setAnswers(newAnswers);
    setFreeText('');
    if (index + 1 >= total) {
      setIsCompleted(true);
      persist({ answers: newAnswers, currentIndex: index, completed: true });
      onComplete(newAnswers, false);
    } else {
      const nextIdx = index + 1;
      setIndex(nextIdx);
      persist({ answers: newAnswers, currentIndex: nextIdx, completed: false });
    }
  };

  const skipQuestion = () => {
    submitAnswer('(skipped)');
  };

  const skipAll = () => {
    setIsCompleted(true);
    persist({ answers, currentIndex: index, completed: true });
    onComplete(answers, true);
  };

  const goBack = () => {
    if (index === 0) return;
    const prevIdx = index - 1;
    setIndex(prevIdx);
    setFreeText(answers[questions[prevIdx].id] === '(skipped)' ? '' : answers[questions[prevIdx].id] || '');
    persist({ answers, currentIndex: prevIdx, completed: false });
  };

  if (isCompleted) {
    const answered = Object.entries(answers).filter(([, v]) => v && v !== '(skipped)');
    return (
      <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
          <Check className="h-3.5 w-3.5" />
          {answered.length} of {total} clarifications captured
        </div>
        {answered.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {answered.map(([id, val]) => {
              const q = questions.find(q => q.id === id);
              return (
                <li key={id} className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{q?.question}</span>
                  <br />
                  <span className="italic">→ {val}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  const progress = ((index + 1) / total) * 100;

  return (
    <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-card p-4 shadow-card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          Clarifying questions
        </div>
        <div className="text-[11px] font-medium text-muted-foreground">
          Step {index + 1} of {total}
        </div>
      </div>

      <div className="mb-3 h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="mb-3 text-sm font-medium text-foreground leading-snug">
        {current.question}
      </p>

      {current.options && current.options.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {current.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => submitAnswer(opt.label)}
              className={cn(
                'rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground',
                'hover:bg-accent hover:border-primary/50 transition-colors',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {(current.allowFreeText !== false) && (
        <div className="mb-3">
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && freeText.trim()) {
                e.preventDefault();
                submitAnswer(freeText.trim());
              }
            }}
            placeholder="Or type your answer…"
            rows={2}
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {freeText.trim() && (
            <Button
              size="sm"
              className="mt-2 h-7 text-xs"
              onClick={() => submitAnswer(freeText.trim())}
            >
              Submit answer
            </Button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs gap-1"
          onClick={goBack}
          disabled={index === 0}
        >
          <ChevronLeft className="h-3 w-3" />
          Back
        </Button>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={skipQuestion}>
            <SkipForward className="h-3 w-3" />
            Skip this
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={skipAll}>
            Skip & draft
          </Button>
        </div>
      </div>
    </div>
  );
}
