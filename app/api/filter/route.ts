import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/session'
import { runFilterPipeline } from '@/lib/filter'
import { parsePipelinePreferencesBody, DEFAULT_PIPELINE_PREFS } from '@/lib/pipeline-preferences'
import { getDecryptedAnthropicKey } from '@/lib/user-credentials'
import { buildScoringUserPrompt } from '@/lib/user-profile-prompt'
import { loadUserProfileRow } from '@/lib/user-profiles-db'
import { sendNotificationsForNewStories } from '@/lib/notifications'

/** Vercel: raise on paid plans if filter still hits limits; local dev is uncapped. */
export const maxDuration = 120

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = await getDecryptedAnthropicKey(user.id)
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Add your Anthropic API key in Settings' },
      { status: 400 }
    )
  }

  let prefs = DEFAULT_PIPELINE_PREFS
  try {
    const ct = request.headers.get('content-type') ?? ''
    if (ct.includes('application/json')) {
      const raw: unknown = await request.json()
      prefs = parsePipelinePreferencesBody(raw)
    }
  } catch {
    prefs = DEFAULT_PIPELINE_PREFS
  }

  const profileRow = await loadUserProfileRow(user.id)
  const userPrompt = buildScoringUserPrompt(profileRow?.profile ?? {})

  try {
    const result = await runFilterPipeline({
      userId: user.id,
      anthropicApiKey: apiKey,
      userPrompt,
      prefs,
    })

    const notified = await sendNotificationsForNewStories(user.id)
    if (notified > 0) console.log(`[/api/filter] Sent ${notified} push notifications`)

    return NextResponse.json({ success: true, ...result, notified })
  } catch (err) {
    console.error('[/api/filter] Error:', err)
    const message = err instanceof Error ? err.message : 'Filter pipeline failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

/**
 * Cron filter removed for multi-tenant BYOK. Use per-user POST from the app.
 */
export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Use authenticated POST /api/filter from the app' },
    { status: 405 }
  )
}
