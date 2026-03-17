import { useEffect, useState, useCallback } from 'react';
import { useWizard } from '@/context/WizardContext';
import { usePersistedChat } from '@/hooks/usePersistedChat';
import { useStorySaver } from '@/hooks/useStorySaver';
import type { UIChatMessage } from '@/types/wizard';
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MessageSquare, Plus, Settings, Loader2, HelpCircle, BarChart3, ChevronDown, Layers, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Badge } from '@/components/ui/badge';

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
  const {
    contextId, setStep,
    setChatHistory, setDbSessionId, dbSessionId,
    sidebarRefreshKey, setStory, setEvaluation,
  } = useWizard();
  const { loadSessions, loadMessages } = usePersistedChat();
  const { getEpicsWithStories } = useStorySaver();

  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [epics, setEpics] = useState<EpicWithStories[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingEpics, setLoadingEpics] = useState(false);

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

    // Restore story draft from generated_stories for this session
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
      // If loading story fails, just clear it
      setStory({ title: '', asA: '', iWant: '', soThat: '', description: '', acceptanceCriteria: [], metadata: { project: '', epic: '', priority: '', estimate: '' } });
      setEvaluation(null);
    }

    setStep(2);
  };

  const handleNewSession = () => {
    setChatHistory([]);
    setDbSessionId(null);
    setStep(2);
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

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent className="pt-2">
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
              <SidebarMenu>
                {loadingSessions ? (
                  <div className="flex justify-center py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    {collapsed ? '' : 'No sessions yet'}
                  </div>
                ) : (
                  sessions.map(session => (
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
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="truncate text-sm">{session.title}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDate(session.updated_at)}
                            </span>
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
    </Sidebar>
  );
}
