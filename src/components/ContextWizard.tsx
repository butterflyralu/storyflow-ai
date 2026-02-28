import { useState } from 'react';
import { useWizard } from '@/context/WizardContext';
import type { ProductType, Platform } from '@/services/types';
import type { ProductContextInput } from '@/types/wizard';
import { EMPTY_CONTEXT } from '@/types/wizard';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

function TileSelect<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; desc: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex-1 min-w-[100px] rounded-lg border-2 p-3 text-left transition-all',
            value === opt.value
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-muted-foreground/30',
          )}
        >
          <div className="text-sm font-semibold text-foreground">{opt.label}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{opt.desc}</div>
        </button>
      ))}
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      {children}
    </div>
  );
}

const SCREEN_TITLES = [
  { title: 'Product Basics', subtitle: 'Tell us about your product so we can tailor story drafting to your context.' },
  { title: 'Users & Product', subtitle: 'Help us understand who uses your product and what it does.' },
  { title: 'Strategy & Preferences', subtitle: 'Define your goals and how you like your stories structured.' },
];

export function ContextWizard() {
  const TOTAL_SCREENS = 3;
  const { setProductContext, setContextId, setStep } = useWizard();
  const [screen, setScreen] = useState(0);
  const [values, setValues] = useState<ProductContextInput>({ ...EMPTY_CONTEXT });
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ProductContextInput>(key: K, val: ProductContextInput[K]) =>
    setValues(prev => ({ ...prev, [key]: val }));

  const canProceed = () => {
    switch (screen) {
      case 0:
        return values.productName.trim() && values.industry.trim();
      case 1:
        return values.userTypes.trim() && values.productDescription.trim();
      case 2:
        return values.mission.trim() && values.northStar.trim() && values.persona.trim() && values.strategy.trim() && values.objectives.trim();
      default:
        return false;
    }
  };

  const finalize = async () => {
    setSaving(true);
    try {
      const { contextId } = await api.saveContext(values);
      setContextId(contextId);
    } catch {
      // continue even if save fails
    }
    setSaving(false);
    setProductContext(values);
    setStep(2);
  };

  const handleNext = () => {
    if (screen < TOTAL_SCREENS - 1) {
      setScreen(s => s + 1);
    } else {
      finalize();
    }
  };

  const handleBack = () => {
    if (screen > 0) setScreen(s => s - 1);
  };

  const isLast = screen === TOTAL_SCREENS - 1;
  const info = SCREEN_TITLES[screen];

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="mb-6 text-sm font-medium text-muted-foreground">
        Step {screen + 1} of {TOTAL_SCREENS}
      </div>

      <Card className="w-full max-w-xl border-0 shadow-lg">
        <CardContent className="p-8">
          <h2 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">{info.title}</h2>
          <p className="mb-6 text-sm text-muted-foreground">{info.subtitle}</p>

          {screen === 0 && (
            <div className="space-y-5">
              <FieldGroup label="Product Name">
                <Input
                  value={values.productName}
                  onChange={e => set('productName', e.target.value)}
                  placeholder="e.g., Acme Invoicing"
                  autoFocus
                />
              </FieldGroup>

              <FieldGroup label="Industry">
                <Input
                  value={values.industry}
                  onChange={e => set('industry', e.target.value)}
                  placeholder="e.g., FinTech, Healthcare, E-commerce"
                />
              </FieldGroup>

              <FieldGroup label="Product Type">
                <TileSelect<ProductType>
                  value={values.productType}
                  onChange={v => set('productType', v)}
                  options={[
                    { value: 'b2b', label: 'B2B', desc: 'Business-to-Business' },
                    { value: 'b2c', label: 'B2C', desc: 'Business-to-Consumer' },
                    { value: 'enterprise', label: 'Enterprise', desc: 'Large organizations' },
                    { value: 'internal', label: 'Internal', desc: 'Internal tooling' },
                  ]}
                />
              </FieldGroup>

              <FieldGroup label="Platform">
                <TileSelect<Platform>
                  value={values.platform}
                  onChange={v => set('platform', v)}
                  options={[
                    { value: 'web', label: 'Web', desc: 'Browser-based' },
                    { value: 'mobile', label: 'Mobile', desc: 'iOS / Android' },
                    { value: 'both', label: 'Both', desc: 'Web + Mobile' },
                  ]}
                />
              </FieldGroup>
            </div>
          )}

          {screen === 1 && (
            <div className="space-y-5">
              <FieldGroup label="User Types">
                <Textarea
                  value={values.userTypes}
                  onChange={e => set('userTypes', e.target.value)}
                  placeholder="e.g., Admin, Team Member, Guest, API Consumer"
                  className="min-h-[80px] resize-none"
                  autoFocus
                />
              </FieldGroup>

              <FieldGroup label="Product Description">
                <Textarea
                  value={values.productDescription}
                  onChange={e => set('productDescription', e.target.value)}
                  placeholder="Briefly describe what your product does and the problem it solves."
                  className="min-h-[80px] resize-none"
                />
              </FieldGroup>

              <FieldGroup label="Target Persona">
                <Textarea
                  value={values.persona}
                  onChange={e => set('persona', e.target.value)}
                  placeholder="e.g., Small business owner, 30-50, non-technical, time-constrained"
                  className="min-h-[70px] resize-none"
                />
              </FieldGroup>

              <FieldGroup label="Product Mission">
                <Textarea
                  value={values.mission}
                  onChange={e => set('mission', e.target.value)}
                  placeholder="e.g., Help small businesses manage invoices effortlessly"
                  className="min-h-[70px] resize-none"
                />
              </FieldGroup>
            </div>
          )}

          {screen === 2 && (
            <div className="space-y-5">
              <FieldGroup label="North Star Metric">
                <Input
                  value={values.northStar}
                  onChange={e => set('northStar', e.target.value)}
                  placeholder="e.g., Weekly active invoices sent"
                  autoFocus
                />
              </FieldGroup>

              <FieldGroup label="Product Strategy">
                <Textarea
                  value={values.strategy}
                  onChange={e => set('strategy', e.target.value)}
                  placeholder="e.g., Simplicity-first: fewer features, better UX than competitors"
                  className="min-h-[70px] resize-none"
                />
              </FieldGroup>

              <FieldGroup label="Current Objectives">
                <Textarea
                  value={values.objectives}
                  onChange={e => set('objectives', e.target.value)}
                  placeholder="e.g., Launch self-serve onboarding, reduce churn by 15%"
                  className="min-h-[70px] resize-none"
                />
              </FieldGroup>

              <FieldGroup label="Acceptance Criteria Format">
                <TileSelect<'plain' | 'gherkin'>
                  value={values.acFormat}
                  onChange={v => set('acFormat', v)}
                  options={[
                    { value: 'plain', label: 'Plain Text', desc: 'Simple bullet-point criteria' },
                    { value: 'gherkin', label: 'Gherkin', desc: 'Given / When / Then format' },
                  ]}
                />
              </FieldGroup>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <div>
              {screen > 0 && (
                <Button variant="ghost" size="sm" onClick={handleBack} className="text-muted-foreground">
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
              )}
            </div>
            <Button onClick={handleNext} disabled={!canProceed() || saving}
              className={cn('transition-all duration-200', canProceed() && !saving && 'shadow-md')}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ArrowRight className="ml-1 h-4 w-4" />}
              {saving ? 'Saving...' : isLast ? 'Start Drafting' : 'Next'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress dots */}
      <div className="mt-8 flex gap-2">
        {Array.from({ length: TOTAL_SCREENS }, (_, i) => (
          <div
            key={i}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              i < screen ? 'w-1.5 bg-primary' : i === screen ? 'w-6 bg-primary' : 'w-1.5 bg-border',
            )}
          />
        ))}
      </div>
    </div>
  );
}
