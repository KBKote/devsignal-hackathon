import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from './supabase-server'
import { USER_PROFILE } from './user-profile'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MODEL = 'claude-haiku-4-5-20251001'
const BATCH_SIZE = 15
const MIN_SCORE_TO_STORE = 5

interface RawStory {
  id: string
  title: string
  url: string
  source: string
  raw_text: string
  published_at: string | null
}

interface ScoredResult {
  id: string
  score: number
  category: 'opportunity' | 'idea' | 'intel' | 'noise'
  why: string
  summary: string
}

// ─────────────────────────────────────────────────────────
// Score a batch of stories with a single Claude Haiku call
// ─────────────────────────────────────────────────────────
async function scoreBatch(stories: RawStory[]): Promise<{
  results: ScoredResult[]
  inputTokens: number
  outputTokens: number
}> {
  const storiesPayload = stories.map((s) => ({
    id: s.id,
    title: s.title,
    text: s.raw_text?.slice(0, 500) ?? '',
  }))

  const prompt = `${USER_PROFILE}

Score each of the following stories. Return ONLY a valid JSON array — no markdown, no explanation, just the array.

Each object must have:
- "id": the story id (string, unchanged)
- "score": integer 1-10
- "category": one of "opportunity", "idea", "intel", "noise"
- "why": one sentence explaining the score relative to the user's goals
- "summary": two sentences plain-English summary of what the story is about

Stories to score:
${JSON.stringify(storiesPayload, null, 2)}`

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  })

  const rawText = response.content[0].type === 'text' ? response.content[0].text : ''

  // Strip any accidental markdown fences
  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  let results: ScoredResult[]
  try {
    results = JSON.parse(cleaned)
  } catch {
    console.error('[Filter] Failed to parse Claude response:', rawText.slice(0, 500))
    // Return empty rather than crashing — these stories will remain unprocessed
    results = []
  }

  return {
    results,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  }
}

// ─────────────────────────────────────────────────────────
// Main filter run — called by /api/filter
// ─────────────────────────────────────────────────────────
export async function runFilterPipeline(): Promise<{
  processed: number
  stored: number
  totalInputTokens: number
  totalOutputTokens: number
  estimatedCost: number
}> {
  // 1. Fetch unprocessed stories
  const { data: rawStories, error: fetchError } = await supabaseAdmin
    .from('raw_stories')
    .select('id, title, url, source, raw_text, published_at')
    .eq('processed', false)
    .order('scraped_at', { ascending: true })
    .limit(100)

  if (fetchError) throw new Error(`Failed to fetch raw stories: ${fetchError.message}`)
  if (!rawStories || rawStories.length === 0) {
    return { processed: 0, stored: 0, totalInputTokens: 0, totalOutputTokens: 0, estimatedCost: 0 }
  }

  console.log(`[Filter] Processing ${rawStories.length} stories in batches of ${BATCH_SIZE}`)

  let totalInputTokens = 0
  let totalOutputTokens = 0
  let totalStored = 0
  const processedIds: string[] = []

  // 2. Process in batches
  for (let i = 0; i < rawStories.length; i += BATCH_SIZE) {
    const batch = rawStories.slice(i, i + BATCH_SIZE)

    try {
      const { results, inputTokens, outputTokens } = await scoreBatch(batch)
      totalInputTokens += inputTokens
      totalOutputTokens += outputTokens

      // 3. Write high-scoring stories to scored_stories
      const toInsert = results
        .filter((r) => r.score >= MIN_SCORE_TO_STORE && r.category !== 'noise')
        .map((r) => {
          const original = batch.find((s) => s.id === r.id)
          return {
            raw_story_id: r.id,
            title: original?.title ?? '',
            url: original?.url ?? '',
            source: original?.source ?? '',
            published_at: original?.published_at ?? null,
            score: r.score,
            category: r.category,
            summary: r.summary,
            why: r.why,
          }
        })

      if (toInsert.length > 0) {
        // Use insert (not upsert) — raw_stories deduplicates by URL upstream,
        // and processed=true prevents the same story from being scored twice.
        const { error: insertError } = await supabaseAdmin
          .from('scored_stories')
          .insert(toInsert)

        if (insertError) {
          console.error('[Filter] Insert error:', insertError.message)
        } else {
          totalStored += toInsert.length
        }
      }

      // 4. Mark all stories in this batch as processed
      processedIds.push(...batch.map((s) => s.id))

      console.log(`[Filter] Batch ${Math.floor(i / BATCH_SIZE) + 1}: scored ${results.length}, stored ${toInsert.length}`)
    } catch (err) {
      console.error(`[Filter] Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, err)
      // Continue with next batch — don't mark as processed so they retry
    }
  }

  // 5. Mark stories as processed
  if (processedIds.length > 0) {
    await supabaseAdmin
      .from('raw_stories')
      .update({ processed: true })
      .in('id', processedIds)
  }

  // 6. Log token usage
  // Haiku pricing: $0.80/M input, $4.00/M output (as of 2024)
  const estimatedCost =
    (totalInputTokens / 1_000_000) * 0.8 +
    (totalOutputTokens / 1_000_000) * 4.0

  await supabaseAdmin.from('api_usage').insert({
    stories_scored: processedIds.length,
    input_tokens: totalInputTokens,
    output_tokens: totalOutputTokens,
    estimated_cost: estimatedCost,
  })

  console.log(
    `[Filter] Done. Processed: ${processedIds.length}, Stored: ${totalStored}, Tokens: ${totalInputTokens}in/${totalOutputTokens}out, Cost: $${estimatedCost.toFixed(5)}`
  )

  return {
    processed: processedIds.length,
    stored: totalStored,
    totalInputTokens,
    totalOutputTokens,
    estimatedCost,
  }
}
