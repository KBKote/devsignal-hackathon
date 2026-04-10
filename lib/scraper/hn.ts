import { matchesSignalKeywords } from '../user-profile'
import type { RawStory } from './rss'

const HN_QUERY = 'AI OR "machine learning" OR ethereum OR crypto OR DeFi OR LLM OR "language model"'
const MIN_POINTS = 50

interface HNHit {
  objectID: string
  title: string
  url?: string
  story_text?: string
  points: number
  created_at: string
}

export async function scrapeHackerNews(): Promise<RawStory[]> {
  const results: RawStory[] = []

  try {
    const params = new URLSearchParams({
      query: HN_QUERY,
      tags: 'story',
      numericFilters: `points>=${MIN_POINTS}`,
      hitsPerPage: '30',
    })

    const res = await fetch(
      `https://hn.algolia.com/api/v1/search_by_date?${params}`,
      { next: { revalidate: 0 } }
    )

    if (!res.ok) {
      console.error(`[HN] Algolia API returned ${res.status}`)
      return results
    }

    const json = await res.json()
    const hits: HNHit[] = json?.hits ?? []

    for (const hit of hits) {
      const title = hit.title?.trim() ?? ''
      // HN stories without an external URL link back to the HN item
      const url = hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`

      if (!title) continue

      const raw_text = hit.story_text
        ? hit.story_text.replace(/<[^>]*>/g, ' ').slice(0, 2000)
        : `Hacker News story with ${hit.points} points.`

      if (!matchesSignalKeywords(title + ' ' + raw_text)) continue

      results.push({
        title,
        url,
        source: 'hacker-news',
        raw_text,
        published_at: hit.created_at,
      })
    }

    console.log(`[HN] Fetched ${hits.length} stories, kept ${results.length} after keyword filter`)
  } catch (err) {
    console.error('[HN] Failed to fetch:', err)
  }

  return results
}
