
-- Table to store generated stories for AI quality analysis
CREATE TABLE public.generated_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  context_id uuid REFERENCES public.product_contexts(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT '',
  as_a text NOT NULL DEFAULT '',
  i_want text NOT NULL DEFAULT '',
  so_that text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  acceptance_criteria jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  evaluation_result text, -- 'PASS' or 'FAIL'
  evaluation_scorecard jsonb,
  evaluation_improved_story jsonb,
  evaluation_learning_insight jsonb,
  is_likely_epic boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own stories" ON public.generated_stories
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own stories" ON public.generated_stories
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
