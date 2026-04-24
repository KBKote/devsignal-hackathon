import type { RawStory } from './rss'

const TINYFISH_URL = 'https://agent.tinyfish.ai/v1/automation/run'

const GOAL =
  'Browse the CoinDesk homepage, Hacker News front page, r/ethereum subreddit, and Decrypt homepage. Extract the 5 most recent headlines from each source. Return a JSON array with this exact shape: [{title, url, source, summary}]'

function extractStoriesArray(body: unknown): unknown[] | null {
  if (Array.isArray(body)) return body
  if (typeof body !== 'object' || body === null) return null
  const o = body as Record<string, unknown>
  if (Array.isArray(o.results)) return o.results
  if (Array.isArray(o.data)) return o.data
  if (Array.isArray(o.stories)) return o.stories
  return null
}

export async function scrapeTinyFish(): Promise<RawStory[]> {
  const apiKey = process.env.TINYFISH_API_KEY?.trim()
  if (!apiKey) return []

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20_000)
    try {
      const res = await fetch(TINYFISH_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          goal: GOAL,
          structured_output: { type: 'json' },
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        console.warn(`[TinyFish] HTTP ${res.status}`)
        return []
      }

      const body: unknown = await res.json()
      const rows = extractStoriesArray(body)
      if (rows === null) {
        console.warn('[TinyFish] Response did not contain a stories array')
        return []
      }

      const stories: RawStory[] = []
      for (const item of rows) {
        if (item === null || typeof item !== 'object') continue
        const row = item as Record<string, unknown>
        const title = typeof row.title === 'string' ? row.title.trim() : ''
        const url = typeof row.url === 'string' ? row.url.trim() : ''
        if (!title || !url) continue
        const source = typeof row.source === 'string' ? row.source.trim() : ''
        const summaryText =
          typeof row.summary === 'string' ? row.summary : String(row.summary ?? '')

        stories.push({
          title,
          url,
          source,
          raw_text: summaryText,
          summary: summaryText,
          published_at: null,
        })
      }

      return stories
    } finally {
      clearTimeout(timeoutId)
    }
  } catch (err) {
    console.warn('[TinyFish]', err)
    return []
  }
}
