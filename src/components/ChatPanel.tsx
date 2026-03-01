import { useState, useRef, useEffect, useCallback } from 'react';
import { useWizard } from '@/context/WizardContext';
import { api } from '@/services/api';
import type { UIChatMessage } from '@/types/wizard';
import { EMPTY_STORY } from '@/types/wizard';
import { OptionTiles } from '@/components/OptionTiles';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MarkdownText } from '@/components/MarkdownText';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ChatPanel() {
  const {
    chatHistory, addMessage, story, updateStory,
    productContext, contextId, sessionId,
    setEvaluation, setStep, saveStory, resetStory,
    pendingSplitStories, confirmSplitStories, clearPendingSplit,
    setEpicSummary, setSplitStories,
  } = useWizard();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const storyRef = useRef(story);
  storyRef.current = story;

  // Initial greeting
  useEffect(() => {
    if (!initialized.current && chatHistory.length === 0) {
      initialized.current = true;
      const greeting: UIChatMessage = {
        id: String(Date.now()),
        role: 'assistant',
        content: 'What user story would you like to draft? Just describe what you have in mind — I\'ll help shape it.',
      };
      addMessage(greeting);
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: UIChatMessage = { id: String(Date.now()), role: 'user', content: text };
    addMessage(userMsg);
    setInput('');

    const lower = text.toLowerCase();

    if (lower.includes('save this story')) {
      try {
        await new Promise(r => setTimeout(r, 500));
        saveStory(storyRef.current);
        addMessage({ id: String(Date.now() + 1), role: 'assistant', content: '✅ Story saved! You can start a new story whenever you\'re ready.', options: [{ label: 'Start a new story' }] });
      } catch {
        addMessage({ id: String(Date.now() + 1), role: 'assistant', content: 'Failed to save. Please try again.' });
      }
      return;
    }

    if (lower.includes('start a new story')) {
      resetStory();
      addMessage({ id: String(Date.now() + 1), role: 'assistant', content: 'Fresh start! What user story would you like to draft?', options: [{ label: '🔐 Authentication story' }, { label: '📊 Dashboard feature' }, { label: '🔔 Notifications' }, { label: '✏️ Something else' }] });
      return;
    }

    setLoading(true);

    try {
      const history = [...chatHistory, userMsg].map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const currentStory = storyRef.current;

      const pendingSplitContext = pendingSplitStories.length > 0
        ? `\n\nPending Split Stories (user is deciding which to keep):\n${pendingSplitStories.map((s, i) => `${i + 1}. ${s.title} — ${s.description}`).join('\n')}`
        : '';

      const response = await api.storyAgent({
        message: text + pendingSplitContext,
        sessionId,
        contextId: contextId || '',
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
          acFormat: productContext.acFormat || 'plain',
        },
        history,
        storyDraft: {
          title: currentStory.title || '',
          asA: currentStory.asA || '',
          iWant: currentStory.iWant || '',
          soThat: currentStory.soThat || '',
          description: currentStory.description || '',
          acceptanceCriteria: currentStory.acceptanceCriteria || [],
          metadata: currentStory.metadata || { project: '', epic: '', priority: '', estimate: '' },
        },
      });

      updateStory(response.storyDraft);

      // Handle split confirmation
      if (response.confirmSplit && response.confirmSplit.length > 0 && pendingSplitStories.length > 0) {
        const indices = response.confirmSplit.map(i => i - 1); // Convert 1-based to 0-based
        confirmSplitStories(indices);
      }

      const aiMsg: UIChatMessage = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: response.message,
        options: response.options,
      };
      addMessage(aiMsg);

      if (response.awaitingCriteriaConfirmation) {
        const confirmLower = text.toLowerCase();
        const isConfirm = confirmLower.includes('yes') || confirmLower.includes('looks good') || confirmLower.includes('good');
        if (isConfirm) {
          setLoading(true);
          const evalMsg: UIChatMessage = {
            id: String(Date.now() + 2),
            role: 'assistant',
            content: '⏳ Running quality evaluation...',
          };
          addMessage(evalMsg);
          try {
            const evalResult = await api.evaluateStory({
              sessionId,
              contextId: contextId || '',
              story: response.storyDraft,
            });
            setEvaluation(evalResult);
            addMessage({
              id: String(Date.now() + 4),
              role: 'assistant',
              content: '✅ Evaluation complete — check the annotations in your story draft on the right.',
            });
          } catch {
            addMessage({
              id: String(Date.now() + 3),
              role: 'assistant',
              content: 'Evaluation failed. You can try again.',
              options: [{ label: 'Yes, looks good' }],
            });
          }
          return;
        }
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Something went wrong. Please try again.';
      addMessage({
        id: String(Date.now() + 1),
        role: 'assistant',
        content: `⚠️ ${errMsg}`,
        options: [{ label: 'Try again' }],
      });
    } finally {
      setLoading(false);
    }
  }, [loading, chatHistory, addMessage, updateStory, productContext, contextId, sessionId, setEvaluation, setStep]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="flex h-full flex-col bg-card/50">
      <ScrollArea className="flex-1 px-5 py-5">
        <div className="space-y-4">
          {chatHistory.map(msg => (
            <div
              key={msg.id}
              className={cn(
                'flex',
                msg.role === 'user' ? 'justify-end' : 'justify-start',
              )}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-sm shadow-soft'
                    : 'bg-card text-foreground rounded-bl-sm border border-border shadow-card',
                )}
              >
                <MarkdownText content={msg.content} />
                {msg.options && msg.options.length > 0 && (
                  <div className="mt-3">
                    <OptionTiles options={msg.options} onSelect={sendMessage} />
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm bg-card border border-border px-4 py-3 shadow-card">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="border-t border-border bg-card p-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 rounded-xl border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={loading}
          />
          <Button type="submit" size="icon" disabled={!input.trim() || loading} className="rounded-xl h-10 w-10">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
