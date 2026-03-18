import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWizard } from '@/context/WizardContext';
import { useAuth } from '@/context/AuthContext';
import { usePersistedChat } from '@/hooks/usePersistedChat';
import { usePersistedContext } from '@/hooks/usePersistedContext';
import { useStorySaver } from '@/hooks/useStorySaver';
import type { UIChatMessage } from '@/types/wizard';
import type { ProductContextInput } from '@/types/wizard';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MessageSquare, Plus, Settings, Loader2, HelpCircle, BarChart3, ChevronDown, Layers, FileText, Search, Trash2, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

interface SavedSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface EpicWithStories {
  id: string;
  title: string;
  created_at: string;
  stories: Array<{ id: string; title: string; created_at: string }>;
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    contextId, setStep,
    setChatHistory, setDbSessionId, dbSessionId,
    sidebarRefreshKey, setStory, setEvaluation,
    setProductContext, setContextId,
  } = useWizard();
  const { loadSessions, loadMessages } = usePersistedChat();
  const { getEpicsWithStories } = useStorySaver();
  const { loadContexts } = usePersistedContext();

  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [epics, setEpics] = useState<EpicWithStories[]>([]);
  const [contexts, setContexts] = useState<(ProductContextInput & { id: string })[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingEpics, setLoadingEpics] = useState(false);
  const [sessionSearch, setSessionSearch] = useState('');
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);

  // Load contexts
  const refreshContexts = useCallback(async () => {
    const data = await loadContexts();
    setContexts(data);
  }, [loadContexts]);

  useEffect(() => {
    refreshContexts();
  }, []);

  // Load sessions for current context
  const refreshSessions = useCallback(async () => {
    if (!contextId) { setSessions([]); return; }
    setLoadingSessions(true);
    const data = await loadSessions(contextId);
    setSessions(data);
    setLoadingSessions(false);
  }, [contextId, loadSessions]);

  // Load epics for current context
  const refreshEpics = useCallback(async () => {
    if (!contextId) { setEpics([]); return; }
    setLoadingEpics(true);
    const data = await getEpicsWithStories(contextId);
    setEpics(data);
    setLoadingEpics(false);
  }, [contextId, getEpicsWithStories]);

  useEffect(() => {
    refreshSessions();
    refreshEpics();
  }, [contextId, sidebarRefreshKey]);

  const handleSelectSession = async (session: SavedSession) => {
    setDbSessionId(session.id);
    const msgs = await loadMessages(session.id);
    setChatHistory(msgs);

    try {
      const { data } = await supabase
        .from('generated_stories')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        const s = data[0] as any;
        setStory({
          title: s.title || '',
          asA: s.as_a || '',
          iWant: s.i_want || '',
          soThat: s.so_that || '',
          description: s.description || '',
          acceptanceCriteria: s.acceptance_criteria || [],
          metadata: s.metadata || { project: '', epic: '', priority: '', estimate: '' },
        });
        if (s.evaluation_result) {
          setEvaluation({
            overallResult: s.evaluation_result,
            scorecard: s.evaluation_scorecard || [],
            improvedStory: s.evaluation_improved_story || null,
            learningInsight: s.evaluation_learning_insight || null,
            newChecklistRule: null,
            isLikelyEpic: s.is_likely_epic || false,
          });
        } else {
          setEvaluation(null);
        }
      } else {
        setStory({ title: '', asA: '', iWant: '', soThat: '', description: '', acceptanceCriteria: [], metadata: { project: '', epic: '', priority: '', estimate: '' } });
        setEvaluation(null);
      }
    } catch {
      setStory({ title: '', asA: '', iWant: '', soThat: '', description: '', acceptanceCriteria: [], metadata: { project: '', epic: '', priority: '', estimate: '' } });
      setEvaluation(null);
    }

    setStep(2);
  };

  const handleDeleteSession = async () => {
    if (!deleteSessionId || !user) return;
    try {
      await supabase.from('chat_messages').delete().eq('session_id', deleteSessionId);
      await supabase.from('chat_sessions').delete().eq('id', deleteSessionId).eq('user_id', user.id);
      setSessions(prev => prev.filter(s => s.id !== deleteSessionId));
      if (dbSessionId === deleteSessionId) {
        setDbSessionId(null);
        setChatHistory([]);
      }
      toast({ title: 'Session deleted' });
    } catch {
      toast({ title: 'Failed to delete session', variant: 'destructive' });
    }
    setDeleteSessionId(null);
  };

  const handleNewSession = () => {
    setChatHistory([]);
    setDbSessionId(null);
    setStep(2);
  };

  const handleSwitchContext = (ctxId: string) => {
    const ctx = contexts.find(c => c.id === ctxId);
    if (ctx) {
      setProductContext(ctx);
      setContextId(ctx.id);
      setChatHistory([]);
      setDbSessionId(null);
      setStep(2);
    }
  };

  const handleNewContext = () => {
    setStep(1);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d ago`;
  };

  const filteredSessions = sessionSearch
    ? sessions.filter(s => s.title.toLowerCase().includes(sessionSearch.toLowerCase()))
    : sessions;

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent className="pt-2">
        {/* Context Switcher */}
        {!collapsed && contexts.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center px-3">
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Package className="h-3.5 w-3.5" />
                Product
              </span>
            </SidebarGroupLabel>
            <SidebarGroupContent className="px-3">
              <Select value={contextId || ''} onValueChange={handleSwitchContext}>
                <SelectTrigger className="h-8 text-xs rounded-lg">
                  <SelectValue placeholder="Select product..." />
                </SelectTrigger>
                <SelectContent>
                  {contexts.map(ctx => (
                    <SelectItem key={ctx.id} value={ctx.id} className="text-xs">
                      {ctx.productName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-1 justify-start gap-1.5 text-xs text-muted-foreground hover:text-foreground h-7"
                onClick={handleNewContext}
              >
                <Plus className="h-3 w-3" />
                New Product
              </Button>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Chat Sessions */}
        {contextId && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center justify-between px-3">
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {!collapsed && <MessageSquare className="h-3.5 w-3.5" />}
                {collapsed ? <MessageSquare className="h-4 w-4" /> : 'Sessions'}
              </span>
              {!collapsed && (
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleNewSession}>
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              {/* Search */}
              {!collapsed && sessions.length > 3 && (
                <div className="px-3 pb-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      value={sessionSearch}
                      onChange={e => setSessionSearch(e.target.value)}
                      placeholder="Search sessions..."
                      className="h-7 pl-7 text-xs rounded-lg"
                    />
                  </div>
                </div>
              )}
              <SidebarMenu>
                {loadingSessions ? (
                  <div className="flex justify-center py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredSessions.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    {collapsed ? '' : sessionSearch ? 'No matching sessions' : 'No sessions yet'}
                  </div>
                ) : (
                  filteredSessions.map(session => (
                    <SidebarMenuItem key={session.id}>
                      <SidebarMenuButton
                        onClick={() => handleSelectSession(session)}
                        className={cn(
                          'group',
                          dbSessionId === session.id && 'bg-accent text-accent-foreground font-medium',
                        )}
                        tooltip={session.title}
                      >
                        {collapsed ? (
                          <MessageSquare className="h-3.5 w-3.5" />
                        ) : (
                          <div className="flex items-center gap-1 min-w-0 w-full">
                            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                              <span className="truncate text-sm">{session.title}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {formatDate(session.updated_at)}
                              </span>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteSessionId(session.id); }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10 hover:text-destructive shrink-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Epics */}
        {contextId && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center px-3">
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {!collapsed && <Layers className="h-3.5 w-3.5" />}
                {collapsed ? <Layers className="h-4 w-4" /> : 'Epics'}
              </span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {loadingEpics ? (
                  <div className="flex justify-center py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : epics.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    {collapsed ? '' : 'No epics yet'}
                  </div>
                ) : (
                  epics.map(epic => (
                    <SidebarMenuItem key={epic.id}>
                      {collapsed ? (
                        <SidebarMenuButton tooltip={`${epic.title} (${epic.stories.length} stories)`}>
                          <Layers className="h-3.5 w-3.5" />
                        </SidebarMenuButton>
                      ) : (
                        <Collapsible>
                          <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors">
                            <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform [&[data-state=open]]:rotate-180" />
                            <Layers className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                            <span className="truncate flex-1 text-left">{epic.title}</span>
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                              {epic.stories.length}
                            </Badge>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="ml-5 border-l border-border pl-2 space-y-0.5 py-1">
                              {epic.stories.map(story => (
                                <div
                                  key={story.id}
                                  className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground rounded hover:bg-accent/50 transition-colors"
                                >
                                  <FileText className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{story.title}</span>
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </SidebarMenuItem>
                  ))
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {!collapsed && (
        <SidebarFooter className="p-3 space-y-1">
          {contextId && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 rounded-xl text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setStep(3)}
            >
              <Settings className="h-3.5 w-3.5" />
              Edit Context
            </Button>
          )}
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 rounded-xl text-xs text-muted-foreground hover:text-foreground"
              onClick={() => navigate('/admin')}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              AI Quality Dashboard
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 rounded-xl text-xs text-muted-foreground hover:text-foreground"
            onClick={() => window.open('/faq', '_blank')}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Security & Privacy FAQ
          </Button>
        </SidebarFooter>
      )}

      {/* Delete session confirmation */}
      <AlertDialog open={!!deleteSessionId} onOpenChange={(open) => !open && setDeleteSessionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this chat session and all its messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSession} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}
