'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback, useRef } from 'react'
import { FeedCard, type Story } from '@/components/FeedCard'
import { CategoryFilter, type Category } from '@/components/CategoryFilter'
import { PipelineProgress, type StepState } from '@/components/PipelineProgress'
import {
  DEFAULT_PIPELINE_PREFS,
  PipelinePreferencesPanel,
  type PipelinePreferences,
} from '@/components/PipelinePreferences'
import { canSubmitPipelinePrefs } from '@/lib/pipeline-preferences'

const REFRESH_INTERVAL_MS = 15 * 60 * 1000

const TERMINAL_LINES = [
  'watcher/rss          connected (12 sources)',
  'watcher/reddit       connected (4 subreddits)',
  'watcher/hn           connected (front-page stream)',
  'pipeline/filter      scoring batch via claude-haiku-4-5',
  'pipeline/storage     upserting scored stories',
  'alerts/opportunity   evaluating score >= 8 signals',
]

const INITIAL_PIPE_STEPS = [
  { label: 'Collect RSS, Reddit & Hacker News', state: 'pending' as StepState },
  { label: 'Score new stories (Claude Haiku)', state: 'pending' as StepState },
  { label: 'Reload feed from database', state: 'pending' as StepState },
]

function filterRequestBody(prefs: PipelinePreferences) {
  return JSON.stringify({
    topicMode: prefs.topicMode,
    topicCustom: prefs.topicMode === 'other' ? prefs.topicCustom : '',
    scope: prefs.scope,
  })
}

export default function LiveFeedPage() {
  const [stories, setStories] = useState<Story[]>([])
  const [category, setCategory] = useState<Category>('all')
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [runningPipeline, setRunningPipeline] = useState(false)
  const [pipelineMessage, setPipelineMessage] = useState('Control room online.')
  const [pipeSteps, setPipeSteps] = useState(INITIAL_PIPE_STEPS)
  const [pipelinePrefs, setPipelinePrefs] = useState<PipelinePreferences>(DEFAULT_PIPELINE_PREFS)
  const [hasAnthropicKey, setHasAnthropicKey] = useState(false)
  const pipelineRunningRef = useRef(false)

  useEffect(() => {
    void fetch('/api/settings/status', { credentials: 'include' }).then(async (r) => {
      if (r.ok) {
        const j = await r.json()
        setHasAnthropicKey(Boolean(j.hasAnthropicKey))
      }
    })
  }, [])

  const fetchStories = useCallback(async (): Promise<boolean> => {
    if (pipelineRunningRef.current) {
      return false
    }

    const response = await fetch('/api/stories', { cache: 'no-store', credentials: 'include' })
    const payload = await response.json()

    if (!response.ok || !payload.success) {
      console.error('Failed to fetch stories:', payload.error ?? response.statusText)
      setLoading(false)
      return false
    }

    setStories((payload.stories as Story[]) ?? [])
    setLastUpdated(new Date())
    setLoading(false)
    return true
  }, [])

  const runPipeline = useCallback(async () => {
    if (!canSubmitPipelinePrefs(pipelinePrefs)) return
    if (!hasAnthropicKey) {
      setPipelineMessage('Add your Anthropic API key in Settings first.')
      return
    }

    pipelineRunningRef.current = true
    setStories([])
    setPipeSteps(INITIAL_PIPE_STEPS.map((s) => ({ ...s, state: 'pending' as StepState })))
    setRunningPipeline(true)
    setPipelineMessage('Starting…')

    const mark = (index: number, state: StepState) => {
      setPipeSteps((prev) => prev.map((s, i) => (i === index ? { ...s, state } : s)))
    }

    try {
      mark(0, 'running')
      setPipelineMessage('Step 1 of 3 — collecting from RSS, Reddit, and HN…')
      const scrape = await fetch('/api/scrape', { credentials: 'include' })
      if (!scrape.ok) throw new Error('Scrape failed')
      mark(0, 'done')

      mark(1, 'running')
      setPipelineMessage('Step 2 of 3 — scoring with Claude Haiku…')
      const filter = await fetch('/api/filter', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: filterRequestBody(pipelinePrefs),
      })
      if (!filter.ok) {
        const errBody = await filter.json().catch(() => ({}))
        throw new Error(typeof errBody.error === 'string' ? errBody.error : 'Filter failed')
      }
      mark(1, 'done')

      pipelineRunningRef.current = false
      mark(2, 'running')
      setPipelineMessage('Step 3 of 3 — loading stories…')
      const ok = await fetchStories()
      if (!ok) throw new Error('Stories fetch failed')
      mark(2, 'done')

      setPipelineMessage('Control room synced.')
    } catch (err) {
      console.error(err)
      setPipelineMessage(
        err instanceof Error ? err.message : 'Pipeline failed. Check API logs or try Refresh Feed.'
      )
      setPipeSteps((prev) => {
        const next = prev.map((s) => ({ ...s }))
        const ri = next.findIndex((s) => s.state === 'running')
        if (ri >= 0) next[ri] = { ...next[ri], state: 'error' }
        return next
      })
      setStories([])
    } finally {
      pipelineRunningRef.current = false
      setRunningPipeline(false)
    }
  }, [fetchStories, pipelinePrefs, hasAnthropicKey])

  useEffect(() => {
    const id = window.setTimeout(() => {
      void fetchStories()
    }, 0)
    return () => clearTimeout(id)
  }, [fetchStories])

  useEffect(() => {
    const timer = setInterval(() => {
      void fetchStories()
    }, REFRESH_INTERVAL_MS)
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

  const showPipelineDetail =
    runningPipeline || pipeSteps.some((s) => s.state === 'done' || s.state === 'error')

  const prefsOk = canSubmitPipelinePrefs(pipelinePrefs)
  const canRun = prefsOk && hasAnthropicKey
  const showFeedSection = !runningPipeline

  return (
    <main className="signal-wrdlss-shell signal-hero-bg">
      <div className="mx-auto w-full max-w-6xl px-5 pb-24 pt-5 md:px-8">
        <header className="sticky top-5 z-20 mb-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/15 bg-white/60 px-5 py-3 text-black backdrop-blur-md">
          <Link href="/" className="text-2xl font-semibold tracking-tight">
            Signal
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={runPipeline}
              disabled={runningPipeline || !canRun}
              title={
                !hasAnthropicKey
                  ? 'Add your Anthropic key in Settings'
                  : !prefsOk
                    ? 'Add a custom topic or choose a preset'
                    : undefined
              }
              className="rounded-full border border-black/20 bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {runningPipeline ? 'Running...' : 'Run Pipeline'}
            </button>
            <button
              onClick={() => void fetchStories()}
              className="rounded-full border border-black/20 bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-black/5"
            >
              Refresh Feed
            </button>
            <Link
              href="/settings"
              className="rounded-full border border-black/20 px-4 py-2 text-sm font-medium text-black transition hover:bg-black/5"
            >
              Settings
            </Link>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-start">
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

            <div className="mt-6">
              <PipelinePreferencesPanel
                value={pipelinePrefs}
                onChange={setPipelinePrefs}
                disabled={runningPipeline}
              />
            </div>

            {!hasAnthropicKey && (
              <p className="mt-4 rounded-xl border border-amber-500/40 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                Add your Anthropic API key in{' '}
                <Link href="/settings" className="font-medium underline underline-offset-2">
                  Settings
                </Link>{' '}
                to run the scoring pipeline (BYOK — your key, your usage).
              </p>
            )}

            <div className="mt-4">
              <p className="font-mono text-xs leading-snug text-black/60">{pipelineMessage}</p>
              {showPipelineDetail && (
                <div className="mt-2">
                  <PipelineProgress steps={pipeSteps} />
                </div>
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-emerald-500/35 bg-black p-4 font-mono text-xs text-emerald-300">
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

        {showFeedSection ? (
          <>
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
                    disabled={runningPipeline || !canRun}
                    className="mt-5 rounded-lg border border-black/20 bg-black px-4 py-2 text-sm text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {runningPipeline ? 'Running...' : 'Run now'}
                  </button>
                </div>
              ) : (
                filtered.map((story) => <FeedCard key={story.id} story={story} />)
              )}
            </section>
          </>
        ) : (
          <section className="signal-section mt-8 rounded-3xl border border-black/10 bg-white/82 p-10 text-center text-black/70">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-black/50">Pipeline active</p>
            <p className="mt-3 text-lg font-medium text-black">Refreshing your feed…</p>
            <p className="mt-2 max-w-md mx-auto text-sm">
              Stories stay hidden until collection, scoring, and reload finish so you don’t see stale cards
              mixed with a run in progress.
            </p>
          </section>
        )}
      </div>
    </main>
  )
}
