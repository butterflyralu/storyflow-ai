import { useWizard } from '@/context/WizardContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, X, Lightbulb, ArrowRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EvaluationCard() {
  const { evaluation, setStep, setStory, story } = useWizard();

  if (!evaluation) return null;

  const passCount = evaluation.scorecard.filter(c => c.result === 'PASS').length;
  const total = evaluation.scorecard.length;

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
                'flex items-center gap-3 rounded-lg p-3',
                item.result === 'PASS' ? 'bg-primary/5' : 'bg-destructive/5',
              )}
            >
              <div
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full',
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
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Learning Insight */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="h-4 w-4 text-primary" />
            Learning Insight
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-foreground">{evaluation.learningInsight.observation}</p>
          <p className="text-sm text-muted-foreground italic">{evaluation.learningInsight.question}</p>
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm text-foreground">
            <ArrowRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
            <span>{evaluation.learningInsight.suggestion}</span>
          </div>
        </CardContent>
      </Card>

      {/* New Checklist Rule */}
      {evaluation.newChecklistRule && (
        <Card className="border-0 shadow-lg border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
              <div>
                <div className="font-medium text-foreground">Suggested Checklist Rule</div>
                <p className="mt-1 text-muted-foreground">{evaluation.newChecklistRule.rule}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Epic Warning */}
      {evaluation.isLikelyEpic && (
        <Card className="border-0 shadow-lg bg-destructive/5">
          <CardContent className="flex items-center gap-2 p-4 text-sm text-foreground">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            This story may be too large — consider splitting it into smaller stories.
          </CardContent>
        </Card>
      )}

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
