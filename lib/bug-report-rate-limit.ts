const WINDOW_MS = 15 * 60 * 1000
const MAX_PER_IP = 5
const MAX_PER_USER = 3

const ipHits = new Map<string, number[]>()
const userHits = new Map<string, number[]>()

function prune(ts: number[], now: number): number[] {
  return ts.filter((t) => now - t < WINDOW_MS)
}

export function checkBugReportRateLimit(
  ip: string,
  userId: string | null
): { ok: true } | { ok: false; message: string } {
  const now = Date.now()

  const ipList = prune(ipHits.get(ip) ?? [], now)
  if (ipList.length >= MAX_PER_IP) {
    return { ok: false, message: 'Too many reports from this network. Please try again in about 15 minutes.' }
  }

  if (userId) {
    const uList = prune(userHits.get(userId) ?? [], now)
    if (uList.length >= MAX_PER_USER) {
      return { ok: false, message: 'Too many reports from this account. Please try again in about 15 minutes.' }
    }
    uList.push(now)
    userHits.set(userId, uList)
  }

  ipList.push(now)
  ipHits.set(ip, ipList)
  return { ok: true }
}
