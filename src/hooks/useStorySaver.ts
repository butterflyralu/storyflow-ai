import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import type { StoryDraft, EvaluateResponse } from '@/services/types';

export interface StoryRecord {
  id: string;
  title: string;
  as_a: string;
  i_want: string;
  so_that: string;
  description: string;
  acceptance_criteria: any;
  metadata: any;
  session_id: string | null;
  epic_id: string | null;
  context_id: string | null;
  evaluation_result: string | null;
  evaluation_scorecard: any;
  evaluation_improved_story: any;
  evaluation_learning_insight: any;
  is_likely_epic: boolean;
  created_at: string;
}

export interface EpicWithStories {
  id: string;
  title: string;
  description: string;
  created_at: string;
  stories: StoryRecord[];
}

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
      epicSummary?: string | null;
    } = {}
  ) => {
    if (!user) return null;

    // Build a rich description from the original story
    const acText = originalStory.acceptanceCriteria
      ?.map((g: any) => `- [${g.category}]: ${g.items.join(', ')}`)
      .join('\n') || '';

    const richDescription = [
      `Original Story: ${originalStory.title}`,
      `As a ${originalStory.asA}, I want to ${originalStory.iWant}, so that ${originalStory.soThat}.`,
      '',
      originalStory.description,
      '',
      acText ? `Acceptance Criteria:\n${acText}` : '',
    ].filter(Boolean).join('\n');

    const { data, error } = await supabase
      .from('epics' as any)
      .insert({
        user_id: user.id,
        context_id: opts.contextId ?? null,
        session_id: opts.sessionId ?? null,
        title: opts.epicSummary || originalStory.title,
        description: richDescription,
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
      epicSummary?: string | null;
      cloneSession?: (sourceSessionId: string, newTitle: string, contextId: string | null) => Promise<string | null>;
    } = {}
  ) => {
    const epicId = await createEpic(originalStory, {
      contextId: opts.contextId,
      sessionId: opts.sessionId,
      epicSummary: opts.epicSummary,
    });
    if (!epicId) return null;

    const savedIds: string[] = [];
    for (let i = 0; i < childStories.length; i++) {
      // Clone the parent chat session for each child story
      let childSessionId = opts.sessionId ?? null;
      if (opts.sessionId && opts.cloneSession) {
        const clonedId = await opts.cloneSession(
          opts.sessionId,
          childStories[i].title || `Story ${i + 1}`,
          opts.contextId ?? null
        );
        if (clonedId) childSessionId = clonedId;
      }

      const id = await saveGeneratedStory(childStories[i], {
        contextId: opts.contextId,
        sessionId: childSessionId,
        epicId,
        evaluation: opts.evaluations?.get(i) ?? null,
      });
      if (id) savedIds.push(id);
    }

    return { epicId, storyIds: savedIds };
  }, [createEpic, saveGeneratedStory]);

  const getEpicsWithStories = useCallback(async (contextId?: string | null): Promise<EpicWithStories[]> => {
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
    if (epicIds.length === 0) return (epics as any[]).map((e: any) => ({ ...e, stories: [] }));

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

  const getUngroupedStories = useCallback(async (contextId?: string | null): Promise<StoryRecord[]> => {
    if (!user) return [];

    let query = supabase
      .from('generated_stories' as any)
      .select('*')
      .eq('user_id', user.id)
      .is('epic_id', null)
      .order('created_at', { ascending: false });

    if (contextId) {
      query = query.eq('context_id', contextId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Load ungrouped stories error:', error);
      return [];
    }
    return (data as any[]) || [];
  }, [user]);

  const deleteStory = useCallback(async (storyId: string) => {
    if (!user) return false;
    const { error } = await supabase
      .from('generated_stories' as any)
      .delete()
      .eq('id', storyId)
      .eq('user_id', user.id);
    if (error) {
      console.error('Delete story error:', error);
      return false;
    }
    return true;
  }, [user]);

  const deleteEpic = useCallback(async (epicId: string) => {
    if (!user) return false;
    // First unlink child stories (set epic_id to null)
    await supabase
      .from('generated_stories' as any)
      .update({ epic_id: null } as any)
      .eq('epic_id', epicId);
    // Then delete the epic
    const { error } = await supabase
      .from('epics' as any)
      .delete()
      .eq('id', epicId)
      .eq('user_id', user.id);
    if (error) {
      console.error('Delete epic error:', error);
      return false;
    }
    return true;
  }, [user]);

  const updateEpicTitle = useCallback(async (epicId: string, title: string) => {
    if (!user) return false;
    const { error } = await supabase
      .from('epics' as any)
      .update({ title } as any)
      .eq('id', epicId)
      .eq('user_id', user.id);
    if (error) {
      console.error('Update epic title error:', error);
      return false;
    }
    return true;
  }, [user]);

  const updateStoryEpic = useCallback(async (storyId: string, epicId: string | null) => {
    if (!user) return false;
    const { error } = await supabase
      .from('generated_stories' as any)
      .update({ epic_id: epicId } as any)
      .eq('id', storyId)
      .eq('user_id', user.id);
    if (error) {
      console.error('Update story epic error:', error);
      return false;
    }
    return true;
  }, [user]);

  return {
    saveGeneratedStory,
    createEpic,
    saveEpicWithStories,
    getEpicsWithStories,
    getUngroupedStories,
    deleteStory,
    deleteEpic,
    updateEpicTitle,
    updateStoryEpic,
  };
}
