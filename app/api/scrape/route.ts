import { NextResponse } from 'next/server'
import { scrapeRssFeeds } from '@/lib/scraper/rss'
import { scrapeReddit } from '@/lib/scraper/reddit'
import { scrapeHackerNews } from '@/lib/scraper/hn'
import { supabaseAdmin } from '@/lib/supabase-server'

export const maxDuration = 60 // Vercel function timeout (seconds)

export async function POST() {
  const startTime = Date.now()

  try {
    // 1. Collect from all sources in parallel
    console.log('[Scrape] Starting data collection...')
    const [rssStories, redditStories, hnStories] = await Promise.all([
      scrapeRssFeeds(),
      scrapeReddit(),
      scrapeHackerNews(),
    ])

    const allStories = [...rssStories, ...redditStories, ...hnStories]
    console.log(`[Scrape] Collected ${allStories.length} stories total`)

    if (allStories.length === 0) {
      return NextResponse.json({ success: true, inserted: 0, message: 'No stories matched keyword filter' })
    }

    // 2. Deduplicate URLs within this batch
    const seen = new Set<string>()
    const dedupedStories = allStories.filter((s) => {
      if (seen.has(s.url)) return false
      seen.add(s.url)
      return true
    })

    // 3. Upsert to DB — ignore conflicts on url (already scraped)
    const { data, error } = await supabaseAdmin
      .from('raw_stories')
      .upsert(dedupedStories, { onConflict: 'url', ignoreDuplicates: true })
      .select('id')

    if (error) {
      console.error('[Scrape] DB insert error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const inserted = data?.length ?? 0
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

    console.log(`[Scrape] Done. Inserted ${inserted} new stories in ${elapsed}s`)

    return NextResponse.json({
      success: true,
      inserted,
      total_collected: allStories.length,
      elapsed_seconds: parseFloat(elapsed),
      breakdown: {
        rss: rssStories.length,
        reddit: redditStories.length,
        hn: hnStories.length,
      },
    })
  } catch (err) {
    console.error('[Scrape] Unexpected error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Allow GET for easy browser/cron testing
export async function GET() {
  return POST()
}
