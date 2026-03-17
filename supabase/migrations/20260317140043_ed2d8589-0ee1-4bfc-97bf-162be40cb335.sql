DROP POLICY "Service can insert usage logs" ON public.api_usage_logs;
CREATE POLICY "Users can insert own usage logs"
  ON public.api_usage_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);