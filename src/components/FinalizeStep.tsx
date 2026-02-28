import { useState } from 'react';
import { useWizard } from '@/context/WizardContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockSaveStory } from '@/services/mockApi';
import { toast } from '@/hooks/use-toast';
import { Save, RotateCcw, Check } from 'lucide-react';

export function FinalizeStep() {
  const { story, updateStory, saveStory, resetStory } = useWizard();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await mockSaveStory(story);
      saveStory(story);
      toast({ title: '✅ Story saved!', description: 'Your user story has been finalized.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-foreground">Finalize Your Story</h2>
        <p className="mt-1 text-sm text-muted-foreground">Review and save your implementation-ready story</p>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg">User Story</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm text-foreground">
              <strong>As a</strong> {story.asA || '—'},<br />
              <strong>I want to</strong> {story.iWant || '—'},<br />
              <strong>So that</strong> {story.soThat || '—'}
            </p>
          </div>

          {story.description && (
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{story.description}</p>
            </div>
          )}

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acceptance Criteria</div>
            <ul className="space-y-1.5">
              {story.acceptanceCriteria.map((ac, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                  <span>{ac}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Priority</div>
              <Select value={story.priority} onValueChange={v => updateStory({ priority: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Size</div>
              <Select value={story.size} onValueChange={v => updateStory({ size: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="XS">XS</SelectItem>
                  <SelectItem value="S">S</SelectItem>
                  <SelectItem value="M">M</SelectItem>
                  <SelectItem value="L">L</SelectItem>
                  <SelectItem value="XL">XL</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Story'}
        </Button>
        <Button variant="outline" onClick={resetStory}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Start New Story
        </Button>
      </div>
    </div>
  );
}
