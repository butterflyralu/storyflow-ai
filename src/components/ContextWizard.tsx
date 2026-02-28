import { useState } from 'react';
import { useWizard } from '@/context/WizardContext';
import { ProductContext } from '@/types/wizard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';

const FIELDS: Array<{
  key: keyof ProductContext;
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
  const { setProductContext, setStep } = useWizard();
  const [fieldIndex, setFieldIndex] = useState(0);
  const [values, setValues] = useState<ProductContext>({
    mission: '',
    northStar: '',
    persona: '',
    strategy: '',
    objectives: '',
  });

  const field = FIELDS[fieldIndex];
  const isLast = fieldIndex === FIELDS.length - 1;
  const currentValue = values[field.key];

  const handleNext = () => {
    if (isLast) {
      setProductContext(values);
      setStep(2);
    } else {
      setFieldIndex(i => i + 1);
    }
  };

  const handleSkip = () => {
    setValues(prev => ({ ...prev, [field.key]: field.defaultValue }));
    if (isLast) {
      const final = { ...values, [field.key]: field.defaultValue };
      setProductContext(final);
      setStep(2);
    } else {
      setFieldIndex(i => i + 1);
    }
  };

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="mb-6 text-sm font-medium text-muted-foreground">
        {fieldIndex + 1} of {FIELDS.length}
      </div>

      <Card className="w-full max-w-xl border-0 shadow-lg">
        <CardContent className="p-8">
          <h2 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">
            {field.label}
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">{field.helper}</p>

          <Textarea
            value={currentValue}
            onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
            placeholder={field.placeholder}
            className="min-h-[100px] resize-none text-base"
            autoFocus
          />

          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              <SkipForward className="mr-1 h-4 w-4" />
              Skip with default
            </Button>

            <Button
              onClick={handleNext}
              disabled={!currentValue.trim()}
              className={cn(
                'transition-all duration-200',
                currentValue.trim() && 'shadow-md',
              )}
            >
              {isLast ? 'Start Drafting' : 'Next'}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress dots */}
      <div className="mt-8 flex gap-2">
        {FIELDS.map((_, i) => (
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
