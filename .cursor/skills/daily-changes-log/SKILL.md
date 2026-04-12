---
name: daily-changes-log
description: >-
  Compiles the current session's achievements and learnings into a single
  markdown companion file whose name ends with .cursor.md (Cursor companion-doc
  convention), appending dated sections instead of creating a new dated
  filename each day. Use when the user asks for a daily changelog, session
  wrap-up, achievements log, end-of-day notes, or to "run the daily changes skill"
  / compile learnings for today.
---

# Daily changes log

## Goal

Produce **one persistent** markdown companion file (name ends with **`.cursor.md`**) that captures **what was accomplished** and **what was learned** (bugs, patterns, decisions) from the **current conversation and work**, written for a future reader (you or a teammate). Use **dated sections inside the file** rather than a new root file per calendar day.

## Resolve today's date

1. **Resolve today's calendar date** (local timezone):
   - If the environment provides an authoritative "today" (e.g. user info), use that **year-month-day**.
   - Otherwise run: `date +%Y-%m-%d` from the **repository root** and use that string as `YYYY-MM-DD`.

## Target file (must end with `.cursor.md`)

Pick **one** output path using the first rule that applies:

1. **Explicit path** — If the user names a workspace-relative path that ends with `.cursor.md`, use that file under the repository root.

2. **Context path** — If this thread includes a concrete workspace path ending in `.cursor.md` (for example an @-attachment, a quoted path, or an open file the agent can see), use that file.

3. **Repo discovery** — From the repository root, search for existing `*.cursor.md` files. **Exclude** `node_modules`, `.git`, and anything under `.cursor/skills/` (skill folders are not daily logs).
   - If **exactly one** file matches, use it.
   - If **more than one** matches, prefer **`daily-changes.cursor.md` at the repository root** if that path already exists; otherwise **create and use** `daily-changes.cursor.md` at the repository root so the log has a stable default (tell the user which path you chose if you skipped other `*.cursor.md` files).

4. **Default** — If no `*.cursor.md` file is found, **create** `daily-changes.cursor.md` at the repository root and use it.

**Do not** write to `changes-YYYY-MM-DD.md` or other dated **filenames** unless the user explicitly asks for that layout.

## Append rules

- If the target file **does not exist**, create it with a first top-level heading and the template below for today’s date.
- If the file **already has a top-level section for the same `YYYY-MM-DD`**, append a **session update** under that day (same day, multiple sessions) rather than duplicating the day heading—unless the user explicitly asks to replace the file.
- If the file exists but has **no section for today**, append a new `# Changes — YYYY-MM-DD` block at the **bottom** of the file.

## Content to compile

From the **current thread** (and any files you edited or read for this task):

| Section | Include |
|--------|---------|
| **Achievements** | Shipped behavior, fixes merged, APIs/routes added, refactors completed, tests added, docs the user asked for. Use concise bullets; link paths or PRs if known. |
| **Learnings** | Root causes of bugs fixed, constraints discovered, "do / don't" patterns, misleading errors, tooling gotchas. Prefer actionable one-liners. |
| **Follow-ups** | Optional: open questions or next steps **only** if they were explicitly raised or are clearly implied by unfinished work. |

**Do not** paste secrets, tokens, or contents of `.env.local`.

## Document template

Use this structure (adjust headings only if the user requests a different style):

```markdown
# Changes — YYYY-MM-DD

## Achievements

- …

## Learnings

- …

## Follow-ups (optional)

- …
```

If appending **another session the same day**, add:

```markdown
---

## Session update — [optional time or label]

### Achievements
…
### Learnings
…
```

## After writing

- Confirm the **full path** of the `.cursor.md` file you updated.
- If the project keeps a central learning log (e.g. `CLAUDE.md`), mention whether any learning should be **copied there** in a separate user-requested edit—**do not** silently duplicate into `CLAUDE.md` unless the user asked to update it.
