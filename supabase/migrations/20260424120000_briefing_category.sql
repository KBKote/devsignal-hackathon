-- Allow autonomous agent pipeline to store rows with category 'briefing'.
ALTER TABLE public.scored_stories DROP CONSTRAINT IF EXISTS scored_stories_category_check;

ALTER TABLE public.scored_stories
  ADD CONSTRAINT scored_stories_category_check
  CHECK (category IN ('opportunity', 'idea', 'intel', 'briefing'));
