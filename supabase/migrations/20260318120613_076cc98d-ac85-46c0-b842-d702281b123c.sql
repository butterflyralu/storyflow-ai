
-- Add UPDATE and DELETE policies on generated_stories
CREATE POLICY "Users can update own stories"
  ON public.generated_stories
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own stories"
  ON public.generated_stories
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Add DELETE policy on chat_messages
CREATE POLICY "Users can delete own messages"
  ON public.chat_messages
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Add UPDATE policy on chat_messages (for future use)
CREATE POLICY "Users can update own messages"
  ON public.chat_messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
