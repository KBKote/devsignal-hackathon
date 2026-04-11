-- Auth, BYOK, per-user feed. Run in Supabase SQL editor (or supabase db push).
-- Ensure Auth is enabled in Supabase Dashboard.

-- 1) Replace legacy user_profiles with auth-linked rows
DROP TABLE IF EXISTS public.user_profiles CASCADE;

CREATE TABLE public.user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own user_profiles"
  ON public.user_profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2) Encrypted Anthropic key per user (plaintext only on server after decrypt)
CREATE TABLE public.user_api_credentials (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  anthropic_key_ciphertext text NOT NULL,
  anthropic_key_iv text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_api_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own user_api_credentials"
  ON public.user_api_credentials
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3) Per-user scored stories
ALTER TABLE public.scored_stories
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_scored_stories_user_id ON public.scored_stories (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS scored_stories_user_raw_unique
  ON public.scored_stories (user_id, raw_story_id)
  WHERE raw_story_id IS NOT NULL;

ALTER TABLE public.scored_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own scored_stories"
  ON public.scored_stories
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role bypasses RLS for inserts from API routes.

-- 4) Optional: drop global processed flag (per-user scoring uses scored_stories only)
ALTER TABLE public.raw_stories DROP COLUMN IF EXISTS processed;

CREATE INDEX IF NOT EXISTS idx_raw_stories_scraped_at ON public.raw_stories (scraped_at DESC);

-- 5) Push + usage attribution
ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions (user_id);

ALTER TABLE public.api_usage
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON public.api_usage (user_id);
