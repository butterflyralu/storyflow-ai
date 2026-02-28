import { useState } from 'react';
import { useWizard } from '@/context/WizardContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Save, RotateCcw, Check } from 'lucide-react';

export function FinalizeStep() {
  const { story, updateStory, saveStory, resetStory } = useWizard();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // In mock mode this is instant; when real API is live use api.saveStory()
      await new Promise(r => setTimeout(r, 500));
      saveStory(story);
      toast({ title: '✅ Story saved!', description: 'Your user story has been finalized.' });
    } finally {
      setSaving(false);
    }
  };

  const updateMetadata = (field: string, value: string) => {
    updateStory({ metadata: { ...story.metadata, [field]: value } });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-foreground">Finalize Your Story</h2>
        <p className="mt-1 text-sm text-muted-foreground">Review and save your implementation-ready story</p>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg">
            {story.title || 'User Story'}
          </CardTitle>
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
            {story.acceptanceCriteria.length > 0 ? (
              <div className="space-y-3">
                {story.acceptanceCriteria.map((group, gi) => (
                  <div key={gi}>
                    <div className="mb-1 text-xs font-medium text-muted-foreground">{group.category}</div>
                    <ul className="space-y-1.5">
                      {group.items.map((item, ii) => (
                        <li key={ii} className="flex items-start gap-2 text-sm text-foreground">
                          <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm italic text-muted-foreground">No criteria defined.</p>
            )}
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Priority</div>
              <Select value={story.metadata.priority || 'Medium'} onValueChange={v => updateMetadata('priority', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estimate</div>
              <Select value={story.metadata.estimate || '3'} onValueChange={v => updateMetadata('estimate', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 point</SelectItem>
                  <SelectItem value="2">2 points</SelectItem>
                  <SelectItem value="3">3 points</SelectItem>
                  <SelectItem value="5">5 points</SelectItem>
                  <SelectItem value="8">8 points</SelectItem>
                  <SelectItem value="13">13 points</SelectItem>
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
