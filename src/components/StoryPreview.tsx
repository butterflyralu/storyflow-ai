import { useWizard } from '@/context/WizardContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Pencil, Check, X } from 'lucide-react';

function EditableField({
  label,
  value,
  onSave,
  multiline = false,
}: {
  label: string;
  value: string;
  onSave: (val: string) => void;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const save = () => {
    onSave(draft);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  return (
    <div className="group relative rounded-lg border border-transparent p-3 transition-colors hover:border-border hover:bg-muted/30">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {editing ? (
        <div className="flex gap-2">
          {multiline ? (
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              rows={3}
              autoFocus
            />
          ) : (
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              autoFocus
            />
          )}
          <div className="flex flex-col gap-1">
            <button onClick={save} className="rounded p-1 text-primary hover:bg-primary/10">
              <Check className="h-3.5 w-3.5" />
            </button>
            <button onClick={cancel} className="rounded p-1 text-muted-foreground hover:bg-muted">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between">
          <p className={cn('text-sm text-foreground', !value && 'italic text-muted-foreground')}>
            {value || 'Not yet defined...'}
          </p>
          <button
            onClick={() => { setDraft(value); setEditing(true); }}
            className="ml-2 opacity-0 transition-opacity group-hover:opacity-100"
          >
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      )}
    </div>
  );
}
function EditableInline({
  value,
  onSave,
  placeholder,
}: {
  value: string;
  onSave: (val: string) => void;
  placeholder: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const save = () => { onSave(draft); setEditing(false); };
  const cancel = () => { setDraft(value); setEditing(false); };

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          className="rounded border border-input bg-background px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
        />
        <button onClick={save} className="rounded p-0.5 text-primary hover:bg-primary/10"><Check className="h-3 w-3" /></button>
        <button onClick={cancel} className="rounded p-0.5 text-muted-foreground hover:bg-muted"><X className="h-3 w-3" /></button>
      </span>
    );
  }

  return (
    <span
      onClick={() => { setDraft(value); setEditing(true); }}
      className={cn(
        'cursor-pointer rounded px-1 py-0.5 transition-colors hover:bg-muted',
        value ? 'text-foreground' : 'italic text-muted-foreground',
      )}
    >
      {value || placeholder}
    </span>
  );
}

export function StoryPreview() {
  const { story, updateStory } = useWizard();

  return (
    <Card className="h-full border-0 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Story Draft</CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline">{story.priority}</Badge>
            <Badge variant="secondary">{story.size}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {/* Unified User Story block */}
        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            User Story
          </div>
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
        </div>

        <EditableField label="Description" value={story.description} onSave={v => updateStory({ description: v })} multiline />

        <div className="rounded-lg border border-transparent p-3 transition-colors hover:border-border hover:bg-muted/30">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Acceptance Criteria
          </div>
          {story.acceptanceCriteria.length > 0 ? (
            <ul className="space-y-1.5">
              {story.acceptanceCriteria.map((ac, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="mt-0.5 text-primary">✓</span>
                  <span>{ac}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm italic text-muted-foreground">No criteria yet...</p>
          )}
        </div>

        {story.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 p-3">
            {story.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
