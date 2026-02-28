import { useState } from 'react';
import { useWizard } from '@/context/WizardContext';
import type { ProductType, Platform } from '@/services/types';
import type { ProductContextInput } from '@/types/wizard';
import { EMPTY_CONTEXT } from '@/types/wizard';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, ArrowLeft, SkipForward, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type StepType = 'text' | 'textarea' | 'tiles';

interface WizardStepDef {
  key: string;
  label: string;
  helper: string;
  placeholder?: string;
  defaultValue?: string;
  type: StepType;
  options?: { value: string; label: string; desc: string }[];
  validatable?: boolean; // whether to run API validation
}

const STEPS: WizardStepDef[] = [
  {
    key: 'productName',
    label: 'Product Name',
    helper: 'What is your product called?',
    placeholder: 'e.g., Acme Invoicing',
    type: 'text',
  },
  {
    key: 'industry',
    label: 'Industry',
    helper: 'What industry does your product serve?',
    placeholder: 'e.g., FinTech, Healthcare, E-commerce, Education',
    type: 'text',
  },
  {
    key: 'productType',
    label: 'Product Type',
    helper: 'Who is your product built for?',
    type: 'tiles',
    options: [
      { value: 'b2b', label: 'B2B', desc: 'Business-to-Business' },
      { value: 'b2c', label: 'B2C', desc: 'Business-to-Consumer' },
      { value: 'enterprise', label: 'Enterprise', desc: 'Large organizations' },
      { value: 'internal', label: 'Internal', desc: 'Internal tooling' },
    ],
  },
  {
    key: 'platform',
    label: 'Platform',
    helper: 'What platform does your product run on?',
    type: 'tiles',
    options: [
      { value: 'web', label: 'Web', desc: 'Browser-based application' },
      { value: 'mobile', label: 'Mobile', desc: 'iOS and/or Android' },
      { value: 'both', label: 'Both', desc: 'Web and Mobile' },
    ],
  },
  {
    key: 'userTypes',
    label: 'User Types',
    helper: 'Who are the different types of users? List the key roles.',
    placeholder: 'e.g., Admin, Team Member, Guest, API Consumer',
    type: 'textarea',
  },
  {
    key: 'productDescription',
    label: 'Product Description',
    helper: 'Briefly describe what your product does and the problem it solves.',
    placeholder: 'e.g., A platform that helps small businesses send and track invoices with automated reminders.',
    type: 'textarea',
  },
  {
    key: 'mission',
    label: 'Product Mission',
    helper: 'What is the core purpose of your product? What problem does it solve?',
    placeholder: 'e.g., Help small businesses manage invoices effortlessly',
    defaultValue: 'Help users accomplish their goals faster and with less friction',
    type: 'textarea',
    validatable: true,
  },
  {
    key: 'northStar',
    label: 'North Star Metric',
    helper: 'What single metric best captures the value your product delivers?',
    placeholder: 'e.g., Weekly active invoices sent',
    defaultValue: 'Weekly active users completing core workflows',
    type: 'textarea',
    validatable: true,
  },
  {
    key: 'persona',
    label: 'Target Persona',
    helper: 'Describe your primary user — their role, goals, and pain points.',
    placeholder: 'e.g., Small business owner, 30-50, non-technical, time-constrained',
    defaultValue: 'A busy professional who values speed and simplicity',
    type: 'textarea',
    validatable: true,
  },
  {
    key: 'strategy',
    label: 'Product Strategy',
    helper: "How does your product win? What's the competitive approach?",
    placeholder: 'e.g., Simplicity-first: fewer features, better UX than competitors',
    defaultValue: 'Deliver a delightful, simple experience that reduces cognitive load',
    type: 'textarea',
    validatable: true,
  },
  {
    key: 'objectives',
    label: 'Current Objectives',
    helper: 'What are you focused on this quarter or sprint?',
    placeholder: 'e.g., Launch self-serve onboarding, reduce churn by 15%',
    defaultValue: 'Improve core user experience and increase engagement',
    type: 'textarea',
    validatable: true,
  },
  {
    key: 'acFormat',
    label: 'Acceptance Criteria Format',
    helper: 'How should acceptance criteria be written in your stories?',
    type: 'tiles',
    options: [
      { value: 'plain', label: 'Plain Text', desc: 'Simple bullet-point criteria' },
      { value: 'gherkin', label: 'Gherkin', desc: 'Given / When / Then format' },
    ],
  },
];

const CONTEXT_FIELD_KEYS = ['mission', 'northStar', 'persona', 'strategy', 'objectives'];

export function ContextWizard() {
  const TOTAL_STEPS = STEPS.length;
  const { setProductContext, setContextId, setStep } = useWizard();
  const [stepIndex, setStepIndex] = useState(0);
  const [values, setValues] = useState<ProductContextInput>({ ...EMPTY_CONTEXT });
  const [validating, setValidating] = useState(false);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === TOTAL_STEPS - 1;
  const currentValue = (values as any)[step.key] || '';

  const goNext = () => {
    setStepIndex(i => i + 1);
    setValidationMsg(null);
  };

  const goBack = () => {
    if (stepIndex > 0) {
      setStepIndex(i => i - 1);
      setValidationMsg(null);
    }
  };

  const validateAndNext = async (valueToUse: string) => {
    const updatedValues = { ...values, [step.key]: valueToUse };
    setValues(updatedValues);

    // Only run API validation on context fields
    if (step.validatable && CONTEXT_FIELD_KEYS.includes(step.key)) {
      setValidating(true);
      setValidationMsg(null);
      try {
        const result = await api.validateContext({
          field: step.key as any,
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
    }

    if (isLast) {
      finalize(updatedValues);
    } else {
      goNext();
    }
  };

  const finalize = async (finalValues: ProductContextInput) => {
    setSaving(true);
    try {
      const { contextId } = await api.saveContext(finalValues);
      setContextId(contextId);
    } catch {
      // continue even if save fails
    }
    setSaving(false);
    setProductContext(finalValues);
    setStep(2);
  };

  const handleNext = () => {
    if (step.type === 'tiles') {
      if (isLast) {
        finalize(values);
      } else {
        goNext();
      }
    } else {
      validateAndNext(currentValue);
    }
  };

  const handleSkip = () => {
    if (step.defaultValue) {
      validateAndNext(step.defaultValue);
    } else {
      // For non-validatable fields, just move on
      if (isLast) {
        finalize(values);
      } else {
        goNext();
      }
    }
  };

  const busy = validating || saving;

  const canProceed = () => {
    if (step.type === 'tiles') return true;
    return currentValue.trim().length > 0;
  };

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="mb-6 text-sm font-medium text-muted-foreground">
        {stepIndex + 1} of {TOTAL_STEPS}
      </div>

      <Card className="w-full max-w-xl border-0 shadow-lg">
        <CardContent className="p-8">
          <h2 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">
            {step.label}
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">{step.helper}</p>

          {step.type === 'tiles' && step.options && (
            <div className="flex flex-wrap gap-3">
              {step.options.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setValues(prev => ({ ...prev, [step.key]: opt.value } as any))}
                  className={cn(
                    'flex-1 min-w-[120px] rounded-lg border-2 p-4 text-left transition-all',
                    currentValue === opt.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/30',
                  )}
                >
                  <div className="text-sm font-semibold text-foreground">{opt.label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{opt.desc}</div>
                </button>
              ))}
            </div>
          )}

          {step.type === 'text' && (
            <Input
              value={currentValue}
              onChange={e => {
                setValues(prev => ({ ...prev, [step.key]: e.target.value } as any));
                setValidationMsg(null);
              }}
              placeholder={step.placeholder}
              className="text-base"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && canProceed() && !busy && handleNext()}
            />
          )}

          {step.type === 'textarea' && (
            <Textarea
              value={currentValue}
              onChange={e => {
                setValues(prev => ({ ...prev, [step.key]: e.target.value } as any));
                setValidationMsg(null);
              }}
              placeholder={step.placeholder}
              className="min-h-[100px] resize-none text-base"
              autoFocus
            />
          )}

          {validationMsg && (
            <div className="mt-2 flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              {validationMsg}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {stepIndex > 0 && (
                <Button variant="ghost" size="sm" onClick={goBack} disabled={busy} className="text-muted-foreground">
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
              )}
              {step.defaultValue && (
                <Button variant="ghost" size="sm" onClick={handleSkip} disabled={busy} className="text-muted-foreground">
                  <SkipForward className="mr-1 h-4 w-4" />
                  Skip
                </Button>
              )}
              {!step.defaultValue && step.type !== 'tiles' && (
                <Button variant="ghost" size="sm" onClick={handleSkip} disabled={busy} className="text-muted-foreground">
                  <SkipForward className="mr-1 h-4 w-4" />
                  Skip
                </Button>
              )}
            </div>
            <Button onClick={handleNext} disabled={!canProceed() || busy}
              className={cn('transition-all duration-200', canProceed() && !busy && 'shadow-md')}>
              {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ArrowRight className="ml-1 h-4 w-4" />}
              {saving ? 'Saving...' : isLast ? 'Start Drafting' : 'Next'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress dots */}
      <div className="mt-8 flex gap-1.5">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div
            key={i}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              i < stepIndex ? 'w-1.5 bg-primary' : i === stepIndex ? 'w-5 bg-primary' : 'w-1.5 bg-border',
            )}
          />
        ))}
      </div>
    </div>
  );
}
