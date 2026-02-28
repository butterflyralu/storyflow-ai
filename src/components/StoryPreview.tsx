import { useState } from 'react';
import { useWizard } from '@/context/WizardContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Pencil, Check, X, AlertTriangle, Save, Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { EvaluationScorecardItem, StoryDraft } from '@/services/types';

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
  item, improvedStory, onApply,
}: {
  item: EvaluationScorecardItem;
  improvedStory?: StoryDraft;
  onApply?: () => void;
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
  label, value, onSave, multiline = false, annotations, improvedStory, onApplyField,
}: {
  label: string; value: string; onSave: (val: string) => void; multiline?: boolean;
  annotations?: EvaluationScorecardItem[];
  improvedStory?: StoryDraft;
  onApplyField?: (field: StoryField) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const save = () => { onSave(draft); setEditing(false); };
  const cancel = () => { setDraft(value); setEditing(false); };

  return (
    <div className="group relative rounded-lg border border-transparent p-3 transition-colors hover:border-border hover:bg-muted/30">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      {editing ? (
        <div className="flex gap-2">
          {multiline ? (
            <textarea value={draft} onChange={e => setDraft(e.target.value)}
              className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring" rows={3} autoFocus />
          ) : (
            <input value={draft} onChange={e => setDraft(e.target.value)}
              className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring" autoFocus />
          )}
          <div className="flex flex-col gap-1">
            <button onClick={save} className="rounded p-1 text-primary hover:bg-primary/10"><Check className="h-3.5 w-3.5" /></button>
            <button onClick={cancel} className="rounded p-1 text-muted-foreground hover:bg-muted"><X className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between">
          <p className={cn('text-sm text-foreground', !value && 'italic text-muted-foreground')}>{value || 'Not yet defined...'}</p>
          <button onClick={() => { setDraft(value); setEditing(true); }} className="ml-2 opacity-0 transition-opacity group-hover:opacity-100">
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      )}
      {annotations?.map((a, i) => (
        <InlineAnnotation key={i} item={a} improvedStory={improvedStory}
          onApply={onApplyField ? () => onApplyField(mapCriterionToField(a.criterion)) : undefined} />
      ))}
    </div>
  );
}

function EditableInline({ value, onSave, placeholder }: { value: string; onSave: (val: string) => void; placeholder: string }) {
// ... keep existing code
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

export function StoryPreview() {
  const { story, updateStory, evaluation, setStory, setEvaluation, saveStory, addMessage, resetStory } = useWizard();
  const [saving, setSaving] = useState(false);

  const formatForJira = () => {
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

  const handleCopy = async () => {
    await navigator.clipboard.writeText(formatForJira());
    toast({ title: '📋 Copied to clipboard!', description: 'Paste it into Jira.' });
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    saveStory(story);
    setSaving(false);
    toast({ title: '✅ Story saved!', description: 'Your user story has been finalized.' });
  };

  const improved = evaluation?.improvedStory;
  const failItems = evaluation?.scorecard;
  const titleAnnotations = getAnnotationsForField(failItems, 'title');
  const userStoryAnnotations = getAnnotationsForField(failItems, 'userStory');
  const soThatAnnotations = getAnnotationsForField(failItems, 'soThat');
  const descAnnotations = getAnnotationsForField(failItems, 'description');
  const acAnnotations = getAnnotationsForField(failItems, 'acceptanceCriteria');
  const unmatchedAnnotations = getAnnotationsForField(failItems, 'unmatched');

  const hasFailures = evaluation && evaluation.scorecard.some(i => i.result === 'FAIL');

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
    toast({ title: '✅ Applied', description: `Updated ${field} with the suggested improvement.` });
  };

  return (
    <Card className="flex h-full flex-col overflow-hidden border-0 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Story Draft</CardTitle>
          <div className="flex items-center gap-2">
            {evaluation && (
              <Badge variant={evaluation.overallResult === 'PASS' ? 'default' : 'secondary'} className="text-xs">
                {evaluation.scorecard.filter(i => i.result === 'PASS').length}/{evaluation.scorecard.length} passed
              </Badge>
            )}
            <Badge variant="outline">{story.metadata.priority || 'Medium'}</Badge>
            {story.title && (
              <>
                <Button size="sm" variant="outline" onClick={handleCopy} className="h-8 gap-1.5 px-3 text-xs font-semibold">
                  <Copy className="h-3.5 w-3.5" />
                  Copy for Jira
                </Button>
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
            annotations={titleAnnotations} improvedStory={improved} onApplyField={applyField} />
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
            <InlineAnnotation key={`so-${i}`} item={a} improvedStory={improved} onApply={() => applyField(mapCriterionToField(a.criterion))} />
          ))}
          {userStoryAnnotations.map((a, i) => (
            <InlineAnnotation key={`us-${i}`} item={a} improvedStory={improved} onApply={() => applyField(mapCriterionToField(a.criterion))} />
          ))}
        </div>

        <EditableField label="Description" value={story.description} onSave={v => updateStory({ description: v })} multiline
          annotations={descAnnotations} improvedStory={improved} onApplyField={applyField} />

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
                        <span>{item}</span>
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
            <InlineAnnotation key={`ac-${i}`} item={a} improvedStory={improved} onApply={() => applyField('acceptanceCriteria')} />
          ))}
        </div>

        {/* Unmatched annotations */}
        {unmatchedAnnotations.length > 0 && (
          <div className="p-3">
            {unmatchedAnnotations.map((a, i) => (
              <InlineAnnotation key={`un-${i}`} item={a} improvedStory={improved} />
            ))}
          </div>
        )}

        {/* Epic warning */}
        {evaluation?.isLikelyEpic && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/5 px-4 py-3 text-sm text-foreground">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            This story may be too large — consider splitting it.
          </div>
        )}

        {/* Action bar when evaluation present */}
        {evaluation && (
          <div className="flex gap-2 border-t border-border pt-3 mt-2">
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
              {hasFailures && <Badge variant="secondary" className="ml-1.5 text-[10px]">{evaluation.scorecard.filter(i => i.result === 'FAIL').length} fixed</Badge>}
            </Button>
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
