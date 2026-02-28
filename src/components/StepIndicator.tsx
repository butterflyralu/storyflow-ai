import { cn } from '@/lib/utils';
import { useWizard } from '@/context/WizardContext';
import { Check } from 'lucide-react';

const STEPS = [
  { num: 1, label: 'Context' },
  { num: 2, label: 'Draft' },
  { num: 3, label: 'Finalize' },
] as const;

export function StepIndicator() {
  const { step, setStep } = useWizard();

  return (
    <div className="flex items-center justify-center gap-2 py-4 px-6">
      {STEPS.map((s, i) => {
        const isComplete = step > s.num;
        const isCurrent = step === s.num;
        const isFuture = step < s.num;

        return (
          <div key={s.num} className="flex items-center gap-2">
            <button
              onClick={() => isComplete && setStep(s.num as 1 | 2 | 3)}
              disabled={isFuture}
              className={cn(
                'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300',
                isComplete && 'bg-primary/10 text-primary cursor-pointer hover:bg-primary/20',
                isCurrent && 'bg-primary text-primary-foreground shadow-md',
                isFuture && 'bg-muted text-muted-foreground cursor-not-allowed',
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                  isComplete && 'bg-primary text-primary-foreground',
                  isCurrent && 'bg-primary-foreground text-primary',
                  isFuture && 'bg-muted-foreground/30 text-muted-foreground',
                )}
              >
                {isComplete ? <Check className="h-3.5 w-3.5" /> : s.num}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'h-px w-8 transition-colors duration-300',
                  isComplete ? 'bg-primary' : 'bg-border',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
