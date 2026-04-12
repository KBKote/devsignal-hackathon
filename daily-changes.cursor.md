# Changes — 2026-04-11

## Achievements

- Hardened the Haiku scoring pipeline in [`lib/filter.ts`](lib/filter.ts): concurrent batches (`BATCH_CONCURRENCY = 2`), higher `max_tokens` (8192), module-level JSON recovery (`tryParseScoredArray`, string-aware array extraction, object unwrapping), and `parseFailureBatchIndices` surfaced through [`app/api/filter/route.ts`](app/api/filter/route.ts) / feed messaging.
- Feed UX: budget presets in [`lib/pipeline-preferences.ts`](lib/pipeline-preferences.ts) and [`components/PipelinePreferences.tsx`](components/PipelinePreferences.tsx); token stats and terminal copy updates in [`app/feed/page.tsx`](app/feed/page.tsx).
- Freshness: env-driven `FEED_MAX_AGE_DAYS` / `MAX_STORY_AGE_DAYS` to skip stale `published_at` candidates in the filter and apply a REST-only `published_at` cutoff in [`app/api/stories/route.ts`](app/api/stories/route.ts) (RPC unchanged; logged gap).
- Repo hygiene: moved [`gated_onboarding_and_profiles_54afd7e0.plan.md`](docs/plans/gated_onboarding_and_profiles_54afd7e0.plan.md) to `docs/plans/`, screenshots to [`docs/screenshots/artifacts/`](docs/screenshots/artifacts/), removed stray `.git/index 2`, dropped unused `lib/supabase-auth-transport-error.ts`, tracked [`.cursor/skills/daily-changes-log/SKILL.md`](.cursor/skills/daily-changes-log/SKILL.md); pushed `main` to GitHub (`b2488c3..e85b50a`).
- Report-only security + performance audit (supply chain, API review, build/Lighthouse notes where applicable).
- Local OpenClaw removal (LaunchAgent, app, Application Support, prefs) on the user machine — not part of the Signal repo.

## Learnings

- Naive bracket matching for JSON arrays breaks when `[` / `]` appear inside string fields; use a string-aware scan or unwrap `{ "stories": [...] }` before treating a parse as failed.
- `runFilterPipeline` return types must stay in sync with [`app/api/filter/route.ts`](app/api/filter/route.ts) consumers or TypeScript fails at build.
- `intEnv('FEED_MAX_AGE_DAYS', …)` in the filter vs `parseInt(process.env…)` in the stories route are intentionally independent; align env in deploy if you want identical caps (filter also caps parsed days at 30).

## Follow-ups (optional)

- When ready, extend `api_scored_stories_page` so the RPC path applies the same `published_at` window as the REST fallback (migration + function args).
