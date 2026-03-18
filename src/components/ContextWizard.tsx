import { useState } from 'react';
import { useWizard } from '@/context/WizardContext';
import type { ProductType, Platform } from '@/services/types';
import type { ProductContextInput } from '@/types/wizard';
import { EMPTY_CONTEXT } from '@/types/wizard';
import { api } from '@/services/api';
import { usePersistedContext } from '@/hooks/usePersistedContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const DEMO_CONTEXT: ProductContextInput = {
  productName: 'DeskFlow',
  industry: 'PropTech / Workplace Management',
  productType: 'b2b',
  platform: 'both',
  userTypes: 'Employee, Office Manager, Facilities Admin',
  productDescription: 'A hot-desk and meeting room booking platform that lets hybrid teams reserve workspaces on-demand. Employees find and book available desks or rooms from a live floor map, while Office Managers configure floor plans, set booking rules, and view utilization analytics.',
  mission: 'Eliminate wasted office space and make hybrid work effortless for every team.',
  northStar: 'Weekly active bookings per employee',
  persona: 'Hybrid knowledge worker, 25-40, uses laptop and phone, splits time between home and office 2-3 days per week. Values speed and flexibility — wants to book a desk in under 10 seconds.',
  strategy: 'Mobile-first UX with real-time availability and smart suggestions. Differentiate through simplicity and instant booking versus complex enterprise facility management tools.',
  objectives: 'Launch interactive floor map, add recurring booking support, integrate with Google Calendar and Microsoft Teams, achieve 80% adoption within pilot companies.',
  acFormat: 'plain',
};

const TILE_COLORS: Record<number, string> = {
  0: 'border-primary/40 bg-accent text-accent-foreground',
  1: 'border-violet/40 bg-violet-light text-violet',
  2: 'border-indigo/40 bg-indigo-light text-indigo',
  3: 'border-rose/40 bg-rose-light text-rose',
};

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
    <div className="flex flex-wrap gap-3">
      {options.map((opt, i) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex-1 min-w-[100px] rounded-2xl border-2 p-4 text-left transition-all duration-200',
            value === opt.value
              ? cn('shadow-soft', TILE_COLORS[i % 4])
              : 'border-border bg-card hover:border-primary/20 hover:shadow-soft',
          )}
        >
          <div className="text-sm font-semibold">{opt.label}</div>
          <div className="mt-0.5 text-xs opacity-70">{opt.desc}</div>
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
  { title: 'Strategy & Goals', subtitle: 'Define your goals and how you like your stories structured.' },
];

export function ContextWizard() {
  const TOTAL_SCREENS = 3;
  const { setProductContext, setContextId, setStep } = useWizard();
  const { saveContext: saveContextToDB } = usePersistedContext();
  const [screen, setScreen] = useState(0);
  const [values, setValues] = useState<ProductContextInput>({ ...EMPTY_CONTEXT });
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ProductContextInput>(key: K, val: ProductContextInput[K]) =>
    setValues(prev => ({ ...prev, [key]: val }));

  const canProceed = () => {
    switch (screen) {
      case 0: return values.productName.trim() && values.industry.trim();
      case 1: return values.userTypes.trim() && values.productDescription.trim();
      case 2: return values.mission.trim() && values.northStar.trim() && values.persona.trim() && values.strategy.trim() && values.objectives.trim();
      default: return false;
    }
  };

  const finalize = async () => {
    setSaving(true);
    try {
      // Save to DB first
      const dbId = await saveContextToDB(values);
      // Also save via API for edge function context
      const { contextId } = await api.saveContext(values);
      setContextId(dbId || contextId);
    } catch { /* continue */ }
    setSaving(false);
    setProductContext(values);
    setStep(2);
  };

  const handleNext = () => {
    if (screen < TOTAL_SCREENS - 1) setScreen(s => s + 1);
    else finalize();
  };

  const handleBack = () => {
    if (screen > 0) setScreen(s => s - 1);
  };

  const isLast = screen === TOTAL_SCREENS - 1;
  const info = SCREEN_TITLES[screen];

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12">
      {/* Step indicator pills */}
      <div className="mb-8 flex items-center gap-3">
        {SCREEN_TITLES.map((s, i) => (
          <div
            key={i}
            className={cn(
              'flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-300',
              i === screen
                ? 'bg-primary text-primary-foreground shadow-soft'
                : i < screen
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-muted text-muted-foreground',
            )}
          >
            <span className={cn(
              'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
              i === screen ? 'bg-primary-foreground/20' : 'bg-current/10',
            )}>
              {i < screen ? '✓' : i + 1}
            </span>
            <span className="hidden sm:inline">{s.title}</span>
          </div>
        ))}
      </div>

      <Card className="w-full max-w-xl border-0 shadow-card rounded-3xl">
        <CardContent className="p-8 sm:p-10">
          <div className="mb-7 flex items-center justify-between">
            <div>
              <h2 className="mb-1 font-display text-2xl font-bold tracking-tight text-foreground">{info.title}</h2>
              <p className="text-sm text-muted-foreground">{info.subtitle}</p>
            </div>
            {screen === 0 && (
              <Button variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs shrink-0"
                onClick={() => setValues({ ...DEMO_CONTEXT })}>
                <Sparkles className="h-3.5 w-3.5" />
                Use Demo Content
              </Button>
            )}
          </div>

          {screen === 0 && (
            <div className="space-y-5">
              <FieldGroup label="Product Name">
                <Input value={values.productName} onChange={e => set('productName', e.target.value)}
                  placeholder="e.g., Acme Invoicing" autoFocus className="rounded-xl" />
              </FieldGroup>
              <FieldGroup label="Industry">
                <Input value={values.industry} onChange={e => set('industry', e.target.value)}
                  placeholder="e.g., FinTech, Healthcare, E-commerce" className="rounded-xl" />
              </FieldGroup>
              <FieldGroup label="Product Type">
                <TileSelect<ProductType> value={values.productType} onChange={v => set('productType', v)}
                  options={[
                    { value: 'b2b', label: 'B2B', desc: 'Business-to-Business' },
                    { value: 'b2c', label: 'B2C', desc: 'Business-to-Consumer' },
                    { value: 'enterprise', label: 'Enterprise', desc: 'Large organizations' },
                    { value: 'internal', label: 'Internal', desc: 'Internal tooling' },
                  ]} />
              </FieldGroup>
              <FieldGroup label="Platform">
                <TileSelect<Platform> value={values.platform} onChange={v => set('platform', v)}
                  options={[
                    { value: 'web', label: 'Web', desc: 'Browser-based' },
                    { value: 'mobile', label: 'Mobile', desc: 'iOS / Android' },
                    { value: 'desktop', label: 'Desktop', desc: 'Native desktop app' },
                    { value: 'both', label: 'Both', desc: 'Web + Mobile' },
                  ]} />
              </FieldGroup>
            </div>
          )}

          {screen === 1 && (
            <div className="space-y-5">
              <FieldGroup label="User Types">
                <Textarea value={values.userTypes} onChange={e => set('userTypes', e.target.value)}
                  placeholder="e.g., Admin, Team Member, Guest, API Consumer"
                  className="min-h-[80px] resize-none rounded-xl" autoFocus />
              </FieldGroup>
              <FieldGroup label="Product Description">
                <Textarea value={values.productDescription} onChange={e => set('productDescription', e.target.value)}
                  placeholder="Briefly describe what your product does and the problem it solves."
                  className="min-h-[80px] resize-none rounded-xl" />
              </FieldGroup>
              <FieldGroup label="Target Persona">
                <Textarea value={values.persona} onChange={e => set('persona', e.target.value)}
                  placeholder="e.g., Small business owner, 30-50, non-technical, time-constrained"
                  className="min-h-[70px] resize-none rounded-xl" />
              </FieldGroup>
              <FieldGroup label="Product Mission">
                <Textarea value={values.mission} onChange={e => set('mission', e.target.value)}
                  placeholder="e.g., Help small businesses manage invoices effortlessly"
                  className="min-h-[70px] resize-none rounded-xl" />
              </FieldGroup>
            </div>
          )}

          {screen === 2 && (
            <div className="space-y-5">
              <FieldGroup label="North Star Metric">
                <Input value={values.northStar} onChange={e => set('northStar', e.target.value)}
                  placeholder="e.g., Weekly active invoices sent" autoFocus className="rounded-xl" />
              </FieldGroup>
              <FieldGroup label="Product Strategy">
                <Textarea value={values.strategy} onChange={e => set('strategy', e.target.value)}
                  placeholder="e.g., Simplicity-first: fewer features, better UX than competitors"
                  className="min-h-[70px] resize-none rounded-xl" />
              </FieldGroup>
              <FieldGroup label="Current Objectives">
                <Textarea value={values.objectives} onChange={e => set('objectives', e.target.value)}
                  placeholder="e.g., Launch self-serve onboarding, reduce churn by 15%"
                  className="min-h-[70px] resize-none rounded-xl" />
              </FieldGroup>
              <FieldGroup label="Acceptance Criteria Format">
                <TileSelect<'plain' | 'gherkin'> value={values.acFormat} onChange={v => set('acFormat', v)}
                  options={[
                    { value: 'plain', label: 'Plain Text', desc: 'Simple bullet-point criteria' },
                    { value: 'gherkin', label: 'Gherkin', desc: 'Given / When / Then format' },
                  ]} />
              </FieldGroup>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <div>
              {screen > 0 && (
                <Button variant="ghost" size="sm" onClick={handleBack} className="text-muted-foreground rounded-xl">
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Back
                </Button>
              )}
            </div>
            <Button onClick={handleNext} disabled={!canProceed() || saving}
              className={cn('rounded-xl px-6 transition-all duration-200', canProceed() && !saving && 'shadow-soft')}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              {saving ? 'Saving...' : isLast ? 'Start Drafting' : 'Next'}
              {!saving && <ArrowRight className="ml-1.5 h-4 w-4" />}
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
              'h-2 rounded-full transition-all duration-300',
              i < screen ? 'w-2 bg-accent-foreground' : i === screen ? 'w-8 bg-primary' : 'w-2 bg-border',
            )}
          />
        ))}
      </div>
    </div>
  );
}
