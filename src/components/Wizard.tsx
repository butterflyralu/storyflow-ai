import { useWizard } from '@/context/WizardContext';
import { useAuth } from '@/context/AuthContext';
import logo from '@/assets/logo.jpeg';
import { ContextWizard } from '@/components/ContextWizard';
import { ChatPanel } from '@/components/ChatPanel';
import { StoryPreview } from '@/components/StoryPreview';
import { SplitStoriesView } from '@/components/SplitStoriesView';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function Wizard() {
  const { step, splitStories } = useWizard();
  const { user, signOut } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="relative border-b border-border overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/40 to-primary/10 bg-[length:200%_200%] animate-gradient" />
        <div className="relative mx-auto max-w-7xl backdrop-blur-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <img src={logo} alt="StoryFlow AI" className="h-8 w-8 rounded-xl object-cover" />
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                StoryFlow AI
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                AI Story Assistant
              </div>
              {user && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                    {user.user_metadata?.full_name || user.email}
                  </span>
                  <Button variant="ghost" size="icon" onClick={signOut} className="h-8 w-8 rounded-xl">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              )}
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
