import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import type { UIChatMessage } from '@/types/wizard';

export function usePersistedChat() {
  const { user } = useAuth();

  const createSession = useCallback(async (contextId: string | null, title: string): Promise<string | null> => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: user.id,
        context_id: contextId,
        title,
      })
      .select('id')
      .single();
    if (error) { console.error('Create session error:', error); return null; }
    return data?.id ?? null;
  }, [user]);

  const saveMessage = useCallback(async (sessionId: string, msg: UIChatMessage) => {
    if (!user) return;
    await supabase.from('chat_messages').insert({
      session_id: sessionId,
      user_id: user.id,
      role: msg.role,
      content: msg.content,
      options: msg.options ?? null,
    });
  }, [user]);

  const updateSessionTitle = useCallback(async (sessionId: string, title: string) => {
    if (!user) return;
    await supabase
      .from('chat_sessions')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('user_id', user.id);
  }, [user]);

  const loadSessions = useCallback(async (contextId?: string) => {
    if (!user) return [];
    let query = supabase
      .from('chat_sessions')
      .select('id, title, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    if (contextId) query = query.eq('context_id', contextId);
    const { data } = await query;
    return data ?? [];
  }, [user]);

  const loadMessages = useCallback(async (sessionId: string): Promise<UIChatMessage[]> => {
    if (!user) return [];
    const { data } = await supabase
      .from('chat_messages')
      .select('id, role, content, options, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (!data) return [];
    return data.map((m: any) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      options: m.options,
    }));
  }, [user]);

  const cloneSession = useCallback(async (
    sourceSessionId: string,
    newTitle: string,
    contextId: string | null
  ): Promise<string | null> => {
    if (!user) return null;

    // Create a new session
    const newSessionId = await createSession(contextId, newTitle);
    if (!newSessionId) return null;

    // Load messages from the source session
    const messages = await loadMessages(sourceSessionId);

    // Copy all messages into the new session
    for (const msg of messages) {
      await supabase.from('chat_messages').insert({
        session_id: newSessionId,
        user_id: user.id,
        role: msg.role,
        content: msg.content,
        options: msg.options ?? null,
      });
    }

    return newSessionId;
  }, [user, createSession, loadMessages]);

  return { createSession, saveMessage, updateSessionTitle, loadSessions, loadMessages, cloneSession };
}
