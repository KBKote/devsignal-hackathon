import { NextResponse } from 'next/server'
import { runFilterPipeline } from '@/lib/filter'
import { sendNotificationsForNewStories } from '@/lib/notifications'

export const maxDuration = 60

export async function POST() {
  try {
    const result = await runFilterPipeline()

    // Fire push notifications for any new high-score opportunities
    const notified = await sendNotificationsForNewStories()
    if (notified > 0) console.log(`[/api/filter] Sent ${notified} push notifications`)

    return NextResponse.json({ success: true, ...result, notified })
  } catch (err) {
    console.error('[/api/filter] Error:', err)
    return NextResponse.json(
      { success: false, error: 'Filter pipeline failed' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return POST()
}
