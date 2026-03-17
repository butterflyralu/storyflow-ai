CREATE TABLE public.api_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  function_name text NOT NULL,
  model text NOT NULL,
  prompt_tokens integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  estimated_cost_usd numeric(10, 6) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read usage logs
CREATE POLICY "Admin can view all usage logs"
  ON public.api_usage_logs FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Edge functions insert via service role, so no INSERT policy needed for users
-- But we allow authenticated inserts for the edge function context
CREATE POLICY "Service can insert usage logs"
  ON public.api_usage_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create index for efficient querying
CREATE INDEX idx_usage_logs_user_id ON public.api_usage_logs(user_id);
CREATE INDEX idx_usage_logs_created_at ON public.api_usage_logs(created_at);