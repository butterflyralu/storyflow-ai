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

  const saveMessage = useCallback(async (sessionId: string, msg: UIChatMessage): Promise<string | null> => {
    if (!user) return null;
    // Encode either an options array or an inline wizard payload into the jsonb `options` column.
    const payload = msg.wizard
      ? { __wizard: msg.wizard }
      : (msg.options ?? null);
    const { data } = await supabase.from('chat_messages').insert({
      session_id: sessionId,
      user_id: user.id,
      role: msg.role,
      content: msg.content,
      options: payload as any,
    }).select('id').single();
    return data?.id ?? null;
  }, [user]);

  const updateMessageOptions = useCallback(async (
    messageId: string,
    payload: unknown,
  ) => {
    if (!user) return;
    await supabase
      .from('chat_messages')
      .update({ options: payload as any })
      .eq('id', messageId)
      .eq('user_id', user.id);
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
    const sessions = data ?? [];
    if (sessions.length === 0) return [];

    const sessionIds = sessions.map((s: any) => s.id);
    const { data: storyRows } = await supabase
      .from('generated_stories')
      .select('session_id, evaluation_result, created_at')
      .in('session_id', sessionIds)
      .order('created_at', { ascending: false });

    const latestBySession = new Map<string, 'PASS' | 'FAIL' | null>();
    (storyRows ?? []).forEach((r: any) => {
      if (!latestBySession.has(r.session_id)) {
        latestBySession.set(r.session_id, (r.evaluation_result as 'PASS' | 'FAIL') ?? null);
      }
    });

    return sessions.map((s: any) => ({
      ...s,
      evaluation_status: latestBySession.has(s.id) ? latestBySession.get(s.id) ?? null : null,
      has_story: latestBySession.has(s.id),
    }));
  }, [user]);

  const loadMessages = useCallback(async (sessionId: string): Promise<UIChatMessage[]> => {
    if (!user) return [];
    const { data } = await supabase
      .from('chat_messages')
      .select('id, role, content, options, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (!data) return [];
    return data.map((m: any) => {
      const opts = m.options;
      const isWizard = opts && !Array.isArray(opts) && opts.__wizard;
      return {
        id: m.id,
        role: m.role,
        content: m.content,
        options: isWizard ? null : (Array.isArray(opts) ? opts : null),
        wizard: isWizard ? opts.__wizard : null,
      };
    });
  }, [user]);

  return { createSession, saveMessage, updateMessageOptions, updateSessionTitle, loadSessions, loadMessages };
}
