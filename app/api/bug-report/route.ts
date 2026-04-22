import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/session'
import { assertImageMime, isConfigured, sendBugReportEmail } from '@/lib/bug-report-mail'
import { checkBugReportRateLimit } from '@/lib/bug-report-rate-limit'

export const runtime = 'nodejs'

const MAX_DESC = 8000
const MAX_REPRO = 8000
const MAX_FILES = 3
const MAX_BYTES_PER_FILE = 5 * 1024 * 1024

function clientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  return request.headers.get('x-real-ip')?.trim() ?? 'unknown'
}

function safeFilename(name: string, index: number): string {
  const base = name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120)
  return base || `screenshot-${index + 1}.png`
}

export async function POST(request: Request) {
  if (!isConfigured()) {
    return NextResponse.json(
      {
        error: 'bug_report_unconfigured',
        message:
          'Bug reporting is not configured. Add BUG_REPORT_TO_EMAIL plus SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS to .env.local (see /docs#environment).',
      },
      { status: 503 }
    )
  }

  const ip = clientIp(request)
  const user = await getSessionUser()
  const userId = user?.id ?? null

  const limited = checkBugReportRateLimit(ip, userId)
  if (!limited.ok) {
    return NextResponse.json({ error: 'rate_limited', message: limited.message }, { status: 429 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'invalid_body', message: 'Expected multipart form data.' }, { status: 400 })
  }

  const honeypot = formData.get('company')
  if (typeof honeypot === 'string' && honeypot.trim().length > 0) {
    return NextResponse.json({ ok: true })
  }

  const description = typeof formData.get('description') === 'string' ? (formData.get('description') as string) : ''
  const repro = typeof formData.get('repro') === 'string' ? (formData.get('repro') as string) : ''
  const pageUrl = typeof formData.get('pageUrl') === 'string' ? (formData.get('pageUrl') as string) : ''
  const clientUserAgent = typeof formData.get('userAgent') === 'string' ? (formData.get('userAgent') as string) : ''

  const desc = description.trim()
  if (!desc) {
    return NextResponse.json({ error: 'validation', message: 'Please describe the problem.' }, { status: 400 })
  }
  if (desc.length > MAX_DESC || repro.length > MAX_REPRO) {
    return NextResponse.json({ error: 'validation', message: 'Text is too long.' }, { status: 400 })
  }

  const files = formData.getAll('screenshots').filter((v): v is File => typeof File !== 'undefined' && v instanceof File)
  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: 'validation', message: `At most ${MAX_FILES} images are allowed.` },
      { status: 400 }
    )
  }

  const attachments: { filename: string; content: Buffer; contentType: string }[] = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (!file || file.size === 0) continue
    if (file.size > MAX_BYTES_PER_FILE) {
      return NextResponse.json(
        { error: 'validation', message: `Each image must be at most ${MAX_BYTES_PER_FILE / (1024 * 1024)} MB.` },
        { status: 400 }
      )
    }
    const mime = (file.type || 'application/octet-stream').toLowerCase()
    if (!assertImageMime(mime)) {
      return NextResponse.json(
        { error: 'validation', message: 'Only PNG, JPEG, WebP, or GIF images are allowed.' },
        { status: 400 }
      )
    }
    const buf = Buffer.from(await file.arrayBuffer())
    attachments.push({
      filename: safeFilename(file.name, i),
      content: buf,
      contentType: mime,
    })
  }

  const submittedAt = new Date().toISOString()
  const subjectLine = desc.split(/\r?\n/)[0].slice(0, 80) || 'Bug report'
  const subject = `[Dev Signal Bug] ${subjectLine}`

  const text = [
    `Submitted at: ${submittedAt}`,
    `Page URL: ${pageUrl || '(not provided)'}`,
    `User: ${userId ?? 'anonymous'}`,
    `IP (forwarded): ${ip}`,
    `User-Agent (client): ${clientUserAgent || '(not provided)'}`,
    `User-Agent (request): ${request.headers.get('user-agent') ?? '(not provided)'}`,
    '',
    '--- Description ---',
    desc,
    '',
    '--- Steps to reproduce ---',
    repro.trim() || '(not provided)',
    '',
    `Attachments: ${attachments.length} image(s)`,
  ].join('\n')

  try {
    await sendBugReportEmail({ subject, text, attachments })
  } catch (e) {
    console.error('[bug-report] sendMail failed:', e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: 'send_failed', message: 'Could not send email. Check SMTP settings or try again later.' },
      { status: 502 }
    )
  }

  return NextResponse.json({ ok: true })
}
