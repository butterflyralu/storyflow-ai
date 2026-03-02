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
import { usePersistedChat } from '@/hooks/usePersistedChat';

export function ChatPanel() {
  const {
    chatHistory, addMessage, story, updateStory,
    productContext, contextId, sessionId,
    setEvaluation, setStep, saveStory, resetStory,
    pendingSplitStories, confirmSplitStories, clearPendingSplit,
    setEpicSummary, setSplitStories,
    dbSessionId, setDbSessionId,
    triggerSidebarRefresh,
  } = useWizard();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef(story);
  storyRef.current = story;
  const { createSession, saveMessage, updateSessionTitle } = usePersistedChat();
  const sessionTitleRef = useRef<string>('');

  // Initial greeting - show when no chat history (new session)
  useEffect(() => {
    if (chatHistory.length === 0) {
      const greeting: UIChatMessage = {
        id: String(Date.now()),
        role: 'assistant',
        content: productContext.productName
          ? `What user story would you like to draft for **${productContext.productName}**? Just describe what you have in mind — I'll help shape it.`
          : 'What user story would you like to draft? Just describe what you have in mind — I\'ll help shape it.',
      };
      addMessage(greeting);
    }
  }, [dbSessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const ensureSession = useCallback(async () => {
    if (!dbSessionId) {
      const sid = await createSession(contextId, 'Story session');
      if (sid) setDbSessionId(sid);
      return sid;
    }
    return dbSessionId;
  }, [createSession, contextId, dbSessionId, setDbSessionId]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const dbSid = await ensureSession();
    const userMsg: UIChatMessage = { id: String(Date.now()), role: 'user', content: text };
    addMessage(userMsg);
    if (dbSid) saveMessage(dbSid, userMsg);
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
      sessionTitleRef.current = '';
      // Create a new DB session
      const newSid = await createSession(contextId, 'New story');
      if (newSid) {
        setDbSessionId(newSid);
        triggerSidebarRefresh();
      }
      // Generate context-aware suggestions
      setLoading(true);
      try {
        const response = await api.storyAgent({
          message: `Suggest 4 brief user story topic ideas for ${productContext.productName} (${productContext.industry}, ${productContext.platform}). Target persona: ${productContext.persona}. Objectives: ${productContext.objectives}. Reply ONLY with a JSON array of 4 short labels, e.g. ["Label 1","Label 2","Label 3","Label 4"]. No other text.`,
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
          history: [],
          storyDraft: { title: '', asA: '', iWant: '', soThat: '', description: '', acceptanceCriteria: [], metadata: { project: '', epic: '', priority: 'Medium', estimate: '' } },
        });
        // Try to parse suggestions from the agent response
        let suggestions: { label: string }[] = [];
        try {
          const parsed = JSON.parse(response.message);
          if (Array.isArray(parsed)) {
            suggestions = parsed.slice(0, 4).map((s: string) => ({ label: s }));
          }
        } catch {
          // If agent didn't return JSON, use response options or fallback
          suggestions = response.options || [{ label: '✏️ Describe your story idea' }];
        }
        suggestions.push({ label: '✏️ Something else' });
        addMessage({ id: String(Date.now() + 1), role: 'assistant', content: `Fresh start! Here are some story ideas for **${productContext.productName}**:`, options: suggestions });
      } catch {
        addMessage({ id: String(Date.now() + 1), role: 'assistant', content: 'Fresh start! What user story would you like to draft?', options: [{ label: '✏️ Describe your story idea' }] });
      } finally {
        setLoading(false);
      }
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

      // Rename session to story title when it first appears
      if (response.storyDraft.title && response.storyDraft.title !== sessionTitleRef.current && dbSid) {
        sessionTitleRef.current = response.storyDraft.title;
        updateSessionTitle(dbSid, response.storyDraft.title);
      }

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
      if (dbSid) saveMessage(dbSid, aiMsg);

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
  }, [loading, chatHistory, addMessage, updateStory, productContext, contextId, sessionId, setEvaluation, setStep, ensureSession, saveMessage]);

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
