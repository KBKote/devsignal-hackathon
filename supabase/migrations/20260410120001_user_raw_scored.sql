-- Tracks which raw_stories have already been scored for each user (including noise),
-- without storing low-signal rows in scored_stories.

CREATE TABLE IF NOT EXISTS public.user_raw_scored (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  raw_story_id uuid NOT NULL REFERENCES public.raw_stories (id) ON DELETE CASCADE,
  scored_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, raw_story_id)
);

CREATE INDEX IF NOT EXISTS idx_user_raw_scored_user ON public.user_raw_scored (user_id);

ALTER TABLE public.user_raw_scored ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own user_raw_scored"
  ON public.user_raw_scored
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
