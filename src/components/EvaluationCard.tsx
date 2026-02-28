import { useWizard } from '@/context/WizardContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, X, AlertTriangle, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EvaluationCard() {
  const { evaluation, setStep, setStory, story } = useWizard();

  if (!evaluation) return null;

  const passCount = evaluation.scorecard.filter(c => c.result === 'PASS').length;
  const total = evaluation.scorecard.length;
  const failures = evaluation.scorecard.filter(c => c.result === 'FAIL');

  return (
    <div className="space-y-4">
      {/* Quality Scorecard */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Quality Score</CardTitle>
            <Badge variant={evaluation.overallResult === 'PASS' ? 'default' : 'secondary'}>
              {passCount}/{total} passed
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {evaluation.scorecard.map((item, i) => (
            <div
              key={i}
              className={cn(
                'rounded-lg p-3',
                item.result === 'PASS' ? 'bg-primary/5' : 'bg-destructive/5',
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full',
                    item.result === 'PASS' ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive',
                  )}
                >
                  {item.result === 'PASS' ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <span>{item.criterion}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{item.framework}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{item.explanation}</div>
                </div>
                {item.result === 'FAIL' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                    onClick={() => setStep(2)}
                  >
                    <Pencil className="h-3 w-3" />
                    Fix
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Suggested Checklist Rule — compact inline */}
      {evaluation.newChecklistRule && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">New rule: </span>
            {evaluation.newChecklistRule.rule}
          </span>
        </div>
      )}

      {/* Epic Warning */}
      {evaluation.isLikelyEpic && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/5 px-4 py-3 text-sm text-foreground">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          This story may be too large — consider splitting it into smaller stories.
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          onClick={() => {
            setStory(evaluation.improvedStory);
            setStep(2);
          }}
          className="flex-1"
        >
          Accept Improved Version
          {failures.length > 0 && (
            <Badge variant="secondary" className="ml-2 text-[10px]">
              {failures.length} fixed
            </Badge>
          )}
        </Button>
        <Button
          variant="secondary"
          onClick={() => setStep(2)}
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
