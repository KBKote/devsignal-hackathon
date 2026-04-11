import { resolveRedirectOrigin } from '@/lib/trusted-origin'

/**
 * Origin from reverse-proxy headers (Cloudflare Tunnel, Vercel, nginx, …).
 */
function originFromForwardedHeaders(headers: Headers): string | null {
  const forwardedHost = headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  if (!forwardedHost) return null

  const forwardedProto = headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const proto =
    forwardedProto ||
    (forwardedHost.startsWith('localhost') || forwardedHost.startsWith('127.') ? 'http' : 'https')

  return `${proto}://${forwardedHost}`
}

/**
 * Public browser origin when the app sits behind a proxy. Uses `request.url` only as fallback
 * (often `http://localhost:3000` in dev — wrong for tunnel users if forwarded headers exist).
 */
export function getPublicOrigin(request: Pick<Request, 'headers' | 'url'>): string {
  const candidate = originFromForwardedHeaders(request.headers) ?? new URL(request.url).origin
  return resolveRedirectOrigin(candidate, request.url)
}

/**
 * Same as {@link getPublicOrigin} for Server Components / Route Handlers that only have `headers()`.
 * If there are no forwarded headers, uses `Host` + `X-Forwarded-Proto` (Cloudflare sets these on quick tunnels).
 */
export function getPublicOriginFromHeaders(headers: Headers, requestUrlFallback = 'http://localhost:3000/'): string {
  const fromForwarded = originFromForwardedHeaders(headers)
  if (fromForwarded) {
    return resolveRedirectOrigin(fromForwarded, requestUrlFallback)
  }

  const host = headers.get('host') || 'localhost:3000'
  const proto =
    headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ||
    (host.includes('localhost') || host.startsWith('127.') ? 'http' : 'https')

  const candidate = `${proto}://${host}`
  return resolveRedirectOrigin(candidate, requestUrlFallback)
}
