---
description: Run a report-only security and performance audit (dependency audit, lint/build, code review, optional Lighthouse and API timing). Does not apply fixes unless you ask afterward.
---

Act as the agent defined in `.claude/agents/security-performance-audit.md`.

Follow the full workflow in `.cursor/skills/security-performance-audit/SKILL.md`:

1. Confirm scope (target URL, branch/commit, Node version).
2. Run `npm audit`, `npm run lint`, and `npm run build`; summarize results (do not run `npm audit fix` unless the user explicitly requests remediation).
3. Perform the security review (secrets, API routes, Supabase/RLS, scrapers, web/XSS, risky patterns).
4. Optionally run Lighthouse via `npx` and timed `curl` against safe endpoints (e.g. GET `/api/stories`); avoid hammering scrape/filter without consent.
5. Deliver the structured report only — no codebase edits unless the user asks for fixes.

If the user narrows scope (e.g. security-only, no Lighthouse), skip the optional steps and say what was omitted.
