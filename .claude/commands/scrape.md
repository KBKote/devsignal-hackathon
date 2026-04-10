---
description: Trigger a manual data collection run — fetches RSS feeds, Reddit, and Hacker News and stores results in the database.
---

Act as the scraper agent defined in `.claude/agents/scraper.md`.

Run a full data collection cycle:
1. Fetch all RSS feeds listed in the scraper agent definition
2. Fetch top posts from all configured subreddits
3. Fetch relevant stories from Hacker News Algolia API
4. Deduplicate against existing URLs in `raw_stories`
5. Insert new stories with `processed = false`
6. Report: how many stories fetched per source, how many were duplicates, total new stories added

If any source fails, report the error but continue with the others.
