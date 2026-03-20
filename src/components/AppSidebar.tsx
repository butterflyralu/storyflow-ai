import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWizard } from '@/context/WizardContext';
import { useAuth } from '@/context/AuthContext';
import type { OverallResult } from '@/services/types';
import { usePersistedChat } from '@/hooks/usePersistedChat';
import { usePersistedContext } from '@/hooks/usePersistedContext';
import { useStorySaver } from '@/hooks/useStorySaver';
import type { StoryRecord, EpicWithStories } from '@/hooks/useStorySaver';
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
import { Plus, Settings, Loader2, HelpCircle, BarChart3, ChevronDown, Layers, FileText, Search, Trash2, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

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
  const { loadMessages } = usePersistedChat();
  const { getEpicsWithStories, getUngroupedStories, deleteStory, deleteEpic } = useStorySaver();
  const { loadContexts } = usePersistedContext();

  const [epics, setEpics] = useState<EpicWithStories[]>([]);
  const [ungroupedStories, setUngroupedStories] = useState<StoryRecord[]>([]);
  const [contexts, setContexts] = useState<(ProductContextInput & { id: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [storySearch, setStorySearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'story' | 'epic'; id: string; title: string } | null>(null);

  // Load contexts
  const refreshContexts = useCallback(async () => {
    const data = await loadContexts();
    setContexts(data);
  }, [loadContexts]);

  useEffect(() => {
    refreshContexts();
  }, []);

  // Load epics + ungrouped stories for current context
  const refreshData = useCallback(async () => {
    if (!contextId) { setEpics([]); setUngroupedStories([]); return; }
    setLoading(true);
    const [epicsData, ungrouped] = await Promise.all([
      getEpicsWithStories(contextId),
      getUngroupedStories(contextId),
    ]);
    setEpics(epicsData);
    setUngroupedStories(ungrouped);
    setLoading(false);
  }, [contextId, getEpicsWithStories, getUngroupedStories]);

  useEffect(() => {
    refreshData();
  }, [refreshData, sidebarRefreshKey]);

  const handleSelectStory = async (story: StoryRecord) => {
    // Load story data into workspace
    setStory({
      title: story.title || '',
      asA: story.as_a || '',
      iWant: story.i_want || '',
      soThat: story.so_that || '',
      description: story.description || '',
      acceptanceCriteria: story.acceptance_criteria || [],
      metadata: story.metadata || { project: '', epic: '', priority: '', estimate: '' },
    });

    if (story.evaluation_result) {
      setEvaluation({
        overallResult: story.evaluation_result as OverallResult,
        scorecard: story.evaluation_scorecard || [],
        improvedStory: story.evaluation_improved_story || null,
        learningInsight: story.evaluation_learning_insight || null,
        newChecklistRule: null,
        isLikelyEpic: story.is_likely_epic || false,
      });
    } else {
      setEvaluation(null);
    }

    // Load the associated chat session if exists
    if (story.session_id) {
      setDbSessionId(story.session_id);
      const msgs = await loadMessages(story.session_id);
      setChatHistory(msgs);
    } else {
      setDbSessionId(null);
      setChatHistory([]);
    }

    setStep(2);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    let success = false;
    if (deleteTarget.type === 'story') {
      success = await deleteStory(deleteTarget.id);
    } else {
      success = await deleteEpic(deleteTarget.id);
    }
    if (success) {
      toast({ title: `${deleteTarget.type === 'epic' ? 'Epic' : 'Story'} deleted` });
      refreshData();
    } else {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
    setDeleteTarget(null);
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

  // Filter stories across epics and ungrouped by search
  const searchLower = storySearch.toLowerCase();
  const filteredEpics = storySearch
    ? epics.map(e => ({
        ...e,
        stories: e.stories.filter(s => s.title.toLowerCase().includes(searchLower)),
      })).filter(e => e.stories.length > 0 || e.title.toLowerCase().includes(searchLower))
    : epics;
  const filteredUngrouped = storySearch
    ? ungroupedStories.filter(s => s.title.toLowerCase().includes(searchLower))
    : ungroupedStories;

  const totalItems = epics.length + ungroupedStories.length;

  const renderStoryItem = (story: StoryRecord) => (
    <SidebarMenuItem key={story.id}>
      <SidebarMenuButton
        onClick={() => handleSelectStory(story)}
        className="group"
        tooltip={story.title}
      >
        {collapsed ? (
          <FileText className="h-3.5 w-3.5" />
        ) : (
          <div className="flex items-center gap-1 min-w-0 w-full">
            <FileText className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              <span className="truncate text-xs">{story.title || 'Untitled Story'}</span>
              <span className="text-[10px] text-muted-foreground">
                {formatDate(story.created_at)}
              </span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'story', id: story.id, title: story.title }); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10 hover:text-destructive shrink-0"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

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

        {/* Search */}
        {contextId && !collapsed && totalItems > 3 && (
          <div className="px-5 pb-1">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                value={storySearch}
                onChange={e => setStorySearch(e.target.value)}
                placeholder="Search stories & epics..."
                className="h-7 pl-7 text-xs rounded-lg"
              />
            </div>
          </div>
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
                {loading ? (
                  <div className="flex justify-center py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredEpics.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    {collapsed ? '' : storySearch ? 'No matching epics' : 'No epics yet'}
                  </div>
                ) : (
                  filteredEpics.map(epic => (
                    <SidebarMenuItem key={epic.id}>
                      {collapsed ? (
                        <SidebarMenuButton tooltip={`${epic.title} (${epic.stories.length} stories)`}>
                          <Layers className="h-3.5 w-3.5" />
                        </SidebarMenuButton>
                      ) : (
                        <Collapsible>
                          <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors group">
                            <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform [&[data-state=open]]:rotate-180" />
                            <Layers className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                            <span className="truncate flex-1 text-left">{epic.title}</span>
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                              {epic.stories.length}
                            </Badge>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'epic', id: epic.id, title: epic.title }); }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10 hover:text-destructive shrink-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="ml-5 border-l border-border pl-1 py-1">
                              <SidebarMenu>
                                {epic.stories.length === 0 ? (
                                  <div className="px-2 py-1 text-[10px] text-muted-foreground italic">No stories</div>
                                ) : (
                                  epic.stories.map(story => renderStoryItem(story))
                                )}
                              </SidebarMenu>
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

        {/* Ungrouped Stories */}
        {contextId && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center px-3">
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {!collapsed && <FileText className="h-3.5 w-3.5" />}
                {collapsed ? <FileText className="h-4 w-4" /> : 'Stories'}
              </span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {loading ? (
                  <div className="flex justify-center py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredUngrouped.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    {collapsed ? '' : storySearch ? 'No matching stories' : 'No ungrouped stories'}
                  </div>
                ) : (
                  filteredUngrouped.map(story => renderStoryItem(story))
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {!collapsed && (
        <SidebarFooter className="p-3 space-y-1">
          {contextId && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 rounded-xl text-xs text-muted-foreground hover:text-foreground"
                onClick={() => navigate('/epics')}
              >
                <Layers className="h-3.5 w-3.5" />
                Manage Epics
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 rounded-xl text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setStep(4)}
              >
                <Settings className="h-3.5 w-3.5" />
                Manage Products
              </Button>
            </>
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

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteTarget?.type === 'epic' ? 'epic' : 'story'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === 'epic'
                ? `This will delete the epic "${deleteTarget.title}" and ungroup its stories. Stories will not be deleted.`
                : `This will permanently delete the story "${deleteTarget?.title}". This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}
