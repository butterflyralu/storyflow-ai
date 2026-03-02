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
    } = {}
  ) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('generated_stories' as any)
      .insert({
        user_id: user.id,
        context_id: opts.contextId ?? null,
        session_id: opts.sessionId ?? null,
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

  return { saveGeneratedStory };
}
