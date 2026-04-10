-- Signal App — Database Schema
-- Run this in the Supabase SQL editor to create all tables

-- ─────────────────────────────────────────────
-- 1. raw_stories
--    Everything scraped, before filtering
-- ─────────────────────────────────────────────
create table if not exists raw_stories (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  url          text unique not null,
  source       text,          -- 'coindesk', 'reddit/ethereum', 'hn', etc.
  raw_text     text,          -- cleaned body text, no HTML
  published_at timestamptz,
  scraped_at   timestamptz default now(),
  processed    boolean default false
);

-- ─────────────────────────────────────────────
-- 2. scored_stories
--    Filtered + scored by Claude Haiku
-- ─────────────────────────────────────────────
create table if not exists scored_stories (
  id           uuid primary key default gen_random_uuid(),
  raw_story_id uuid references raw_stories(id) on delete cascade,
  title        text not null,
  url          text not null,
  source       text,
  summary      text,          -- Claude's 2-sentence summary
  category     text check (category in ('opportunity', 'idea', 'intel')),
  score        int check (score between 1 and 10),
  why          text,          -- Claude's reasoning (shown on expand)
  published_at timestamptz,
  scored_at    timestamptz default now(),
  seen         boolean default false,
  notified     boolean default false
);

-- ─────────────────────────────────────────────
-- 3. api_usage
--    Token tracking per run (cost monitoring)
-- ─────────────────────────────────────────────
create table if not exists api_usage (
  id              uuid primary key default gen_random_uuid(),
  run_at          timestamptz default now(),
  stories_scored  int,
  input_tokens    int,
  output_tokens   int,
  estimated_cost  numeric(10,6)  -- in USD
);

-- ─────────────────────────────────────────────
-- 4. user_profiles
--    Built for multi-user later; single row for now
-- ─────────────────────────────────────────────
create table if not exists user_profiles (
  id         uuid primary key default gen_random_uuid(),
  name       text default 'default',
  profile    jsonb,           -- serialized user profile
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────
-- 5. push_subscriptions
--    Web Push subscriptions for notifications
-- ─────────────────────────────────────────────
create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  endpoint   text unique not null,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────
create index if not exists idx_raw_stories_processed    on raw_stories(processed);
create index if not exists idx_raw_stories_scraped_at   on raw_stories(scraped_at desc);
create index if not exists idx_scored_stories_score     on scored_stories(score desc);
create index if not exists idx_scored_stories_category  on scored_stories(category);
create index if not exists idx_scored_stories_scored_at on scored_stories(scored_at desc);
create index if not exists idx_scored_stories_seen      on scored_stories(seen);
