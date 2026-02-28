import { useState } from 'react';
import { useWizard } from '@/context/WizardContext';
import type { ContextField } from '@/services/types';
import type { ProductContextInput } from '@/types/wizard';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, SkipForward, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const FIELDS: Array<{
  key: ContextField;
  label: string;
  helper: string;
  placeholder: string;
  defaultValue: string;
}> = [
  {
    key: 'mission',
    label: 'Product Mission',
    helper: 'What is the core purpose of your product? What problem does it solve?',
    placeholder: 'e.g., Help small businesses manage invoices effortlessly',
    defaultValue: 'Help users accomplish their goals faster and with less friction',
  },
  {
    key: 'northStar',
    label: 'North Star Metric',
    helper: 'What single metric best captures the value your product delivers?',
    placeholder: 'e.g., Weekly active invoices sent',
    defaultValue: 'Weekly active users completing core workflows',
  },
  {
    key: 'persona',
    label: 'Target Persona',
    helper: 'Describe your primary user — their role, goals, and pain points.',
    placeholder: 'e.g., Small business owner, 30-50, non-technical, time-constrained',
    defaultValue: 'A busy professional who values speed and simplicity',
  },
  {
    key: 'strategy',
    label: 'Product Strategy',
    helper: 'How does your product win? What\'s the competitive approach?',
    placeholder: 'e.g., Simplicity-first: fewer features, better UX than competitors',
    defaultValue: 'Deliver a delightful, simple experience that reduces cognitive load',
  },
  {
    key: 'objectives',
    label: 'Current Objectives',
    helper: 'What are you focused on this quarter or sprint?',
    placeholder: 'e.g., Launch self-serve onboarding, reduce churn by 15%',
    defaultValue: 'Improve core user experience and increase engagement',
  },
];

export function ContextWizard() {
  const TOTAL_STEPS = FIELDS.length + 1; // +1 for AC format step
  const { setProductContext, setContextId, setStep } = useWizard();
  const [fieldIndex, setFieldIndex] = useState(0);
  const [values, setValues] = useState<ProductContextInput>({
    mission: '',
    northStar: '',
    persona: '',
    strategy: '',
    objectives: '',
    acFormat: 'plain',
  });
  const [validating, setValidating] = useState(false);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isOnAcStep = fieldIndex === FIELDS.length;
  const field = isOnAcStep ? null : FIELDS[fieldIndex];
  const isLast = isOnAcStep;
  const currentValue = field ? values[field.key] : '';

  const validateAndNext = async (valueToUse: string) => {
    if (!field) return;
    const updatedValues = { ...values, [field.key]: valueToUse };
    setValues(updatedValues);

    setValidating(true);
    setValidationMsg(null);
    try {
      const result = await api.validateContext({
        field: field.key,
        value: valueToUse,
        allContext: updatedValues,
      });
      if (!result.pass) {
        setValidationMsg(result.reason);
        setValidating(false);
        return;
      }
    } catch {
      // Continue on validation error
    }
    setValidating(false);
    setFieldIndex(i => i + 1);
    setValidationMsg(null);
  };

  const finalize = async () => {
    setSaving(true);
    try {
      const { contextId } = await api.saveContext(values);
      setContextId(contextId);
    } catch {
      // continue even if save fails in mock mode
    }
    setSaving(false);
    setProductContext(values);
    setStep(2);
  };

  const handleNext = () => validateAndNext(currentValue);
  const handleSkip = () => field ? validateAndNext(field.defaultValue) : undefined;

  const busy = validating || saving;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="mb-6 text-sm font-medium text-muted-foreground">
        {fieldIndex + 1} of {TOTAL_STEPS}
      </div>

      <Card className="w-full max-w-xl border-0 shadow-lg">
        <CardContent className="p-8">
          {isOnAcStep ? (
            <>
              <h2 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">
                Acceptance Criteria Format
              </h2>
              <p className="mb-6 text-sm text-muted-foreground">
                How should acceptance criteria be written in your stories?
              </p>
              <div className="flex gap-3">
                {([
                  { value: 'plain' as const, label: 'Plain Text', desc: 'Simple bullet-point criteria' },
                  { value: 'gherkin' as const, label: 'Gherkin', desc: 'Given / When / Then format' },
                ]).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setValues(prev => ({ ...prev, acFormat: opt.value }))}
                    className={cn(
                      'flex-1 rounded-lg border-2 p-4 text-left transition-all',
                      values.acFormat === opt.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/30',
                    )}
                  >
                    <div className="text-sm font-semibold text-foreground">{opt.label}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{opt.desc}</div>
                  </button>
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <Button onClick={finalize} disabled={busy} className={cn('transition-all duration-200', !busy && 'shadow-md')}>
                  {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ArrowRight className="ml-1 h-4 w-4" />}
                  {saving ? 'Saving...' : 'Start Drafting'}
                </Button>
              </div>
            </>
          ) : (
            <>
              <h2 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">
                {field!.label}
              </h2>
              <p className="mb-6 text-sm text-muted-foreground">{field!.helper}</p>

              <Textarea
                value={currentValue}
                onChange={e => {
                  setValues(prev => ({ ...prev, [field!.key]: e.target.value }));
                  setValidationMsg(null);
                }}
                placeholder={field!.placeholder}
                className="min-h-[100px] resize-none text-base"
                autoFocus
              />

              {validationMsg && (
                <div className="mt-2 flex items-center gap-1.5 text-sm text-destructive">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {validationMsg}
                </div>
              )}

              <div className="mt-6 flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={handleSkip} disabled={busy} className="text-muted-foreground">
                  <SkipForward className="mr-1 h-4 w-4" />
                  Skip with default
                </Button>
                <Button onClick={handleNext} disabled={!currentValue.trim() || busy}
                  className={cn('transition-all duration-200', currentValue.trim() && !busy && 'shadow-md')}>
                  {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ArrowRight className="ml-1 h-4 w-4" />}
                  Next
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Progress dots */}
      <div className="mt-8 flex gap-2">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div
            key={i}
            className={cn(
              'h-2 w-2 rounded-full transition-all duration-300',
              i < fieldIndex ? 'bg-primary' : i === fieldIndex ? 'bg-primary w-6' : 'bg-border',
            )}
          />
        ))}
      </div>
    </div>
  );
}
