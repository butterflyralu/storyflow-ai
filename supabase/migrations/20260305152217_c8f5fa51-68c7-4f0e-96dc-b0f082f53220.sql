
-- Create epics table
CREATE TABLE public.epics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  context_id UUID REFERENCES public.product_contexts(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  original_as_a TEXT NOT NULL DEFAULT '',
  original_i_want TEXT NOT NULL DEFAULT '',
  original_so_that TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add epic_id to generated_stories
ALTER TABLE public.generated_stories
  ADD COLUMN epic_id UUID REFERENCES public.epics(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.epics ENABLE ROW LEVEL SECURITY;

-- RLS policies for epics
CREATE POLICY "Users can insert own epics"
  ON public.epics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own epics"
  ON public.epics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own epics"
  ON public.epics FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own epics"
  ON public.epics FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all epics"
  ON public.epics FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));
