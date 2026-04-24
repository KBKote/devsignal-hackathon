import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { logAgentRun, type AgentRunLog } from '@/lib/ghost-db'
import { publishBriefing, type ScoredStory } from '@/lib/publish'
import { scrapeTinyFish } from '@/lib/scraper/tinyfish'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const maxDuration = 120

const MODEL = process.env.ANTHROPIC_HAIKU_MODEL ?? 'claude-haiku-4-5-20251001'

const SYSTEM_PROMPT = `You are a developer news scorer. Score each story for relevance to developers, AI, and crypto. Return ONLY a JSON array with no markdown, no explanation. Shape: [{title, score, why}] where score is 1-10.`

type MergedStory = {
  id?: string
  title: string
  url: string
  source: string
  raw_text: string
  published_at: string | null
}

function normUrl(u: string): string {
  return u.trim()
}

function titleKey(t: string): string {
  return t.trim().toLowerCase()
}

/** Strip byte-order mark if present. */
function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s
}

function tryUnwrapArrayFromObject(parsed: unknown): unknown[] | null {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const o = parsed as Record<string, unknown>
  for (const key of ['stories', 'results', 'items', 'scores']) {
    if (Array.isArray(o[key])) return o[key] as unknown[]
  }
  return null
}

function extractJsonArrayStringAware(text: string): string | null {
  let start = -1
  let depth = 0
  let inString = false
  let escape = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (escape) {
      escape = false
      continue
    }
    if (ch === '\\' && inString) {
      escape = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue

    if (ch === '[') {
      if (depth === 0) start = i
      depth++
    } else if (ch === ']') {
      depth--
      if (depth === 0 && start !== -1) {
        return text.slice(start, i + 1)
      }
    }
  }
  return null
}

type ParsePath = 'direct' | 'unwrap_object' | 'extracted_array' | 'failed'

function tryParseAgentScoreArray(
  text: string
): { ok: true; results: unknown[]; path: ParsePath } | { ok: false; path: 'failed'; snippet: string } {
  try {
    const parsed: unknown = JSON.parse(text)
    if (Array.isArray(parsed)) return { ok: true, results: parsed, path: 'direct' }
    const unwrapped = tryUnwrapArrayFromObject(parsed)
    if (unwrapped) return { ok: true, results: unwrapped, path: 'unwrap_object' }
  } catch {
    // fall through to extraction
  }

  const extracted = extractJsonArrayStringAware(text)
  if (extracted) {
    try {
      const parsed2: unknown = JSON.parse(extracted)
      if (Array.isArray(parsed2)) return { ok: true, results: parsed2, path: 'extracted_array' }
      const unwrapped2 = tryUnwrapArrayFromObject(parsed2)
      if (unwrapped2) return { ok: true, results: unwrapped2, path: 'unwrap_object' }
    } catch {
      // fall through
    }
  }

  return { ok: false, path: 'failed', snippet: text.slice(0, 500) }
}

function buildScoreMap(results: unknown[]): Map<string, { score: number; why: string }> {
  const m = new Map<string, { score: number; why: string }>()
  for (const item of results) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const title = typeof o.title === 'string' ? o.title.trim() : ''
    if (!title) continue
    let score = 5
    if (typeof o.score === 'number' && Number.isFinite(o.score)) {
      score = Math.round(o.score)
    } else if (typeof o.score === 'string') {
      const n = parseInt(o.score, 10)
      if (Number.isFinite(n)) score = n
    }
    score = Math.min(10, Math.max(1, score))
    const why = typeof o.why === 'string' ? o.why : ''
    const k = titleKey(title)
    if (!m.has(k)) m.set(k, { score, why })
  }
  return m
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Internal server error'
}

async function safeLog(run: AgentRunLog): Promise<void> {
  try {
    await logAgentRun(run)
  } catch (e) {
    console.error('[agent/run] logAgentRun failed (non-fatal):', e)
  }
}

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

  const anthropicApiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!anthropicApiKey) {
    return NextResponse.json({ success: false, error: 'Missing ANTHROPIC_API_KEY' }, { status: 500 })
  }

  const run_id = crypto.randomUUID()
  const started_at = new Date().toISOString()
  const t0 = Date.now()

  let stories_scraped = 0
  let stories_scored = 0
  let topForResponse: { title: string; score: number; url: string }[] = []
  let published_url: string | null = null

  try {
    const tinyStories = await scrapeTinyFish()

    const db = getSupabaseAdmin()
    const { data: dbRows, error: dbErr } = await db
      .from('raw_stories')
      .select('id, title, url, source, raw_text, published_at')
      .order('scraped_at', { ascending: false })
      .limit(20)

    if (dbErr) throw new Error(`raw_stories fetch: ${dbErr.message}`)

    const merged: MergedStory[] = []
    const seen = new Set<string>()
    const pushUnique = (s: MergedStory) => {
      const u = normUrl(s.url)
      if (!u || seen.has(u)) return
      seen.add(u)
      merged.push({ ...s, url: u })
    }

    for (const s of tinyStories) {
      const raw = s.raw_text ?? s.summary ?? ''
      pushUnique({
        title: s.title,
        url: s.url,
        source: s.source,
        raw_text: raw,
        published_at: s.published_at,
      })
    }
    for (const r of dbRows ?? []) {
      const raw = typeof r.raw_text === 'string' ? r.raw_text : ''
      pushUnique({
        id: r.id as string,
        title: (r.title as string) ?? '',
        url: (r.url as string) ?? '',
        source: typeof r.source === 'string' ? r.source : '',
        raw_text: raw,
        published_at: (r.published_at as string | null) ?? null,
      })
    }

    stories_scraped = merged.length
    const fifteen = merged.slice(0, 15)

    const scored_at = new Date().toISOString()
    let scoreByTitle = new Map<string, { score: number; why: string }>()

    if (fifteen.length > 0) {
      const client = new Anthropic({ apiKey: anthropicApiKey })
      const payload = fifteen.map((s) => ({
        title: s.title,
        url: s.url,
        text: (s.raw_text || '').slice(0, 500),
      }))

      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: JSON.stringify(payload),
          },
        ],
      })

      const rawText = response.content[0]?.type === 'text' ? response.content[0].text : ''
      const normalized = stripBom(rawText)
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim()

      const parseResult = tryParseAgentScoreArray(normalized)
      if (parseResult.ok) {
        scoreByTitle = buildScoreMap(parseResult.results)
      } else {
        console.warn('[agent/run] score JSON parse failed; defaulting all scores to 5', parseResult.snippet)
      }
    }

    const withScores = fifteen.map((s) => {
      const hit = scoreByTitle.get(titleKey(s.title))
      const score = hit?.score ?? 5
      const why = hit?.why ?? ''
      return { story: s, score, why }
    })

    topForResponse = [...withScores]
      .map((x, i) => ({ ...x, i }))
      .sort((a, b) => b.score - a.score || a.i - b.i)
      .slice(0, 3)
      .map((x) => ({ title: x.story.title, score: x.score, url: x.story.url }))

    stories_scored = withScores.filter((x) => x.score >= 7).length

    const agentUserId = process.env.AGENT_USER_ID?.trim()
    if (!agentUserId) {
      throw new Error('Missing AGENT_USER_ID')
    }

    const toInsert = withScores
      .filter((x) => x.score >= 7)
      .map((x) => {
        const s = x.story
        const summaryText = (s.raw_text || '').slice(0, 300) || null
        return {
          user_id: agentUserId,
          raw_story_id: s.id ?? null,
          title: s.title,
          url: s.url,
          source: s.source || null,
          summary: summaryText,
          category: 'briefing' as const,
          score: x.score,
          why: x.why || null,
          published_at: s.published_at,
          scored_at,
        }
      })

    let insertedForPublish: ScoredStory[] = []

    if (toInsert.length > 0) {
      const { data: inserted, error: insErr } = await db.from('scored_stories').insert(toInsert).select(
        'id, title, url, source, summary, category, score, why, published_at, scored_at'
      )
      if (insErr) throw new Error(`scored_stories insert: ${insErr.message}`)
      insertedForPublish = (inserted ?? []).map((row) => ({
        id: row.id as string,
        title: row.title as string,
        url: row.url as string,
        source: (row.source as string | null) ?? null,
        summary: (row.summary as string | null) ?? null,
        category: row.category as string,
        score: row.score as number,
        why: (row.why as string | null) ?? null,
        published_at: (row.published_at as string | null) ?? null,
        scored_at: (row.scored_at as string) ?? scored_at,
      }))
    }

    published_url = await publishBriefing(insertedForPublish)

    await safeLog({
      run_id,
      started_at,
      completed_at: new Date().toISOString(),
      stories_scraped,
      stories_scored,
      top_stories: topForResponse,
      published_url,
      status: 'success',
      error_message: null,
    })

    const elapsed_seconds = Math.round(((Date.now() - t0) / 1000) * 100) / 100

    return NextResponse.json({
      success: true,
      run_id,
      stories_scraped,
      stories_scored,
      top_stories: topForResponse,
      published_url,
      elapsed_seconds,
    })
  } catch (err) {
    console.error('[agent/run]', err)
    const message = errMessage(err)
    await safeLog({
      run_id,
      started_at,
      completed_at: new Date().toISOString(),
      stories_scraped,
      stories_scored,
      top_stories: topForResponse,
      published_url,
      status: 'error',
      error_message: message,
    })
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
