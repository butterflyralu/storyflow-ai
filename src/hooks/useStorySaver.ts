import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import type { StoryDraft, EvaluateResponse } from '@/services/types';

export function useStorySaver() {
  const { user } = useAuth();

  const saveGeneratedStory = useCallback(async (
    story: StoryDraft,
    opts: {
      contextId?: string | null;
      sessionId?: string | null;
      evaluation?: EvaluateResponse | null;
      epicId?: string | null;
    } = {}
  ) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('generated_stories' as any)
      .insert({
        user_id: user.id,
        context_id: opts.contextId ?? null,
        session_id: opts.sessionId ?? null,
        epic_id: opts.epicId ?? null,
        title: story.title,
        as_a: story.asA,
        i_want: story.iWant,
        so_that: story.soThat,
        description: story.description,
        acceptance_criteria: story.acceptanceCriteria,
        metadata: story.metadata,
        evaluation_result: opts.evaluation?.overallResult ?? null,
        evaluation_scorecard: opts.evaluation?.scorecard ?? null,
        evaluation_improved_story: opts.evaluation?.improvedStory ?? null,
        evaluation_learning_insight: opts.evaluation?.learningInsight ?? null,
        is_likely_epic: opts.evaluation?.isLikelyEpic ?? false,
      } as any)
      .select('id')
      .single();
    if (error) console.error('Save story error:', error);
    return (data as any)?.id ?? null;
  }, [user]);

  const createEpic = useCallback(async (
    originalStory: StoryDraft,
    opts: {
      contextId?: string | null;
      sessionId?: string | null;
    } = {}
  ) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('epics' as any)
      .insert({
        user_id: user.id,
        context_id: opts.contextId ?? null,
        session_id: opts.sessionId ?? null,
        title: originalStory.title,
        description: originalStory.description,
        original_as_a: originalStory.asA,
        original_i_want: originalStory.iWant,
        original_so_that: originalStory.soThat,
      } as any)
      .select('id')
      .single();
    if (error) {
      console.error('Create epic error:', error);
      return null;
    }
    return (data as any)?.id ?? null;
  }, [user]);

  const saveEpicWithStories = useCallback(async (
    originalStory: StoryDraft,
    childStories: StoryDraft[],
    opts: {
      contextId?: string | null;
      sessionId?: string | null;
      evaluations?: Map<number, EvaluateResponse>;
    } = {}
  ) => {
    const epicId = await createEpic(originalStory, opts);
    if (!epicId) return null;

    const savedIds: string[] = [];
    for (let i = 0; i < childStories.length; i++) {
      const id = await saveGeneratedStory(childStories[i], {
        contextId: opts.contextId,
        sessionId: opts.sessionId,
        epicId,
        evaluation: opts.evaluations?.get(i) ?? null,
      });
      if (id) savedIds.push(id);
    }

    return { epicId, storyIds: savedIds };
  }, [createEpic, saveGeneratedStory]);

  const getEpicsWithStories = useCallback(async (contextId?: string | null) => {
    if (!user) return [];

    let query = supabase
      .from('epics' as any)
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (contextId) {
      query = query.eq('context_id', contextId);
    }

    const { data: epics, error: epicsError } = await query;
    if (epicsError || !epics) {
      console.error('Load epics error:', epicsError);
      return [];
    }

    const epicIds = (epics as any[]).map((e: any) => e.id);
    if (epicIds.length === 0) return [];

    const { data: stories, error: storiesError } = await supabase
      .from('generated_stories' as any)
      .select('*')
      .in('epic_id', epicIds)
      .order('created_at', { ascending: true });

    if (storiesError) {
      console.error('Load epic stories error:', storiesError);
    }

    return (epics as any[]).map((epic: any) => ({
      ...epic,
      stories: ((stories as any[]) || []).filter((s: any) => s.epic_id === epic.id),
    }));
  }, [user]);

  return { saveGeneratedStory, createEpic, saveEpicWithStories, getEpicsWithStories };
}
