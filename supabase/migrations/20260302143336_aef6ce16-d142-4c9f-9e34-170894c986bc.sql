
-- Security definer function to check admin by email
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _user_id
      AND email = 'ralucapiteiu@gmail.com'
  )
$$;

-- Allow admin to read ALL generated stories
CREATE POLICY "Admin can view all stories"
  ON public.generated_stories
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));
