'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { FeedCard, type Story } from '@/components/FeedCard'
import { CategoryFilter, type Category } from '@/components/CategoryFilter'

const REFRESH_INTERVAL_MS = 15 * 60 * 1000

const TERMINAL_LINES = [
  'watcher/rss          connected (12 sources)',
  'watcher/reddit       connected (4 subreddits)',
  'watcher/hn           connected (front-page stream)',
  'pipeline/filter      scoring batch via claude-haiku-4-5',
  'pipeline/storage     upserting scored stories',
  'alerts/opportunity   evaluating score >= 8 signals',
]

export default function LiveFeedPage() {
  const [stories, setStories] = useState<Story[]>([])
  const [category, setCategory] = useState<Category>('all')
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [runningPipeline, setRunningPipeline] = useState(false)
  const [pipelineMessage, setPipelineMessage] = useState('Control room online.')

  const fetchStories = useCallback(async () => {
    const response = await fetch('/api/stories', { cache: 'no-store' })
    const payload = await response.json()

    if (!response.ok || !payload.success) {
      console.error('Failed to fetch stories:', payload.error ?? response.statusText)
      setLoading(false)
      return
    }

    setStories((payload.stories as Story[]) ?? [])
    setLastUpdated(new Date())
    setLoading(false)
  }, [])

  const runPipeline = useCallback(async () => {
    setRunningPipeline(true)
    setPipelineMessage('Scraping sources...')
    try {
      const scrape = await fetch('/api/scrape')
      if (!scrape.ok) throw new Error('Scrape failed')
      setPipelineMessage('Scoring stories...')
      const filter = await fetch('/api/filter')
      if (!filter.ok) throw new Error('Filter failed')
      setPipelineMessage('Refreshing feed...')
      await fetchStories()
      setPipelineMessage('Control room synced.')
    } catch (err) {
      console.error(err)
      setPipelineMessage('Pipeline failed. Check API logs.')
    } finally {
      setRunningPipeline(false)
    }
  }, [fetchStories])

  useEffect(() => {
    const id = window.setTimeout(() => {
      void fetchStories()
    }, 0)
    return () => clearTimeout(id)
  }, [fetchStories])

  useEffect(() => {
    const timer = setInterval(fetchStories, REFRESH_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [fetchStories])

  const counts: Record<Category, number> = {
    all: stories.length,
    opportunity: stories.filter((s) => s.category === 'opportunity').length,
    idea: stories.filter((s) => s.category === 'idea').length,
    intel: stories.filter((s) => s.category === 'intel').length,
  }

  const filtered =
    category === 'all' ? stories : stories.filter((s) => s.category === category)

  return (
    <main className="signal-wrdlss-shell signal-hero-bg">
      <div className="mx-auto w-full max-w-6xl px-5 pb-24 pt-5 md:px-8">
        <header className="sticky top-5 z-20 mb-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/15 bg-white/60 px-5 py-3 text-black backdrop-blur-md">
          <Link href="/" className="text-2xl font-semibold tracking-tight">
            Signal
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={runPipeline}
              disabled={runningPipeline}
              className="rounded-full border border-black/20 bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {runningPipeline ? 'Running...' : 'Run Pipeline'}
            </button>
            <button
              onClick={fetchStories}
              className="rounded-full border border-black/20 bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-black/5"
            >
              Refresh Feed
            </button>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <div className="signal-section rounded-3xl border border-black/10 bg-white/82 p-7 text-black backdrop-blur-md">
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-black/65">
              Live Feed Control Room
            </p>
            <h1 className="font-serif text-5xl leading-[0.95] md:text-6xl">
              Real-time signal stream
            </h1>
            <p className="mt-4 max-w-xl text-lg text-black/70">
              Monitoring scrapers, filter pipeline, and opportunity alerts in one place.
            </p>

            <div className="mt-7 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-black/15 bg-white/75 p-4">
                <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-black/65">
                  Heartbeat
                </p>
                <div className="signal-heartbeat" />
              </div>
              <div className="rounded-2xl border border-black/15 bg-white/75 p-4">
                <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-black/65">
                  Voice Activity
                </p>
                <div className="signal-voice-bars">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-emerald-500/35 bg-black p-4 font-mono text-xs text-emerald-300">
              <p className="mb-2 text-emerald-400">terminal://signal-control</p>
              <div className="space-y-1">
                {TERMINAL_LINES.map((line) => (
                  <p key={line}>&gt; {line}</p>
                ))}
              </div>
              <p className="mt-2 text-emerald-200/80">
                &gt; status: {pipelineMessage}
                <span className="signal-caret">|</span>
              </p>
            </div>
          </div>

          <div className="signal-section rounded-3xl border border-black/10 bg-white/82 p-7 text-black backdrop-blur-md">
            <div className="mb-6 flex items-center justify-center">
              <div className="signal-cube-wrap" aria-hidden>
                <div className="signal-cube">
                  <div className="signal-face signal-face-front">Signal</div>
                  <div className="signal-face signal-face-back">Intel</div>
                  <div className="signal-face signal-face-right">Ideas</div>
                  <div className="signal-face signal-face-left">Ops</div>
                  <div className="signal-face signal-face-top">AI</div>
                  <div className="signal-face signal-face-bottom">Crypto</div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="rounded-xl border border-black/15 bg-white/75 p-4">
                <p className="text-sm text-black/65">Stories loaded</p>
                <p className="mt-1 text-2xl font-semibold text-black">{stories.length}</p>
              </div>
              <div className="rounded-xl border border-black/15 bg-white/75 p-4">
                <p className="text-sm text-black/65">Last update</p>
                <p className="mt-1 text-lg font-semibold text-black">
                  {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Loading...'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="signal-section mt-8 rounded-3xl border border-black/10 bg-white/82 p-4 md:p-6">
          <CategoryFilter active={category} onChange={setCategory} counts={counts} />
        </section>

        <section className="mt-6 space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-32 animate-pulse rounded-2xl border border-black/15 bg-white/65"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-black/15 bg-white/80 py-16 text-center text-black/70">
              <p className="mb-3 text-4xl">📡</p>
              <p className="font-medium text-black">No stories yet</p>
              <p className="mt-1 text-sm">Run pipeline to populate the live feed.</p>
              <button
                onClick={runPipeline}
                disabled={runningPipeline}
                className="mt-5 rounded-lg border border-black/20 bg-black px-4 py-2 text-sm text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {runningPipeline ? 'Running...' : 'Run now'}
              </button>
            </div>
          ) : (
            filtered.map((story) => <FeedCard key={story.id} story={story} />)
          )}
        </section>
      </div>
    </main>
  )
}
