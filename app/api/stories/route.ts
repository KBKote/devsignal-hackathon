import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

const ARCHIVE_HOURS = 48

export async function GET() {
  const cutoff = new Date(Date.now() - ARCHIVE_HOURS * 3_600_000).toISOString()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8_000)

  const { data, error } = await supabaseAdmin
    .from('scored_stories')
    .select(
      'id,raw_story_id,title,url,source,summary,category,score,why,published_at,scored_at,seen,notified'
    )
    .gte('scored_at', cutoff)
    .gte('score', 5)
    .order('score', { ascending: false })
    .order('scored_at', { ascending: false })
    .limit(80)
    .abortSignal(controller.signal)

  clearTimeout(timeout)

  if (error) {
    console.error('[/api/stories] Failed to fetch stories:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stories' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, stories: data ?? [] })
}
