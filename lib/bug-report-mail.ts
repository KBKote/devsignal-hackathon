import nodemailer from 'nodemailer'

const ALLOWED_IMAGE = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

export type BugReportAttachment = {
  filename: string
  content: Buffer
  contentType: string
}

export function isConfigured(): boolean {
  return Boolean(
    process.env.BUG_REPORT_TO_EMAIL?.trim() &&
      process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim()
  )
}

function createTransport() {
  const host = process.env.SMTP_HOST!.trim()
  const port = parseInt(process.env.SMTP_PORT ?? '587', 10)
  const user = process.env.SMTP_USER!.trim()
  const pass = process.env.SMTP_PASS!.trim()

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    requireTLS: port === 587,
  })
}

export async function sendBugReportEmail(params: {
  subject: string
  text: string
  attachments: BugReportAttachment[]
}): Promise<void> {
  const to = process.env.BUG_REPORT_TO_EMAIL!.trim()
  const from = (process.env.BUG_REPORT_FROM_EMAIL ?? process.env.SMTP_USER)!.trim()

  const transport = createTransport()
  await transport.sendMail({
    from,
    to,
    subject: params.subject,
    text: params.text,
    attachments: params.attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: ALLOWED_IMAGE.has(a.contentType) ? a.contentType : 'application/octet-stream',
    })),
  })
}

export function assertImageMime(mime: string): boolean {
  return ALLOWED_IMAGE.has(mime.toLowerCase())
}
