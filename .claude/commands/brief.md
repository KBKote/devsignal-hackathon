---
description: Generate a fresh intelligence briefing — runs the filter agent on any unprocessed stories and returns a formatted summary of the top findings.
---

Act as the filter agent defined in `.claude/agents/filter.md`, then format output as the briefing agent in `.claude/agents/briefing.md`.

1. Check `raw_stories` for any unprocessed stories (`processed = false`)
2. If there are unprocessed stories, run the Claude Haiku filtering pipeline on them
3. Pull all scored stories from the last 24 hours with score >= 7
4. Format and display them as a briefing in this structure:

---
## Signal Briefing — [current date/time]

### 🔴 Opportunities
[stories with category=opportunity, score >= 7, sorted by score]

### 💡 Ideas  
[stories with category=idea, score >= 7, sorted by score]

### 📡 Intel
[stories with category=intel, score >= 7, sorted by score]
---

For each story show: score, title (as link), source, and the "why" reasoning.

Report token usage at the end of the briefing.
