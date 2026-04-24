import { Pool } from 'pg'

export interface AgentRunLog {
  run_id: string
  started_at: string
  completed_at: string
  stories_scraped: number
  stories_scored: number
  top_stories: { title: string; score: number; url: string }[]
  published_url: string | null
  status: 'success' | 'error'
  error_message: string | null
}

let pool: Pool | null = null
let tableEnsured = false

const DDL = `CREATE TABLE IF NOT EXISTS agent_runs (
  run_id        UUID PRIMARY KEY,
  started_at    TIMESTAMPTZ NOT NULL,
  completed_at  TIMESTAMPTZ NOT NULL,
  stories_scraped INTEGER,
  stories_scored  INTEGER,
  top_stories     JSONB,
  published_url   TEXT,
  status          TEXT NOT NULL,
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
)`

export async function logAgentRun(run: AgentRunLog): Promise<void> {
  const connectionString = process.env.DATABASE_URL_GHOST?.trim()
  if (!connectionString) {
    console.warn('[ghost-db] DATABASE_URL_GHOST is not set; skipping agent run log')
    return
  }

  try {
    if (!pool) {
      pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
      })
    }

    if (!tableEnsured) {
      await pool.query(DDL)
      tableEnsured = true
    }

    await pool.query(
      `INSERT INTO agent_runs (
        run_id, started_at, completed_at, stories_scraped, stories_scored,
        top_stories, published_url, status, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)`,
      [
        run.run_id,
        run.started_at,
        run.completed_at,
        run.stories_scraped,
        run.stories_scored,
        JSON.stringify(run.top_stories),
        run.published_url,
        run.status,
        run.error_message,
      ]
    )
  } catch (err) {
    console.error('[ghost-db]', err)
  }
}
