import { useEffect, useState, useCallback } from 'react';
import { useWizard } from '@/context/WizardContext';
import { useStorySaver } from '@/hooks/useStorySaver';
import type { EpicWithStories, StoryRecord } from '@/hooks/useStorySaver';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, FileText, Trash2, Pencil, ArrowLeft, ChevronDown, ChevronRight, Loader2, MoveRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function Epics() {
  const navigate = useNavigate();
  const { contextId } = useWizard();
  const {
    getEpicsWithStories, getUngroupedStories,
    deleteStory, deleteEpic, updateEpicTitle, updateStoryEpic,
  } = useStorySaver();

  const [epics, setEpics] = useState<EpicWithStories[]>([]);
  const [ungroupedStories, setUngroupedStories] = useState<StoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'story' | 'epic'; id: string; title: string } | null>(null);

  // Rename state
  const [renameEpic, setRenameEpic] = useState<{ id: string; title: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);

  const refresh = useCallback(async () => {
    if (!contextId) return;
    setLoading(true);
    const [e, u] = await Promise.all([
      getEpicsWithStories(contextId),
      getUngroupedStories(contextId),
    ]);
    setEpics(e);
    setUngroupedStories(u);
    setLoading(false);
  }, [contextId, getEpicsWithStories, getUngroupedStories]);

  useEffect(() => { refresh(); }, [refresh]);

  const toggleEpic = (id: string) => {
    setExpandedEpics(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const success = deleteTarget.type === 'story'
      ? await deleteStory(deleteTarget.id)
      : await deleteEpic(deleteTarget.id);
    if (success) {
      toast({ title: `${deleteTarget.type === 'epic' ? 'Epic' : 'Story'} deleted` });
      refresh();
    } else {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
    setDeleteTarget(null);
  };

  const handleRename = async () => {
    if (!renameEpic || !renameValue.trim()) return;
    setRenaming(true);
    const success = await updateEpicTitle(renameEpic.id, renameValue.trim());
    setRenaming(false);
    if (success) {
      toast({ title: 'Epic renamed' });
      setRenameEpic(null);
      refresh();
    } else {
      toast({ title: 'Failed to rename', variant: 'destructive' });
    }
  };

  const handleMoveStory = async (storyId: string, epicId: string | null) => {
    const targetLabel = epicId === 'none' ? null : epicId;
    const success = await updateStoryEpic(storyId, targetLabel);
    if (success) {
      toast({ title: 'Story moved' });
      refresh();
    } else {
      toast({ title: 'Failed to move story', variant: 'destructive' });
    }
  };

  const renderStoryRow = (story: StoryRecord, currentEpicId?: string) => (
    <div
      key={story.id}
      className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-accent/30 transition-colors"
    >
      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{story.title || 'Untitled Story'}</p>
        <p className="text-xs text-muted-foreground truncate">
          {story.as_a && `As a ${story.as_a}, `}
          {story.i_want && `I want ${story.i_want}`}
        </p>
      </div>
      {story.evaluation_result && (
        <Badge
          variant={story.evaluation_result === 'pass' ? 'default' : 'secondary'}
          className="text-[10px] shrink-0"
        >
          {story.evaluation_result}
        </Badge>
      )}
      <Select
        value={currentEpicId || 'none'}
        onValueChange={(val) => handleMoveStory(story.id, val)}
      >
        <SelectTrigger className="h-7 w-[140px] text-xs shrink-0">
          <MoveRight className="h-3 w-3 mr-1" />
          <SelectValue placeholder="Move to..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none" className="text-xs">Ungrouped</SelectItem>
          {epics
            .filter(e => e.id !== currentEpicId)
            .map(e => (
              <SelectItem key={e.id} value={e.id} className="text-xs">{e.title}</SelectItem>
            ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
        onClick={() => setDeleteTarget({ type: 'story', id: story.id, title: story.title })}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Manage Epics & Stories</h1>
            <p className="text-sm text-muted-foreground">
              Organize stories into epics, rename, move, or delete them.
            </p>
          </div>
        </div>

        {/* Epics */}
        {epics.length > 0 && (
          <div className="space-y-4 mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Epics
            </h2>
            {epics.map(epic => {
              const isExpanded = expandedEpics.has(epic.id);
              return (
                <Card key={epic.id} className="overflow-hidden">
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleEpic(epic.id)} className="p-0.5">
                        {isExpanded
                          ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        }
                      </button>
                      <Layers className="h-4 w-4 text-primary flex-shrink-0" />
                      <CardTitle className="text-sm flex-1 truncate">{epic.title}</CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        {epic.stories.length} {epic.stories.length === 1 ? 'story' : 'stories'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => { setRenameEpic({ id: epic.id, title: epic.title }); setRenameValue(epic.title); }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget({ type: 'epic', id: epic.id, title: epic.title })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardHeader>
                  {isExpanded && (
                    <CardContent className="p-0 border-t border-border">
                      {epic.stories.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-muted-foreground italic">
                          No stories in this epic
                        </div>
                      ) : (
                        epic.stories.map(story => renderStoryRow(story, epic.id))
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Ungrouped Stories */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Ungrouped Stories
          </h2>
          {ungroupedStories.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No ungrouped stories
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                {ungroupedStories.map(story => renderStoryRow(story))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === 'epic'
                ? `This will delete "${deleteTarget.title}" and ungroup its stories. Stories will not be deleted.`
                : `This will permanently delete "${deleteTarget?.title}". This cannot be undone.`}
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

      {/* Rename epic dialog */}
      <Dialog open={!!renameEpic} onOpenChange={(open) => !open && setRenameEpic(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Epic</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleRename()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameEpic(null)}>Cancel</Button>
            <Button onClick={handleRename} disabled={!renameValue.trim() || renaming}>
              {renaming && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
