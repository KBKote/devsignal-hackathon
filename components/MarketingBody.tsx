import Link from 'next/link'

/** Public product overview — no pipeline or auth forms. */
export function MarketingBody() {
  return (
    <main className="signal-wrdlss-shell signal-hero-bg min-h-full px-5 py-16 text-black">
      <div className="mx-auto max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-black/50">Signal</p>
        <h1 className="mt-4 font-serif text-4xl leading-tight tracking-tight md:text-5xl">
          Personal intelligence for builders
        </h1>
        <p className="mt-5 text-lg text-black/75">
          Signal collects open-web tech, AI, and crypto stories (RSS, Reddit, Hacker News), then scores them with
          Claude Haiku against a profile tuned to you—so you see opportunities and ideas worth acting on, not an
          endless feed.
        </p>
        <p className="mt-4 text-sm text-black/65">
          You add your own Anthropic API key (encrypted in our database). We host the app, database, and scrapers with
          operator keys—nothing except your AI key lives in your hands.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/login?mode=signin"
            className="rounded-full border border-black/20 bg-black px-6 py-2.5 text-sm font-medium text-white transition hover:bg-black/85"
          >
            Log in
          </Link>
          <Link
            href="/login?mode=signup"
            className="rounded-full border border-black/20 bg-white px-6 py-2.5 text-sm font-medium text-black transition hover:bg-black/5"
          >
            Sign up
          </Link>
        </div>
      </div>
    </main>
  )
}
