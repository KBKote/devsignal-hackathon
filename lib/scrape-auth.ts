import { NextResponse } from 'next/server'

/**
 * Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set in project env.
 * Local dev skips this check so manual runs work without the secret.
 */
export function scrapeUnauthorizedResponse(request: Request): NextResponse | null {
  if (process.env.NODE_ENV === 'development') {
    return null
  }

  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { success: false, error: 'Scrape is disabled: set CRON_SECRET in production' },
      { status: 503 }
    )
  }

  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  return null
}
