import { useState, useRef } from 'react';
import { MarkdownText } from '@/components/MarkdownText';
import { useWizard } from '@/context/WizardContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Pencil, Check, X, AlertTriangle, Save, Copy, Info, Scissors, FileText, ClipboardList } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { api } from '@/services/api';
import { useStorySaver } from '@/hooks/useStorySaver';
import type { EvaluationScorecardItem, StoryDraft } from '@/services/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type StoryField = 'title' | 'userStory' | 'soThat' | 'description' | 'acceptanceCriteria' | 'unmatched';

function mapCriterionToField(criterion: string): StoryField {
  const c = criterion.toLowerCase();
  if (c.includes('valuable') || c.includes('value')) return 'soThat';
  if (c.includes('testable')) return 'acceptanceCriteria';
  if (c.includes('small') || c.includes('sized')) return 'title';
  if (c.includes('specific') || c.includes('independent') || c.includes('negotiable')) return 'description';
  if (c.includes('estimable')) return 'userStory';
  return 'unmatched';
}

function getImprovedText(field: StoryField, improved: StoryDraft): string | null {
  switch (field) {
    case 'title': return improved.title || null;
    case 'soThat': return improved.soThat || null;
    case 'description': return improved.description || null;
    case 'userStory': return [improved.asA, improved.iWant, improved.soThat].filter(Boolean).join(' · ') || null;
    case 'acceptanceCriteria':
      return improved.acceptanceCriteria.flatMap(g => g.items).join('; ') || null;
    default: return null;
  }
}

function InlineAnnotation({
  item, improvedStory, onApply, onDismiss,
}: {
  item: EvaluationScorecardItem;
  improvedStory?: StoryDraft;
  onApply?: () => void;
  onDismiss?: () => void;
}) {
  const field = mapCriterionToField(item.criterion);
  const suggestion = improvedStory ? getImprovedText(field, improvedStory) : null;

  return (
    <div className="mt-1 border-l-2 border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 pl-2 py-1.5">
      <div className="flex items-start gap-1.5 text-xs">
        <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0 text-amber-500" />
        <div className="flex-1 space-y-1">
          <span className="text-muted-foreground">{item.explanation}</span>
          {suggestion && (
            <div className="flex items-start gap-2 rounded bg-background/80 px-2 py-1.5 border border-border">
              <span className="flex-1 text-xs text-foreground italic">"{suggestion}"</span>
              {onApply && (
                <button
                  onClick={onApply}
                  className="flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  Apply
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getAnnotationsForField(
  items: EvaluationScorecardItem[] | undefined,
  field: StoryField,
) {
  if (!items) return [];
  return items.filter(i => i.result === 'FAIL' && mapCriterionToField(i.criterion) === field);
}

function EditableField({
  label, value, onSave, multiline = false, annotations, improvedStory, onApplyField, onDismissAnnotation,
}: {
  label: string; value: string; onSave: (val: string) => void; multiline?: boolean;
  annotations?: EvaluationScorecardItem[];
  improvedStory?: StoryDraft;
  onApplyField?: (field: StoryField) => void;
  onDismissAnnotation?: (criterion: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  const lastExternal = useRef(value);
  if (value !== lastExternal.current) {
    lastExternal.current = value;
    setDraft(value);
  }

  const save = () => { if (draft !== value) onSave(draft); };

  return (
    <div className="group relative rounded-lg border border-transparent p-3 transition-colors hover:border-border hover:bg-muted/30">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div>
        {multiline ? (
          <textarea value={draft} onChange={e => setDraft(e.target.value)} onBlur={save}
            className="w-full rounded border-0 bg-transparent px-0 py-0 text-sm text-foreground focus:outline-none focus:ring-0 resize-y placeholder:text-muted-foreground placeholder:italic min-h-[4.5rem]"
            rows={5} placeholder="Not yet defined..." />
        ) : (
          <input value={draft} onChange={e => setDraft(e.target.value)} onBlur={save}
            className="w-full rounded border-0 bg-transparent px-0 py-0 text-sm text-foreground focus:outline-none focus:ring-0 placeholder:text-muted-foreground placeholder:italic"
            placeholder="Not yet defined..." />
        )}
      </div>
      {annotations?.map((a, i) => (
        <InlineAnnotation key={i} item={a} improvedStory={improvedStory}
          onApply={onApplyField ? () => onApplyField(mapCriterionToField(a.criterion)) : undefined}
          onDismiss={onDismissAnnotation ? () => onDismissAnnotation(a.criterion) : undefined} />
      ))}
    </div>
  );
}

function EditableInline({ value, onSave, placeholder }: { value: string; onSave: (val: string) => void; placeholder: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const save = () => { onSave(draft); setEditing(false); };
  const cancel = () => { setDraft(value); setEditing(false); };

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <input value={draft} onChange={e => setDraft(e.target.value)}
          className="rounded border border-input bg-background px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          autoFocus onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }} />
        <button onClick={save} className="rounded p-0.5 text-primary hover:bg-primary/10"><Check className="h-3 w-3" /></button>
        <button onClick={cancel} className="rounded p-0.5 text-muted-foreground hover:bg-muted"><X className="h-3 w-3" /></button>
      </span>
    );
  }

  return (
    <span onClick={() => { setDraft(value); setEditing(true); }}
      className={cn('cursor-pointer rounded px-1 py-0.5 transition-colors hover:bg-muted', value ? 'text-foreground' : 'italic text-muted-foreground')}>
      {value || placeholder}
    </span>
  );
}

function EmptyStoryState() {
  return (
    <Card className="flex flex-col items-center justify-center border-0 shadow-lg p-8 text-center min-h-[300px]">
      <div className="rounded-full bg-accent p-4 mb-4">
        <FileText className="h-8 w-8 text-accent-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">Your story will appear here</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Start describing your user story idea in the chat — the AI will help shape it into a well-structured draft with acceptance criteria.
      </p>
    </Card>
  );
}

export function StoryPreview() {
  const { story, updateStory, evaluation, setStory, setEvaluation, saveStory, addMessage, resetStory, productContext, setPendingSplitStories, setEpicSummary, contextId, dbSessionId, triggerSidebarRefresh } = useWizard();
  const [saving, setSaving] = useState(false);
  const { saveGeneratedStory } = useStorySaver();
  const [splitting, setSplitting] = useState(false);
  const [appliedFields, setAppliedFields] = useState<Set<StoryField>>(new Set());
  const [dismissedCriteria, setDismissedCriteria] = useState<Set<string>>(new Set());

  // Check if story has any content
  const hasContent = !!(story.title || story.asA || story.iWant || story.soThat || story.description);

  const formatForJira = (markdown = false) => {
    if (markdown) {
      const lines = [`# ${story.title}`, '', `**As a** ${story.asA}, **I want to** ${story.iWant}, **so that** ${story.soThat}`];
      if (story.description) lines.push('', '## Description', story.description);
      if (story.acceptanceCriteria.length > 0) {
        lines.push('', '## Acceptance Criteria');
        story.acceptanceCriteria.forEach(g => {
          lines.push(`### ${g.category}`);
          g.items.forEach(item => lines.push(`- [ ] ${item}`));
        });
      }
      if (story.metadata.priority) lines.push('', `**Priority:** ${story.metadata.priority}`);
      if (story.metadata.estimate) lines.push(`**Estimate:** ${story.metadata.estimate}`);
      return lines.join('\n');
    }
    const lines = [`Title: ${story.title}`, '', `As a ${story.asA}, I want to ${story.iWant}, so that ${story.soThat}`];
    if (story.description) lines.push('', 'Description:', story.description);
    if (story.acceptanceCriteria.length > 0) {
      lines.push('', 'Acceptance Criteria:');
      story.acceptanceCriteria.forEach(g => {
        lines.push(`[${g.category}]`);
        g.items.forEach(item => lines.push(`- ${item}`));
      });
    }
    return lines.join('\n');
  };

  const handleCopy = async (markdown = false) => {
    await navigator.clipboard.writeText(formatForJira(markdown));
    toast({ title: '📋 Copied to clipboard!', description: markdown ? 'Markdown format — paste into Jira.' : 'Plain text copied.' });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      saveStory(story);
      await saveGeneratedStory(story, { contextId, sessionId: dbSessionId, evaluation });
      triggerSidebarRefresh();
      toast({ title: '✅ Story saved!', description: 'Your user story has been finalized.' });
    } catch (err) {
      console.error('Save story error:', err);
      toast({ title: 'Failed to save story', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Show empty state if no content
  if (!hasContent) {
    return <EmptyStoryState />;
  }

  const improved = evaluation?.improvedStory;
  const failItems = evaluation?.scorecard;
  const titleAnnotations = getAnnotationsForField(failItems, 'title').filter(a => !appliedFields.has('title') && !dismissedCriteria.has(a.criterion));
  const userStoryAnnotations = getAnnotationsForField(failItems, 'userStory').filter(a => !appliedFields.has('userStory') && !dismissedCriteria.has(a.criterion));
  const soThatAnnotations = getAnnotationsForField(failItems, 'soThat').filter(a => !appliedFields.has('soThat') && !dismissedCriteria.has(a.criterion));
  const descAnnotations = getAnnotationsForField(failItems, 'description').filter(a => !appliedFields.has('description') && !dismissedCriteria.has(a.criterion));
  const acAnnotations = getAnnotationsForField(failItems, 'acceptanceCriteria').filter(a => !appliedFields.has('acceptanceCriteria') && !dismissedCriteria.has(a.criterion));
  const unmatchedAnnotations = getAnnotationsForField(failItems, 'unmatched').filter(a => !dismissedCriteria.has(a.criterion));

  const dismissAnnotation = (criterion: string) => {
    setDismissedCriteria(prev => new Set(prev).add(criterion));
  };

  const remainingFailures = evaluation
    ? evaluation.scorecard.filter(i => i.result === 'FAIL' && !appliedFields.has(mapCriterionToField(i.criterion)) && !dismissedCriteria.has(i.criterion))
    : [];
  const hasRemainingFailures = remainingFailures.length > 0;

  const applyField = (field: StoryField) => {
    if (!improved) return;
    switch (field) {
      case 'title': updateStory({ title: improved.title }); break;
      case 'soThat': updateStory({ soThat: improved.soThat }); break;
      case 'description': updateStory({ description: improved.description }); break;
      case 'userStory': updateStory({ asA: improved.asA, iWant: improved.iWant, soThat: improved.soThat }); break;
      case 'acceptanceCriteria': updateStory({ acceptanceCriteria: improved.acceptanceCriteria }); break;
      default: return;
    }
    setAppliedFields(prev => new Set(prev).add(field));
    toast({ title: '✅ Applied', description: `Updated ${field} with the suggested improvement.` });
  };

  return (
    <Card className="flex max-h-[calc(100vh-8rem)] flex-col overflow-hidden border-0 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg">Story Draft</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {evaluation && (
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="inline-flex">
                    <Badge variant={evaluation.overallResult === 'PASS' ? 'default' : 'secondary'} className="text-xs cursor-pointer gap-1 hover:opacity-80 transition-opacity">
                      {evaluation.scorecard.filter(i => i.result === 'PASS').length}/{evaluation.scorecard.length} passed
                      <Info className="h-3 w-3" />
                    </Badge>
                  </button>
                </PopoverTrigger>
                <PopoverContent side="bottom" align="end" className="max-w-sm p-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Evaluation Scorecard</div>
                  <div className="space-y-2 text-xs">
                    {evaluation.scorecard.map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className={item.result === 'PASS' ? 'text-green-500' : 'text-destructive'}>
                          {item.result === 'PASS' ? '✓' : '✗'}
                        </span>
                        <div>
                          <span className="font-medium">{item.framework} – {item.criterion}</span>
                          <p className="text-muted-foreground">{item.explanation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
            <Badge variant="outline">{story.metadata.priority || 'Medium'}</Badge>
            {story.title && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="h-8 gap-1.5 px-3 text-xs font-semibold">
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleCopy(false)}>
                      <ClipboardList className="h-3.5 w-3.5 mr-2" />
                      Copy as Plain Text
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleCopy(true)}>
                      <FileText className="h-3.5 w-3.5 mr-2" />
                      Copy as Markdown
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button size="sm" onClick={handleSave} disabled={saving} className="h-8 gap-1.5 px-4 text-xs font-semibold shadow-sm">
                  <Save className="h-3.5 w-3.5" />
                  {saving ? 'Saving...' : 'Save Story'}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-1 overflow-y-auto">
        {/* Title */}
        {story.title && (
          <EditableField label="Title" value={story.title} onSave={v => updateStory({ title: v })}
            annotations={titleAnnotations} improvedStory={improved} onApplyField={applyField} onDismissAnnotation={dismissAnnotation} />
        )}

        {/* User Story block */}
        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">User Story</div>
          <div className="space-y-1 text-sm">
            <div className="flex items-baseline gap-1.5">
              <span className="font-semibold text-foreground">As a</span>
              <EditableInline value={story.asA} onSave={v => updateStory({ asA: v })} placeholder="[role]" />,
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-semibold text-foreground">I want to</span>
              <EditableInline value={story.iWant} onSave={v => updateStory({ iWant: v })} placeholder="[capability]" />,
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-semibold text-foreground">So that</span>
              <EditableInline value={story.soThat} onSave={v => updateStory({ soThat: v })} placeholder="[value]" />
            </div>
          </div>
          {soThatAnnotations.map((a, i) => (
            <InlineAnnotation key={`so-${i}`} item={a} improvedStory={improved} onApply={() => applyField(mapCriterionToField(a.criterion))} onDismiss={() => dismissAnnotation(a.criterion)} />
          ))}
          {userStoryAnnotations.map((a, i) => (
            <InlineAnnotation key={`us-${i}`} item={a} improvedStory={improved} onApply={() => applyField(mapCriterionToField(a.criterion))} onDismiss={() => dismissAnnotation(a.criterion)} />
          ))}
        </div>

        <EditableField label="Description" value={story.description} onSave={v => updateStory({ description: v })} multiline
          annotations={descAnnotations} improvedStory={improved} onApplyField={applyField} onDismissAnnotation={dismissAnnotation} />

        {/* Acceptance Criteria */}
        <div className="rounded-lg border border-transparent p-3 transition-colors hover:border-border hover:bg-muted/30">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acceptance Criteria</div>
          {story.acceptanceCriteria.length > 0 ? (
            <div className="space-y-3">
              {story.acceptanceCriteria.map((group, gi) => (
                <div key={gi}>
                  <div className="mb-1 text-xs font-medium text-muted-foreground">{group.category}</div>
                  <ul className="space-y-1">
                    {group.items.map((item, ii) => (
                      <li key={ii} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="mt-0.5 text-primary">✓</span>
                        <MarkdownText content={item} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm italic text-muted-foreground">No criteria yet...</p>
          )}
          {acAnnotations.map((a, i) => (
            <InlineAnnotation key={`ac-${i}`} item={a} improvedStory={improved} onApply={() => applyField('acceptanceCriteria')} onDismiss={() => dismissAnnotation(a.criterion)} />
          ))}
        </div>

        {/* Unmatched annotations */}
        {unmatchedAnnotations.length > 0 && (
          <div className="p-3">
            {unmatchedAnnotations.map((a, i) => (
              <InlineAnnotation key={`un-${i}`} item={a} improvedStory={improved} onDismiss={() => dismissAnnotation(a.criterion)} />
            ))}
          </div>
        )}

        {/* Epic warning */}
        {evaluation?.isLikelyEpic && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/5 px-4 py-3 text-sm text-foreground">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="flex-1">This story may be too large — consider splitting it.</span>
            <Button
              size="sm"
              variant="outline"
              disabled={splitting}
              className="gap-1.5 text-xs font-semibold"
              onClick={async () => {
                setSplitting(true);
                try {
                  const result = await api.splitStory({
                    story,
                    agentContext: {
                      productName: productContext.productName,
                      industry: productContext.industry,
                      productType: productContext.productType,
                      platform: productContext.platform,
                      userTypes: productContext.userTypes,
                      productDescription: productContext.productDescription,
                      mission: productContext.mission,
                      persona: productContext.persona,
                      strategy: productContext.strategy,
                      northStar: productContext.northStar,
                      objectives: productContext.objectives,
                    },
                  });
                  setPendingSplitStories(result.stories);
                  setEpicSummary(result.epicSummary);
                  addMessage({
                    id: String(Date.now()),
                    role: 'assistant',
                    content: `I've proposed **${result.stories.length} stories** from this epic:\n\n${result.stories.map((s, i) => `${i + 1}. **${s.title}** — ${s.description}`).join('\n')}\n\nWhich stories would you like to keep? You can say things like "keep all", "drop stories 2 and 4", or "only keep 1, 3, 5".`,
                    options: [{ label: 'Keep all' }, { label: 'Let me choose' }],
                  });
                  toast({ title: '✂️ Epic split!', description: `${result.stories.length} stories generated.` });
                } catch (e) {
                  toast({ title: 'Split failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
                } finally {
                  setSplitting(false);
                }
              }}
            >
              <Scissors className="h-3.5 w-3.5" />
              {splitting ? 'Splitting...' : 'Split Story'}
            </Button>
          </div>
        )}

        {/* Action bar when evaluation present */}
        {evaluation && (
          <div className="flex gap-2 border-t border-border pt-3 mt-2">
            {hasRemainingFailures && (
              <Button size="sm" onClick={() => {
                setStory(evaluation.improvedStory);
                setEvaluation(null);
                addMessage({
                  id: String(Date.now()),
                  role: 'assistant',
                  content: '✅ Story updated with improvements! You can save it or keep refining. Want to start a new story?',
                  options: [{ label: 'Save this story' }, { label: 'Start a new story' }, { label: 'Keep editing' }],
                });
              }} className="flex-1">
                Accept All Improvements
                <Badge variant="secondary" className="ml-1.5 text-[10px]">{remainingFailures.length} fixed</Badge>
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => {
              setEvaluation(null);
              addMessage({
                id: String(Date.now()),
                role: 'assistant',
                content: 'Kept your original story. You can save it or continue editing. Want to start a new story?',
                options: [{ label: 'Save this story' }, { label: 'Start a new story' }, { label: 'Keep editing' }],
              });
            }} className="flex-1">
              Keep Original
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
