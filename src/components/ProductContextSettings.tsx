import { useState } from 'react';
import { useWizard } from '@/context/WizardContext';
import { usePersistedContext } from '@/hooks/usePersistedContext';
import type { ProductType, Platform } from '@/services/types';
import type { ProductContextInput } from '@/types/wizard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Loader2, Save, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const TILE_COLORS: Record<number, string> = {
  0: 'border-primary/40 bg-accent text-accent-foreground',
  1: 'border-violet/40 bg-violet-light text-violet',
  2: 'border-indigo/40 bg-indigo-light text-indigo',
  3: 'border-rose/40 bg-rose-light text-rose',
};

function TileSelect<T extends string>({
  value, onChange, options,
}: {
  value: T; onChange: (v: T) => void;
  options: { value: T; label: string; desc: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {options.map((opt, i) => (
        <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
          className={cn(
            'flex-1 min-w-[100px] rounded-2xl border-2 p-4 text-left transition-all duration-200',
            value === opt.value
              ? cn('shadow-soft', TILE_COLORS[i % 4])
              : 'border-border bg-card hover:border-primary/20 hover:shadow-soft',
          )}>
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

export function ProductContextSettings() {
  const { productContext, setProductContext, contextId, setStep } = useWizard();
  const { updateContext, saveContext: saveNewContext } = usePersistedContext();
  const { toast } = useToast();
  const [values, setValues] = useState<ProductContextInput>({ ...productContext });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof ProductContextInput>(key: K, val: ProductContextInput[K]) =>
    setValues(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    let success = false;
    if (contextId) {
      success = await updateContext(contextId, values);
    } else {
      const id = await saveNewContext(values);
      success = !!id;
    }
    setSaving(false);
    if (success) {
      setProductContext(values);
      setSaved(true);
      toast({ title: 'Context saved', description: 'Your product context has been updated.' });
      setTimeout(() => setSaved(false), 2000);
    } else {
      toast({ title: 'Save failed', description: 'Could not save context. Please try again.', variant: 'destructive' });
    }
  };

  return (
    <div className="flex flex-col items-center px-4 py-8">
      <Card className="w-full max-w-2xl border-0 shadow-card rounded-3xl">
        <CardContent className="p-8 sm:p-10">
          <div className="mb-7 flex items-center justify-between">
            <div>
              <h2 className="mb-1 font-display text-2xl font-bold tracking-tight text-foreground">Product Context</h2>
              <p className="text-sm text-muted-foreground">Edit your product context settings. Changes apply to new stories.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStep(4)} className="rounded-xl gap-1.5 text-xs shrink-0">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Chat
            </Button>
          </div>

          <div className="space-y-5">
            <FieldGroup label="Product Name">
              <Input value={values.productName} onChange={e => set('productName', e.target.value)}
                placeholder="e.g., Acme Invoicing" className="rounded-xl" />
            </FieldGroup>

            <FieldGroup label="Industry">
              <Input value={values.industry} onChange={e => set('industry', e.target.value)}
                placeholder="e.g., FinTech, Healthcare" className="rounded-xl" />
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

            <FieldGroup label="User Types">
              <Textarea value={values.userTypes} onChange={e => set('userTypes', e.target.value)}
                placeholder="e.g., Admin, Team Member, Guest"
                className="min-h-[80px] resize-none rounded-xl" />
            </FieldGroup>

            <FieldGroup label="Product Description">
              <Textarea value={values.productDescription} onChange={e => set('productDescription', e.target.value)}
                placeholder="What your product does and the problem it solves."
                className="min-h-[80px] resize-none rounded-xl" />
            </FieldGroup>

            <FieldGroup label="Target Persona">
              <Textarea value={values.persona} onChange={e => set('persona', e.target.value)}
                placeholder="e.g., Small business owner, 30-50, non-technical"
                className="min-h-[70px] resize-none rounded-xl" />
            </FieldGroup>

            <FieldGroup label="Product Mission">
              <Textarea value={values.mission} onChange={e => set('mission', e.target.value)}
                placeholder="e.g., Help small businesses manage invoices effortlessly"
                className="min-h-[70px] resize-none rounded-xl" />
            </FieldGroup>

            <FieldGroup label="North Star Metric">
              <Input value={values.northStar} onChange={e => set('northStar', e.target.value)}
                placeholder="e.g., Weekly active invoices sent" className="rounded-xl" />
            </FieldGroup>

            <FieldGroup label="Product Strategy">
              <Textarea value={values.strategy} onChange={e => set('strategy', e.target.value)}
                placeholder="e.g., Simplicity-first: fewer features, better UX"
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

          <div className="mt-8 flex justify-end">
            <Button onClick={handleSave} disabled={saving || !values.productName.trim()}
              className={cn('rounded-xl px-6 gap-2 transition-all duration-200', !saving && 'shadow-soft')}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
