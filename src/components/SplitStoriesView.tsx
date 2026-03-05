import { useState } from 'react';
import { useWizard } from '@/context/WizardContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel';
import { ArrowLeft, Save, Trash2, X, Check, ClipboardCheck, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { cn } from '@/lib/utils';
import { useStorySaver } from '@/hooks/useStorySaver';
import type { StoryDraft, EvaluateResponse } from '@/services/types';

function StoryCard({
  story,
  index,
  total,
  onUpdate,
  onRemove,
  onSave,
  isSaved,
  sessionId,
  contextId,
}: {
  story: StoryDraft;
  index: number;
  total: number;
  onUpdate: (update: Partial<StoryDraft>) => void;
  onRemove: () => void;
  onSave: () => void;
  isSaved: boolean;
  sessionId: string;
  contextId: string | null;
}) {
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluateResponse | null>(null);

  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      const result = await api.evaluateStory({
        story,
        sessionId,
        contextId: contextId || '',
      });
      setEvaluation(result);
    } catch (e) {
      toast({ title: 'Evaluation failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setEvaluating(false);
    }
  };

  const passCount = evaluation?.scorecard.filter(c => c.result === 'PASS').length ?? 0;
  const totalCriteria = evaluation?.scorecard.length ?? 0;

  return (
    <Card className="flex h-full flex-col border shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            {index + 1} of {total}
          </Badge>
          <div className="flex items-center gap-1">
            {isSaved && (
              <Badge variant="default" className="text-xs gap-1">
                <Check className="h-3 w-3" /> Saved
              </Badge>
            )}
            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onRemove}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <input
          value={story.title}
          onChange={e => onUpdate({ title: e.target.value })}
          className="mt-1 w-full border-0 bg-transparent text-base font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none"
          placeholder="Story title..."
        />
        {story.metadata?.epic && (
          <Badge variant="secondary" className="mt-1 text-xs">
            Epic: {story.metadata.epic}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="flex-1 space-y-3 overflow-y-auto">
        {/* User Story */}
        <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1 text-sm">
          <div className="flex items-baseline gap-1.5">
            <span className="font-semibold text-foreground">As a</span>
            <input
              value={story.asA}
              onChange={e => onUpdate({ asA: e.target.value })}
              className="flex-1 border-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              placeholder="[role]"
            />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-semibold text-foreground">I want to</span>
            <input
              value={story.iWant}
              onChange={e => onUpdate({ iWant: e.target.value })}
              className="flex-1 border-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              placeholder="[capability]"
            />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-semibold text-foreground">So that</span>
            <input
              value={story.soThat}
              onChange={e => onUpdate({ soThat: e.target.value })}
              className="flex-1 border-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              placeholder="[value]"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</div>
          <textarea
            value={story.description}
            onChange={e => onUpdate({ description: e.target.value })}
            className="w-full resize-y rounded border-0 bg-transparent px-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none min-h-[3rem]"
            placeholder="Story description..."
            rows={2}
          />
        </div>

        {/* Acceptance Criteria */}
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acceptance Criteria</div>
          {story.acceptanceCriteria.length > 0 ? (
            <div className="space-y-2">
              {story.acceptanceCriteria.map((group, gi) => (
                <div key={gi}>
                  <div className="text-xs font-medium text-muted-foreground">{group.category}</div>
                  <ul className="space-y-0.5">
                    {group.items.map((item, ii) => (
                      <li key={ii} className="flex items-start gap-1.5 text-sm text-foreground">
                        <span className="mt-0.5 text-primary">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm italic text-muted-foreground">No criteria yet.</p>
          )}
        </div>

        {/* Inline Evaluation Results */}
        {evaluation && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Evaluation</div>
              <Badge variant={evaluation.overallResult === 'PASS' ? 'default' : 'secondary'} className="text-[10px]">
                {passCount}/{totalCriteria} passed
              </Badge>
            </div>
            {evaluation.scorecard.map((item, i) => (
              <div
                key={i}
                className={cn(
                  'rounded p-2 text-xs',
                  item.result === 'PASS' ? 'bg-primary/5' : 'bg-destructive/5',
                )}
              >
                <div className="flex items-center gap-1.5">
                  <div className={cn(
                    'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full',
                    item.result === 'PASS' ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive',
                  )}>
                    {item.result === 'PASS' ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
                  </div>
                  <span className="font-medium text-foreground">{item.criterion}</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0">{item.framework}</Badge>
                </div>
                <div className="mt-0.5 pl-5.5 text-muted-foreground">{item.explanation}</div>
              </div>
            ))}
            {evaluation.improvedStory && evaluation.overallResult === 'FAIL' && (
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs mt-1"
                onClick={() => onUpdate(evaluation.improvedStory)}
              >
                Apply Improved Version
              </Button>
            )}
          </div>
        )}
      </CardContent>

      {/* Per-card action buttons */}
      <div className="border-t border-border px-4 py-2 flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 gap-1 text-xs"
          onClick={handleEvaluate}
          disabled={evaluating}
        >
          {evaluating ? <Loader2 className="h-3 w-3 animate-spin" /> : <ClipboardCheck className="h-3 w-3" />}
          {evaluating ? 'Evaluating…' : 'Evaluate'}
        </Button>
        <Button
          size="sm"
          className="flex-1 gap-1 text-xs"
          onClick={onSave}
          disabled={isSaved}
        >
          <Save className="h-3 w-3" />
          {isSaved ? 'Saved' : 'Save'}
        </Button>
      </div>
    </Card>
  );
}

export function SplitStoriesView() {
  const {
    splitStories,
    activeSplitIndex,
    setActiveSplitIndex,
    updateSplitStory,
    removeSplitStory,
    epicSummary,
    clearSplit,
    saveStory,
    addMessage,
    story: originalStory,
    sessionId,
    contextId,
    dbSessionId,
    triggerSidebarRefresh,
  } = useWizard();

  const { saveEpicWithStories } = useStorySaver();
  const [saving, setSaving] = useState(false);
  const [savedIndices, setSavedIndices] = useState<Set<number>>(new Set());

  if (splitStories.length === 0) return null;

  const handleSaveOne = (index: number) => {
    saveStory(splitStories[index]);
    setSavedIndices(prev => new Set(prev).add(index));
    toast({ title: '✅ Story saved', description: `"${splitStories[index].title}" has been saved.` });
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const result = await saveEpicWithStories(originalStory, splitStories, {
        contextId,
        sessionId: dbSessionId,
      });
      if (result) {
        toast({ title: '✅ Epic & stories saved!', description: `Epic with ${result.storyIds.length} stories saved to database.` });
      } else {
        // Fallback to local save
        splitStories.forEach((s, i) => {
          if (!savedIndices.has(i)) saveStory(s);
        });
        toast({ title: '✅ Stories saved locally', description: `${splitStories.length} stories saved.` });
      }
    } catch (e) {
      console.error('Epic save error:', e);
      toast({ title: 'Save failed', description: 'Could not save to database.', variant: 'destructive' });
    }
    setSaving(false);
    triggerSidebarRefresh();
    addMessage({
      id: String(Date.now()),
      role: 'assistant',
      content: `Saved ${splitStories.length} stories from the epic split. Want to start working on a new story?`,
      options: [{ label: 'Start a new story' }],
    });
    clearSplit();
  };

  const handleRemove = (index: number) => {
    if (splitStories.length <= 1) {
      toast({ title: 'Cannot remove', description: 'You need at least one story.' });
      return;
    }
    removeSplitStory(index);
    toast({ title: 'Removed', description: `Story ${index + 1} removed.` });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Sticky epic header */}
      <div className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur-sm px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
              Epic: {originalStory.title}
            </div>
            {epicSummary && (
              <p className="text-sm text-muted-foreground truncate">{epicSummary}</p>
            )}
          </div>
          <Button size="sm" variant="ghost" onClick={clearSplit} className="ml-3 gap-1.5 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to original
          </Button>
        </div>
      </div>

      {/* Carousel */}
      <div className="flex-1 px-10 py-5">
        <Carousel
          opts={{ align: 'center', loop: false }}
          className="w-full"
          setApi={(api) => {
            api?.on('select', () => {
              setActiveSplitIndex(api.selectedScrollSnap());
            });
          }}
        >
          <CarouselContent>
            {splitStories.map((s, i) => (
              <CarouselItem key={i} className="basis-[85%] md:basis-[75%]">
                <div className="h-[calc(100vh-220px)]">
                  <StoryCard
                    story={s}
                    index={i}
                    total={splitStories.length}
                    onUpdate={(update) => updateSplitStory(i, update)}
                    onRemove={() => handleRemove(i)}
                    onSave={() => handleSaveOne(i)}
                    isSaved={savedIndices.has(i)}
                    sessionId={sessionId}
                    contextId={contextId}
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="-left-4" />
          <CarouselNext className="-right-4" />
        </Carousel>

        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {splitStories.map((_, i) => (
            <button
              key={i}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === activeSplitIndex ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}
              onClick={() => setActiveSplitIndex(i)}
            />
          ))}
        </div>
      </div>

      {/* Action bar */}
      <div className="border-t border-border bg-card px-5 py-3 flex gap-2">
        <Button onClick={handleSaveAll} disabled={saving} className="flex-1 gap-1.5">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : `Save All ${splitStories.length} Stories`}
        </Button>
        <Button variant="secondary" onClick={clearSplit} className="gap-1.5">
          <X className="h-4 w-4" />
          Discard Split
        </Button>
      </div>
    </div>
  );
}
