import { useState, useRef, useEffect, useCallback } from 'react';
import { useWizard } from '@/context/WizardContext';
import { mockAIChat, getInitialGreeting } from '@/services/mockApi';
import { ChatMessage } from '@/types/wizard';
import { OptionTiles } from '@/components/OptionTiles';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ChatPanel() {
  const { chatHistory, addMessage, story, productContext } = useWizard();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current && chatHistory.length === 0) {
      initialized.current = true;
      const greeting = getInitialGreeting(productContext);
      addMessage(greeting);
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { id: String(Date.now()), role: 'user', content: text };
    addMessage(userMsg);
    setInput('');
    setLoading(true);

    try {
      const response = await mockAIChat(text, story);
      addMessage(response);
    } finally {
      setLoading(false);
    }
  }, [loading, story, addMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1 px-4 py-4">
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
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted text-foreground rounded-bl-md',
                )}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
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
              <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="border-t border-border p-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={loading}
          />
          <Button type="submit" size="icon" disabled={!input.trim() || loading}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
