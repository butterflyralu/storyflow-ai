import { useEffect, useState } from 'react';
import { useWizard } from '@/context/WizardContext';
import { useAuth } from '@/context/AuthContext';
import { usePersistedContext } from '@/hooks/usePersistedContext';
import { useStorySaver } from '@/hooks/useStorySaver';
import { useIsMobile } from '@/hooks/use-mobile';
import logo from '@/assets/logo.jpeg';
import { ContextWizard } from '@/components/ContextWizard';
import { ChatPanel } from '@/components/ChatPanel';
import { StoryPreview } from '@/components/StoryPreview';
import { SplitStoriesView } from '@/components/SplitStoriesView';
import { ProductContextSettings } from '@/components/ProductContextSettings';
import { ProductContextList } from '@/components/ProductContextList';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { LogOut, Loader2, MessageSquare, FileText, Plus, Layers } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export function Wizard() {
  const {
    step, setStep, splitStories, setProductContext, setContextId,
    contextId, setChatHistory, setDbSessionId, setStory, setEvaluation,
    resetStory, triggerSidebarRefresh,
  } = useWizard();
  const { user, signOut } = useAuth();
  const { loadContexts } = usePersistedContext();
  const { createEpic } = useStorySaver();
  const [loadingContext, setLoadingContext] = useState(true);
  const [epicDialogOpen, setEpicDialogOpen] = useState(false);
  const [epicTitle, setEpicTitle] = useState('');
  const [creatingEpic, setCreatingEpic] = useState(false);
  const isMobile = useIsMobile();

  const handleNewStory = () => {
    resetStory();
  };

  const handleCreateEpic = async () => {
    if (!epicTitle.trim()) return;
    setCreatingEpic(true);
    const id = await createEpic(
      { title: epicTitle.trim(), asA: '', iWant: '', soThat: '', description: '', acceptanceCriteria: [], metadata: { project: '', epic: '', priority: '', estimate: '' } },
      { contextId },
    );
    setCreatingEpic(false);
    if (id) {
      toast({ title: 'Epic created' });
      triggerSidebarRefresh();
      setEpicDialogOpen(false);
      setEpicTitle('');
    } else {
      toast({ title: 'Failed to create epic', variant: 'destructive' });
    }
  };

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
                  {contextId && (
                    <>
                      <Button size="sm" onClick={handleNewStory} className="gap-1.5 h-8 rounded-lg">
                        <Plus className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">New Story</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setEpicDialogOpen(true)} className="gap-1.5 h-8 rounded-lg">
                        <Layers className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">New Epic</span>
                      </Button>
                    </>
                  )}
                  <div className="hidden md:block rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
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
              isMobile ? (
                <Tabs defaultValue="chat" className="flex flex-col h-full">
                  <TabsList className="shrink-0 mx-4 mt-2 grid w-auto grid-cols-2">
                    <TabsTrigger value="chat" className="gap-1.5 text-xs">
                      <MessageSquare className="h-3.5 w-3.5" />
                      Chat
                    </TabsTrigger>
                    <TabsTrigger value="story" className="gap-1.5 text-xs">
                      <FileText className="h-3.5 w-3.5" />
                      Story
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="chat" className="flex-1 min-h-0 overflow-hidden mt-0">
                    <ChatPanel />
                  </TabsContent>
                  <TabsContent value="story" className="flex-1 min-h-0 overflow-hidden mt-0">
                    <div className="h-full overflow-y-auto overscroll-y-contain p-4">
                      {splitStories.length > 0 ? <SplitStoriesView /> : <StoryPreview />}
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="flex h-full overflow-hidden">
                  <div className="flex w-1/2 flex-col border-r border-border min-h-0 overflow-hidden">
                    <ChatPanel />
                  </div>
                  <div className="w-1/2 min-h-0 overflow-hidden bg-muted/30">
                    {splitStories.length > 0 ? <SplitStoriesView /> : <div className="h-full overflow-y-auto overscroll-y-contain p-5"><StoryPreview /></div>}
                  </div>
                </div>
              )
            )}

            {step === 3 && <ProductContextSettings />}
            {step === 4 && <ProductContextList />}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
