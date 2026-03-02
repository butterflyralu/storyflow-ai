
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Product contexts table
CREATE TABLE public.product_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  industry TEXT NOT NULL DEFAULT '',
  product_type TEXT NOT NULL DEFAULT 'b2b',
  platform TEXT NOT NULL DEFAULT 'web',
  user_types TEXT NOT NULL DEFAULT '',
  product_description TEXT NOT NULL DEFAULT '',
  mission TEXT NOT NULL DEFAULT '',
  north_star TEXT NOT NULL DEFAULT '',
  persona TEXT NOT NULL DEFAULT '',
  strategy TEXT NOT NULL DEFAULT '',
  objectives TEXT NOT NULL DEFAULT '',
  ac_format TEXT NOT NULL DEFAULT 'plain',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_contexts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contexts" ON public.product_contexts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contexts" ON public.product_contexts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contexts" ON public.product_contexts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contexts" ON public.product_contexts FOR DELETE USING (auth.uid() = user_id);

-- Chat sessions table
CREATE TABLE public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context_id UUID REFERENCES public.product_contexts(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Session',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON public.chat_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON public.chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.chat_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions" ON public.chat_sessions FOR DELETE USING (auth.uid() = user_id);

-- Chat messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  options JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages" ON public.chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own messages" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
