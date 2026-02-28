import { useWizard } from '@/context/WizardContext';
import { ContextWizard } from '@/components/ContextWizard';
import { ChatPanel } from '@/components/ChatPanel';
import { StoryPreview } from '@/components/StoryPreview';
import { SplitStoriesView } from '@/components/SplitStoriesView';

export function Wizard() {
  const { step, splitStories } = useWizard();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground text-sm font-bold">
                P
              </div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                PO Agent
              </h1>
            </div>
            <div className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
              AI Story Assistant
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1">
        {step === 1 && <ContextWizard />}

        {step === 2 && (
          <div className="flex h-[calc(100vh-68px)]">
            <div className="flex w-1/2 flex-col border-r border-border">
              <ChatPanel />
            </div>
            <div className="w-1/2 overflow-y-auto bg-muted/30">
              {splitStories.length > 0 ? <SplitStoriesView /> : <div className="p-5"><StoryPreview /></div>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
