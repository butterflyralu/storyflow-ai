import { useState } from 'react';
import { useWizard } from '@/context/WizardContext';
import { StepIndicator } from '@/components/StepIndicator';
import { ContextWizard } from '@/components/ContextWizard';
import { ChatPanel } from '@/components/ChatPanel';
import { StoryPreview } from '@/components/StoryPreview';
import { EvaluationCard } from '@/components/EvaluationCard';
import { FinalizeStep } from '@/components/FinalizeStep';
import { Button } from '@/components/ui/button';
import { mockEvaluateStory } from '@/services/mockApi';
import { ArrowRight, Loader2 } from 'lucide-react';

export function Wizard() {
  const { step, setStep, story, setEvaluation } = useWizard();
  const [evaluating, setEvaluating] = useState(false);

  const hasMinContent = Boolean(story.asA && story.iWant && story.soThat);

  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      const result = await mockEvaluateStory(story);
      setEvaluation(result);
      setStep(3);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between px-6 py-3">
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              PO Agent
            </h1>
            <div className="text-xs text-muted-foreground">AI Story Assistant</div>
          </div>
          <StepIndicator />
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-7xl flex-1">
        {step === 1 && <ContextWizard />}

        {step === 2 && (
          <div className="flex h-[calc(100vh-140px)] flex-col">
            <div className="flex flex-1 overflow-hidden">
              <div className="flex w-1/2 flex-col border-r border-border">
                <ChatPanel />
              </div>
              <div className="w-1/2 overflow-y-auto p-4">
                <StoryPreview />
              </div>
            </div>
            {hasMinContent && (
              <div className="border-t border-border bg-card/80 p-4 text-center">
                <Button onClick={handleEvaluate} disabled={evaluating} size="lg">
                  {evaluating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Evaluating...
                    </>
                  ) : (
                    <>
                      Ready to Evaluate
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="flex h-[calc(100vh-140px)] overflow-hidden">
            <div className="flex w-1/2 flex-col border-r border-border p-4">
              <div className="rounded-lg bg-muted/50 p-6">
                <h3 className="mb-2 text-lg font-semibold text-foreground">Evaluation Complete</h3>
                <p className="text-sm text-muted-foreground">
                  Your story has been analyzed for quality, completeness, and testability. 
                  Review the results on the right and choose how to proceed.
                </p>
              </div>
            </div>
            <div className="w-1/2 overflow-y-auto p-4">
              <EvaluationCard />
            </div>
          </div>
        )}

        {step === 4 && <FinalizeStep />}
      </main>
    </div>
  );
}
