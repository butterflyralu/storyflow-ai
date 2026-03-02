import { useEffect, useState, useCallback } from 'react';
import { useWizard } from '@/context/WizardContext';
import { usePersistedContext } from '@/hooks/usePersistedContext';
import { usePersistedChat } from '@/hooks/usePersistedChat';
import type { ProductContextInput } from '@/types/wizard';
import { EMPTY_STORY } from '@/types/wizard';
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
import { Package, MessageSquare, Plus, Settings, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SavedContext extends ProductContextInput {
  id: string;
}

interface SavedSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const {
    contextId, setContextId, setProductContext, setStep,
    setChatHistory, setDbSessionId, dbSessionId,
  } = useWizard();
  const { loadContexts } = usePersistedContext();
  const { loadSessions, loadMessages } = usePersistedChat();

  const [contexts, setContexts] = useState<SavedContext[]>([]);
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [loadingContexts, setLoadingContexts] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Load contexts
  const refreshContexts = useCallback(async () => {
    setLoadingContexts(true);
    const data = await loadContexts();
    setContexts(data as SavedContext[]);
    setLoadingContexts(false);
  }, [loadContexts]);

  // Load sessions for current context
  const refreshSessions = useCallback(async () => {
    if (!contextId) { setSessions([]); return; }
    setLoadingSessions(true);
    const data = await loadSessions(contextId);
    setSessions(data);
    setLoadingSessions(false);
  }, [contextId, loadSessions]);

  useEffect(() => { refreshContexts(); }, []);
  useEffect(() => { refreshSessions(); }, [contextId]);

  const handleSelectContext = (ctx: SavedContext) => {
    setProductContext(ctx);
    setContextId(ctx.id);
    // Reset chat when switching context
    setChatHistory([]);
    setDbSessionId(null);
    setStep(3); // Show context details/edit page
  };

  const handleSelectSession = async (session: SavedSession) => {
    setDbSessionId(session.id);
    const msgs = await loadMessages(session.id);
    setChatHistory(msgs);
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
        {/* Product Contexts */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between px-3">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {!collapsed && <Package className="h-3.5 w-3.5" />}
              {collapsed ? <Package className="h-4 w-4" /> : 'Contexts'}
            </span>
            {!collapsed && (
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleNewContext}>
                <Plus className="h-3 w-3" />
              </Button>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {loadingContexts ? (
                <div className="flex justify-center py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : contexts.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  {collapsed ? '' : 'No contexts yet'}
                </div>
              ) : (
                contexts.map(ctx => (
                  <SidebarMenuItem key={ctx.id}>
                    <SidebarMenuButton
                      onClick={() => handleSelectContext(ctx)}
                      className={cn(
                        'group relative',
                        contextId === ctx.id && 'bg-accent text-accent-foreground font-medium',
                      )}
                      tooltip={ctx.productName}
                    >
                      {collapsed ? (
                        <span className="text-xs font-bold">
                          {ctx.productName.charAt(0).toUpperCase()}
                        </span>
                      ) : (
                        <>
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="truncate text-sm">{ctx.productName}</span>
                            <span className="truncate text-[10px] text-muted-foreground">{ctx.industry}</span>
                          </div>
                          {contextId === ctx.id && (
                            <ChevronRight className="ml-auto h-3 w-3 shrink-0 text-primary" />
                          )}
                        </>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

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
      </SidebarContent>

      {!collapsed && contextId && (
        <SidebarFooter className="p-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 rounded-xl text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setStep(3)}
          >
            <Settings className="h-3.5 w-3.5" />
            Edit Context
          </Button>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
