import { useEffect, useState } from 'react';
import { useWizard } from '@/context/WizardContext';
import { useAuth } from '@/context/AuthContext';
import { usePersistedContext } from '@/hooks/usePersistedContext';
import logo from '@/assets/logo.jpeg';
import { ContextWizard } from '@/components/ContextWizard';
import { ChatPanel } from '@/components/ChatPanel';
import { StoryPreview } from '@/components/StoryPreview';
import { SplitStoriesView } from '@/components/SplitStoriesView';
import { ProductContextSettings } from '@/components/ProductContextSettings';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2 } from 'lucide-react';

export function Wizard() {
  const { step, setStep, splitStories, setProductContext, setContextId } = useWizard();
  const { user, signOut } = useAuth();
  const { loadContexts } = usePersistedContext();
  const [loadingContext, setLoadingContext] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const contexts = await loadContexts();
      if (cancelled) return;
      if (contexts.length > 0) {
        const latest = contexts[0];
        setProductContext(latest);
        setContextId(latest.id);
        setStep(2);
      }
      setLoadingContext(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loadingContext) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="relative border-b border-border overflow-hidden shrink-0">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/40 to-primary/10 bg-[length:200%_200%] animate-gradient" />
            <div className="relative">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <SidebarTrigger className="h-8 w-8" />
                  <img src={logo} alt="StoryFlow AI" className="h-7 w-7 rounded-lg object-cover" />
                  <h1 className="text-base font-bold tracking-tight text-foreground">
                    StoryFlow AI
                  </h1>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden sm:block rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                    AI Story Assistant
                  </div>
                  {user && (
                    <div className="flex items-center gap-2">
                      <span className="hidden sm:block text-xs text-muted-foreground truncate max-w-[150px]">
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

          {/* Main content */}
          <main className="flex-1 min-h-0 overflow-hidden">
            {step === 1 && <ContextWizard />}

            {step === 2 && (
              <div className="flex h-full overflow-hidden">
                <div className="flex w-1/2 flex-col border-r border-border min-h-0 overflow-hidden">
                  <ChatPanel />
                </div>
                <div className="w-1/2 min-h-0 overflow-y-auto bg-muted/30">
                  {splitStories.length > 0 ? <SplitStoriesView /> : <div className="sticky top-0 p-5"><StoryPreview /></div>}
                </div>
              </div>
            )}

            {step === 3 && <ProductContextSettings />}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
