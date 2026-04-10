# Signal — Personal Intelligence Briefing App

## What This Project Is
A personalized web app that scrapes the internet (RSS feeds, Reddit, Hacker News) for AI, crypto, and tech news, filters everything through Claude AI based on a user profile, and surfaces only the high-signal information worth acting on. Built by someone early in their crypto/AI journey who wants to spot opportunities without drowning in noise.

## Tech Stack
- **Frontend/Backend:** Next.js 16 (App Router)
- **Database:** Supabase (Postgres)
- **AI Filtering:** Claude Haiku via Anthropic API (cheapest model, batched calls)
- **Data Sources:** RSS feeds, Reddit API, Hacker News API (all free)
- **Hosting:** Vercel (free tier)
- **Styling:** Tailwind CSS

## Commands
```bash
npm run dev        # Start local development server (localhost:3000)
npm run build      # Build for production
npm run lint       # Run ESLint
npx supabase start # Start local Supabase instance (if using local dev)
```

## Project Structure
```
signal/
├── CLAUDE.md                  # This file
├── .claude/
│   ├── agents/                # Sub-agent definitions
│   │   ├── scraper.md         # Handles data collection from all sources
│   │   ├── filter.md          # Handles Claude AI scoring and filtering
│   │   └── briefing.md        # Handles formatting and delivery
│   └── commands/              # Custom slash commands
│       ├── scrape.md          # /scrape — manually trigger a data collection run
│       └── brief.md           # /brief — generate a fresh briefing on demand
├── app/                       # Next.js App Router pages
│   ├── page.tsx               # Main feed page
│   ├── layout.tsx             # Root layout
│   └── api/
│       ├── scrape/route.ts    # API endpoint: trigger scraper
│       └── brief/route.ts     # API endpoint: generate briefing
├── lib/
│   ├── scraper/               # Data collection modules
│   │   ├── rss.ts             # RSS feed parser
│   │   ├── reddit.ts          # Reddit API client
│   │   └── hn.ts              # Hacker News API client
│   ├── filter.ts              # Claude Haiku filtering logic
│   ├── supabase.ts            # Supabase client
│   └── user-profile.ts        # User profile — what Claude uses to score relevance
├── components/                # React UI components
│   ├── FeedCard.tsx           # Individual story card
│   ├── CategoryFilter.tsx     # Opportunities / Ideas / Intel tabs
│   └── NotificationBell.tsx   # Push notification toggle
└── .env.local                 # API keys (never commit this)
```

## Architecture: How Data Flows
```
[Cron: every 4 hours]
       ↓
[Scraper Agent] → fetches RSS + Reddit + HN → raw_stories table
       ↓
[Filter Agent]  → batches stories → Claude Haiku scores each → scored_stories table
       ↓
[Web App]       → reads scored_stories → displays by category
       ↓
[Push Notif]    → fires if Opportunity score > 8/10
```

## The User Profile (What Claude Uses to Filter)
Stored in `lib/user-profile.ts`. This is the core of why this app is different from a regular news aggregator. Claude scores every story against this profile.

Key profile attributes:
- 3-4 years crypto experience, Ethereum ecosystem focus
- New to software development (1-2 months), building in AI/crypto intersection
- Goal: spot opportunities (arb strategies, early projects, market inefficiencies)
- Goal: find project ideas worth building
- Goal: stay informed enough to contribute to conversations at startups
- Noise sensitivity: HIGH — surface only what's worth acting on

## Cost Controls (IMPORTANT)
- Use `claude-haiku-4-5-20251001` ONLY — never Sonnet or Opus for filtering
- Always batch stories into a single prompt (never one API call per story)
- Pre-filter by keyword BEFORE sending to Claude (halves token usage)
- Target: < $3/month in API costs
- Log token usage on every Claude API call to `api_usage` table

## Constraints — Never Do These
- Never commit `.env.local` — it contains API keys
- Never call Claude API per-story — always batch minimum 10 stories per call
- Never store raw HTML in the database — strip to text only
- Never show unscored stories in the UI — everything must pass through the filter
- Never use Sonnet/Opus for the filtering pipeline — Haiku only

## Claude Learning Log
- When Claude makes a mistake in code, document the exact mistake here immediately.
- Add the failed prompt, reasoning, or pattern that produced the bug so we know not to repeat it.
- If a fix or a working prompt/approach is found, add that too with a short note on why it worked.
- Treat this file as the single source of truth for known Claude coding pitfalls and successful patterns.

---

### Build 1 — Initial full-app scaffold (Phases 1–5)

**BUG 1: `create-next-app` refuses to run in a directory with existing files**
- Symptom: `The directory signal contains files that could conflict: CLAUDE.md`
- Root cause: `create-next-app` won't init into a non-empty directory.
- Fix: scaffold into a temp sibling directory (`signal-tmp`), then `rsync -a --ignore-existing` into the real dir. Works cleanly.

**BUG 2: Supabase client created at module load → crashes Next.js static build**
- Symptom: `Error: supabaseUrl is required` during `next build`, emitted from `lib/supabase.ts`.
- Root cause: `createClient(...)` was called at the top level of the module, which runs during Next.js static generation when env vars are not present.
- Fix: wrap clients in lazy getter functions (called on first use, not on import). Used a `Proxy` to keep the same `supabase` / `supabaseAdmin` export names so no callers needed changing.
- **Pattern to follow for all future singleton clients that depend on env vars: always initialize lazily.**

**BUG 3: `web-push.setVapidDetails()` at module load → crashes Next.js static build**
- Symptom: `Error: No key set vapidDetails.publicKey` during `next build`, emitted from `lib/notifications.ts`.
- Root cause: Same as Bug 2 — `webpush.setVapidDetails(...)` was called at module top level.
- Fix: moved the call into a `configureWebPush()` helper, called at the top of `sendNotificationsForNewStories()` (runtime, not build time).
- **Pattern: any library that validates configuration on initialization must be configured lazily.**

**BUG 4: Workspace root warning — multiple `package-lock.json` files**
- Symptom: `⚠ Next.js inferred your workspace root, but it may not be correct. Detected multiple lockfiles.`
- Root cause: There's a `package-lock.json` higher up at `~/package-lock.json`.
- Fix: set `turbopack.root` in `next.config.ts` to `path.resolve(__dirname)` to pin the workspace root explicitly.

**BUG 5: `upsert` on `scored_stories` with `onConflict: 'url'` silently stores 0 rows**
- Symptom: filter pipeline runs, processes 75 stories, reports `stored: 0`. No exception thrown.
- Root cause: `scored_stories.url` has no unique constraint. Supabase returns an error for `onConflict: 'url'` but the error was only logged — `totalStored` never incremented, making it look like a silent no-op.
- Fix: replaced `upsert(..., { onConflict: 'url' })` with plain `.insert()`. Safe because `raw_stories` already deduplicates by URL upstream, and `processed = true` prevents double-scoring.
- **Pattern: never use `onConflict` on a column that doesn't have a `UNIQUE` constraint in the schema. Always verify the constraint exists before relying on it.**

**BUG 6: Proxy-based Supabase client breaks TypeScript type inference**
- Symptom: `No overload matches this call. Argument of type '...' is not assignable to parameter of type 'never'` on `.upsert()` calls through the proxy-wrapped client.
- Root cause: TypeScript cannot infer generic types through a `Proxy`. `.from('table')` returns `never` instead of the correct query builder type.
- Fix: removed Proxy entirely. Used plain `createClient(url, key)` for both clients. The lazy initialization was only needed when building without `.env.local`; once env vars are set, direct initialization works fine.
- **Pattern: never wrap Supabase clients in a Proxy. TypeScript can't see through it.**

**BUG 7: Wrong anon key written to .env.local (digit dropped in JWT)**
- Symptom: page loads skeleton but never resolves — stuck in infinite loading state.
- Root cause: manually transcribed the JWT and dropped a digit from the `iat` timestamp in the middle segment (`1775836461` → `1758364 61`). The key was invalid so every client-side Supabase query silently failed.
- Fix 1: corrected the key in `.env.local`.
- Fix 2: added `setLoading(false)` in the error branch of `fetchStories` so the page always resolves, even if the query fails.
- **Pattern: always paste JWT tokens directly — never retype or reconstruct them. A single wrong character invalidates the entire token.**

**BUG 8: Feed showed "No stories yet" even though filter stored rows**
- Symptom: `GET /api/filter` returned `processed > 0` and `stored > 0`, but the homepage still rendered an empty feed.
- Root cause: browser-side Supabase anon query on `scored_stories` returned 0 rows (policy/access mismatch), while service-role query returned dozens of rows. The UI depended on client-side access to data it could not read.
- Fix: moved feed read path to a server API (`/api/stories`) backed by `supabaseAdmin`, then fetched from that endpoint in `app/page.tsx`.
- **Pattern: if data is critical to first render, prefer a server-side read path over client anon queries unless RLS/policies are explicitly validated for that query.**

**BUG 9: MCP global availability was missing despite project config**
- Symptom: Puppeteer MCP worked only at project scope and was not guaranteed globally across workspaces.
- Root cause: `~/.cursor/mcp.json` did not exist with the same `mcpServers` block.
- Fix: copied the exact project `mcpServers` block into global `~/.cursor/mcp.json`.
- **Pattern: when an MCP server should be reusable across projects, keep project and global MCP configs in sync.**

**WORKING PATTERNS:**
- Claude Haiku JSON scoring prompt: ask for a plain JSON array, no markdown fences. Then strip any accidental fences with `.replace(/^```json\s*/i, '')` before `JSON.parse`. Prevents parse failures if the model adds fences anyway.
- Supabase `upsert` with `{ onConflict: 'url', ignoreDuplicates: true }` is the right call for deduplication in both scrapers and scored stories — don't use `insert` which throws on duplicate key.
- Vercel cron: scrape at `:00` of every 4th hour, filter at `:15` — gives the scraper 15 minutes to finish before the filter tries to read new stories.
- Verification loop that worked well: run live app -> capture screenshot -> compare expected UI -> inspect API/DB state -> patch -> lint -> screenshot again.
- Fast diagnosis pattern: compare the same query with anon key vs service-role key; a large count mismatch immediately identifies access-layer issues (not ingestion/filter bugs).

## Database Tables
```sql
raw_stories         -- everything scraped, before filtering
scored_stories      -- filtered + scored by Claude, displayed in UI
api_usage           -- token tracking per run (cost monitoring)
user_profiles       -- user preferences (built for multi-user later)
push_subscriptions  -- Web Push endpoint/key pairs for notifications
```
Full schema in `supabase/schema.sql` — run this in Supabase SQL editor to create all tables.

## Environment Variables (.env.local)
```
ANTHROPIC_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:you@example.com
```
Generate VAPID keys once with: `npx web-push generate-vapid-keys`
Template is in `.env.local.example` — copy and fill in.

## Sub-Agents
This project uses three specialized Claude sub-agents defined in `.claude/agents/`:

| Agent | Role | When to invoke |
|-------|------|----------------|
| `scraper` | Fetches and parses all data sources | When adding a new source or debugging collection |
| `filter` | Manages Claude API filtering logic | When tuning scoring, adding categories |
| `briefing` | Formats and delivers output | When changing UI layout or notification logic |

Invoke a sub-agent by saying: "Act as the scraper agent" or use the slash commands.
