import webpush from 'web-push'
import { supabaseAdmin } from './supabase-server'

function configureWebPush() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:admin@signal.app',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '',
    process.env.VAPID_PRIVATE_KEY ?? ''
  )
}

interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

interface ScoredStory {
  id: string
  title: string
  url: string
  score: number
  category: string
  why: string
  scored_at: string
}

/**
 * Notify this user's subscriptions about their new high-signal opportunities.
 */
export async function sendNotificationsForNewStories(userId: string): Promise<number> {
  configureWebPush()
  const twoHoursAgo = new Date(Date.now() - 2 * 3_600_000).toISOString()

  const { data: stories, error: storiesError } = await supabaseAdmin
    .from('scored_stories')
    .select('id, title, url, score, category, why, scored_at')
    .eq('user_id', userId)
    .gte('score', 9)
    .eq('category', 'opportunity')
    .gte('scored_at', twoHoursAgo)
    .eq('notified', false)

  if (storiesError || !stories || stories.length === 0) return 0

  const { data: subs, error: subsError } = await supabaseAdmin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (subsError || !subs || subs.length === 0) return 0

  let sent = 0

  for (const story of stories as ScoredStory[]) {
    const payload = JSON.stringify({
      title: `🔴 Signal: ${story.title}`,
      body: story.why,
      url: story.url,
    })

    const failedEndpoints: string[] = []

    for (const sub of subs) {
      const pushSub: PushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      }

      try {
        await webpush.sendNotification(pushSub, payload)
        sent++
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode
        if (statusCode === 410 || statusCode === 404) {
          failedEndpoints.push(sub.endpoint)
        }
      }
    }

    await supabaseAdmin.from('scored_stories').update({ notified: true }).eq('id', story.id)

    if (failedEndpoints.length > 0) {
      await supabaseAdmin
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .in('endpoint', failedEndpoints)
    }
  }

  return sent
}
