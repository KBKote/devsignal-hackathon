import { NextResponse } from 'next/server'
import { publishBriefing, type ScoredStory } from '@/lib/publish'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const maxDuration = 60

export async function POST(request: Request) {
  const agentKey = process.env.AGENT_API_KEY?.trim()
  const cronSecret = process.env.CRON_SECRET?.trim()
  const xApiKey = request.headers.get('x-api-key')
  const auth = request.headers.get('authorization')

  const keyOk = Boolean(agentKey && xApiKey === agentKey)
  const bearerOk = Boolean(cronSecret && auth === `Bearer ${cronSecret}`)

  if (!keyOk && !bearerOk) {
    return NextResponse.json(
      { error: 'Payment required', price: '$0.01/briefing', docs: '/api/agent/run' },
      { status: 402 }
    )
  }

  const agentUserId = process.env.AGENT_USER_ID?.trim()
  if (!agentUserId) {
    return NextResponse.json({ success: false, error: 'Missing AGENT_USER_ID' }, { status: 500 })
  }

  const db = getSupabaseAdmin()
  const { data: rows, error: dbErr } = await db
    .from('scored_stories')
    .select('id, title, url, source, summary, category, score, why, published_at, scored_at')
    .eq('user_id', agentUserId)
    .order('score', { ascending: false })
    .limit(5)

  if (dbErr) {
    console.error('[api/publish]', dbErr.message)
    return NextResponse.json({ success: false, error: dbErr.message }, { status: 500 })
  }

  const stories: ScoredStory[] = (rows ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    url: row.url as string,
    source: (row.source as string | null) ?? null,
    summary: (row.summary as string | null) ?? null,
    category: row.category as string,
    score: row.score as number,
    why: (row.why as string | null) ?? null,
    published_at: (row.published_at as string | null) ?? null,
    scored_at: (row.scored_at as string) ?? '',
  }))

  const published_url = await publishBriefing(stories)

  return NextResponse.json({ success: true, published_url })
}
