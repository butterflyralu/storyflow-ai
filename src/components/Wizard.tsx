import { useWizard } from '@/context/WizardContext';
import { StepIndicator } from '@/components/StepIndicator';
import { ContextWizard } from '@/components/ContextWizard';
import { ChatPanel } from '@/components/ChatPanel';
import { StoryPreview } from '@/components/StoryPreview';
import { FinalizeStep } from '@/components/FinalizeStep';

export function Wizard() {
  const { step } = useWizard();

  return (
    <div className="flex min-h-screen flex-col bg-background">
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

      <main className="mx-auto w-full max-w-7xl flex-1">
        {step === 1 && <ContextWizard />}

        {step === 2 && (
          <div className="flex h-[calc(100vh-140px)]">
            <div className="flex w-1/2 flex-col border-r border-border">
              <ChatPanel />
            </div>
            <div className="w-1/2 overflow-y-auto p-4">
              <StoryPreview />
            </div>
          </div>
        )}

        {step === 3 && <FinalizeStep />}
      </main>
    </div>
  );
}
