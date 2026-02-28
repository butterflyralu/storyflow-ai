import { useWizard } from '@/context/WizardContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, X, Lightbulb, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EvaluationCard() {
  const { evaluation, setStep, setStory, story } = useWizard();

  if (!evaluation) return null;

  const passCount = evaluation.qualityChecks.filter(c => c.passed).length;
  const total = evaluation.qualityChecks.length;

  return (
    <div className="space-y-4">
      {/* Quality Checks */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Quality Score</CardTitle>
            <Badge variant={passCount === total ? 'default' : 'secondary'}>
              {passCount}/{total} passed
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {evaluation.qualityChecks.map(check => (
            <div
              key={check.label}
              className={cn(
                'flex items-center gap-3 rounded-lg p-3',
                check.passed ? 'bg-primary/5' : 'bg-destructive/5',
              )}
            >
              <div
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full',
                  check.passed ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive',
                )}
              >
                {check.passed ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground">{check.label}</div>
                <div className="text-xs text-muted-foreground">{check.detail}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Suggestions */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="h-4 w-4 text-primary" />
            Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {evaluation.suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <ArrowRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Learnings */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">💡 Learnings</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {evaluation.learnings.map((l, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-primary">•</span>
                <span>{l}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          onClick={() => {
            setStory(evaluation.improvedStory);
            setStep(4);
          }}
          className="flex-1"
        >
          Accept Improved Version
        </Button>
        <Button
          variant="secondary"
          onClick={() => setStep(4)}
          className="flex-1"
        >
          Keep Original
        </Button>
        <Button
          variant="outline"
          onClick={() => setStep(2)}
          className="flex-1"
        >
          Continue Editing
        </Button>
      </div>
    </div>
  );
}
