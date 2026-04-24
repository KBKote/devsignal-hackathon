import { NextResponse } from 'next/server'
import { buildSchema, graphql, GraphQLError, printSchema } from 'graphql'
import { getSupabaseAdmin } from '@/lib/supabase-server'

const SDL = /* GraphQL */ `
  type Story {
    id: ID!
    title: String!
    url: String!
    source: String
    summary: String
    score: Int!
    why: String
    publishedAt: String
    scoredAt: String!
  }

  type Query {
    scoredStories(limit: Int): [Story!]!
    agentRuns: String!
  }
`

const schema = buildSchema(SDL)

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const AGENT_RUNS_HINT =
  'Run: ghost sql devsignal-hackathon "SELECT run_id, stories_scraped, stories_scored, status FROM agent_runs ORDER BY created_at DESC LIMIT 5"'

function authorizeOr401(request: Request): NextResponse | null {
  const agentKey = process.env.AGENT_API_KEY?.trim()
  const cronSecret = process.env.CRON_SECRET?.trim()
  const xApiKey = request.headers.get('x-api-key')
  const auth = request.headers.get('authorization')

  const keyOk = Boolean(agentKey && xApiKey === agentKey)
  const bearerOk = Boolean(cronSecret && auth === `Bearer ${cronSecret}`)

  if (!keyOk && !bearerOk) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

function toIsoString(value: unknown): string | null {
  if (value == null) return null
  const d = new Date(value as string | number | Date)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

const rootValue = {
  scoredStories: async (args: { limit?: number | null }) => {
    const userId = process.env.AGENT_USER_ID?.trim()
    if (!userId) {
      console.error('[api/graphql] missing AGENT_USER_ID')
      throw new GraphQLError('Server misconfiguration: AGENT_USER_ID')
    }

    const rawLimit = args.limit ?? 20
    const take = Math.min(rawLimit, 80)

    const db = getSupabaseAdmin()
    const { data, error } = await db
      .from('scored_stories')
      .select('id, title, url, source, summary, score, why, published_at, scored_at')
      .eq('user_id', userId)
      .order('score', { ascending: false })
      .limit(take)

    if (error) {
      console.error('[api/graphql] scored_stories:', error.message)
      throw new GraphQLError('Failed to load scored stories')
    }

    const rows = data ?? []
    return rows.map((row) => {
      const scoredAt = toIsoString(row.scored_at) ?? new Date(0).toISOString()
      return {
        id: String(row.id),
        title: row.title as string,
        url: row.url as string,
        source: row.source ?? null,
        summary: row.summary ?? null,
        score: row.score as number,
        why: row.why ?? null,
        publishedAt: toIsoString(row.published_at),
        scoredAt,
      }
    })
  },

  agentRuns: (): string => AGENT_RUNS_HINT,
}

export async function GET(request: Request) {
  const denied = authorizeOr401(request)
  if (denied) return denied

  const sdl = printSchema(schema)
  return new NextResponse(sdl, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

export async function POST(request: Request) {
  const denied = authorizeOr401(request)
  if (denied) return denied

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Expected JSON object body' }, { status: 400 })
  }

  const { query, variables } = body as {
    query?: unknown
    variables?: Record<string, unknown> | null
  }

  if (typeof query !== 'string' || !query) {
    return NextResponse.json({ error: 'Missing or invalid query' }, { status: 400 })
  }

  if (variables !== undefined && variables !== null) {
    if (typeof variables !== 'object' || Array.isArray(variables)) {
      return NextResponse.json({ error: 'variables must be a JSON object' }, { status: 400 })
    }
  }

  const result = await graphql({
    schema,
    source: query,
    rootValue,
    variableValues: variables ?? undefined,
  })

  return NextResponse.json(result, { status: 200 })
}
