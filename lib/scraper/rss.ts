import Parser from 'rss-parser'
import { matchesSignalKeywords } from '../user-profile'

const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'Signal/1.0 (personal intelligence feed)' },
})

const RSS_FEEDS: { url: string; source: string }[] = [
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', source: 'coindesk' },
  { url: 'https://decrypt.co/feed', source: 'decrypt' },
  { url: 'https://thedefiant.io/feed', source: 'the-defiant' },
  { url: 'https://weekinethereumnews.com/feed/', source: 'week-in-ethereum' },
  { url: 'https://blockworks.co/feed', source: 'blockworks' },
  { url: 'https://www.theverge.com/rss/index.xml', source: 'the-verge' },
  { url: 'https://feeds.arstechnica.com/arstechnica/index', source: 'ars-technica' },
  { url: 'https://huggingface.co/blog/feed.xml', source: 'huggingface' },
]

export interface RawStory {
  title: string
  url: string
  source: string
  raw_text: string
  published_at: string | null
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function scrapeRssFeeds(): Promise<RawStory[]> {
  const settled = await Promise.allSettled(
    RSS_FEEDS.map(async (feed): Promise<RawStory[]> => {
      const parsed = await parser.parseURL(feed.url)
      const stories: RawStory[] = []

      for (const item of parsed.items.slice(0, 20)) {
        const title = item.title?.trim() ?? ''
        const url = item.link?.trim() ?? ''
        if (!title || !url) continue

        const bodyRaw = item.contentSnippet ?? item.content ?? item.summary ?? ''
        const raw_text = stripHtml(bodyRaw).slice(0, 2000)

        // Pre-filter: skip if nothing matches our signal keywords
        if (!matchesSignalKeywords(title + ' ' + raw_text)) continue

        stories.push({
          title,
          url,
          source: feed.source,
          raw_text,
          published_at: item.pubDate ? new Date(item.pubDate).toISOString() : null,
        })
      }

      console.log(`[RSS] ${feed.source}: fetched ${parsed.items.length} items`)
      return stories
    })
  )

  const results: RawStory[] = []
  settled.forEach((entry, idx) => {
    if (entry.status === 'fulfilled') {
      results.push(...entry.value)
      return
    }

    console.error(`[RSS] Failed to fetch ${RSS_FEEDS[idx].source}:`, entry.reason)
  })

  return results
}
