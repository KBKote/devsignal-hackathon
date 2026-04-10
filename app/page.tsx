'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

const ASCII_BAND = `
░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░
:::..   SIGNAL // INTELLIGENCE // OPPORTUNITIES // IDEAS // INTEL   ..:::
░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░░▒▓█▓▒░
`

export default function HomePage() {
  const [runningPipeline, setRunningPipeline] = useState(false)
  const [pipelineMessage, setPipelineMessage] = useState<string>('')
  const [clock, setClock] = useState(new Date())
  const [mounted, setMounted] = useState(false)

  const runPipeline = useCallback(async () => {
    setRunningPipeline(true)
    setPipelineMessage('Running scrape...')
    try {
      const scrape = await fetch('/api/scrape')
      if (!scrape.ok) throw new Error('Scrape failed')
      setPipelineMessage('Scoring stories...')
      const filter = await fetch('/api/filter')
      if (!filter.ok) throw new Error('Filter failed')
      setPipelineMessage('Signal refreshed.')
    } catch (err) {
      console.error(err)
      setPipelineMessage('Run failed. Check API logs and env keys.')
    } finally {
      setRunningPipeline(false)
    }
  }, [])

  const jumpToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    setMounted(true)
    setClock(new Date())
  }, [])

  return (
    <main className="signal-wrdlss-shell signal-hero-bg">
      <div className="mx-auto w-full max-w-6xl px-5 pb-24 pt-5 md:px-8">
        <header className="sticky top-5 z-20 mb-10 rounded-2xl border border-black/15 bg-white/60 px-4 py-3 text-black backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
            <div className="text-2xl font-semibold tracking-tight">Signal</div>
            <nav className="hidden items-center gap-6 font-medium md:flex">
              <button onClick={() => jumpToSection('features')} className="transition hover:opacity-60" type="button">
                Features
              </button>
              <button onClick={() => jumpToSection('gateway')} className="transition hover:opacity-60" type="button">
                Feed
              </button>
              <button onClick={() => jumpToSection('categories')} className="transition hover:opacity-60" type="button">
                Categories
              </button>
              <button onClick={() => jumpToSection('status')} className="transition hover:opacity-60" type="button">
                Status
              </button>
            </nav>
            <div className="flex items-center gap-3">
              <button
                onClick={runPipeline}
                disabled={runningPipeline}
                className="rounded-full border border-black/20 bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {runningPipeline ? 'Working...' : 'Run Pipeline'}
              </button>
              <Link
                href="/feed"
                className="rounded-full border border-black/20 bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-black/5"
              >
                Open Live Feed
              </Link>
            </div>
          </div>
        </header>

        <section
          id="features"
          className="signal-section mb-10 grid min-h-[85vh] gap-8 rounded-3xl border border-black/10 bg-white/80 p-8 text-black backdrop-blur-md md:grid-cols-[1.2fr_0.8fr] md:p-12"
        >
          <div>
            <p className="mb-6 inline-flex items-center rounded-full border border-black/20 bg-black/5 px-4 py-2 font-mono text-xs tracking-[0.2em] text-black/80">
              TERMINAL SURFACE / PERSONAL SIGNAL SYSTEM
            </p>
            <h1 className="max-w-xl font-serif text-5xl leading-[0.95] tracking-tight md:text-7xl">
              Signal for builders
            </h1>
            <p className="mt-6 max-w-xl text-lg text-black/70">
              Home is now dedicated to immersion and flow. The news feed is fully separated so this page can stay cinematic,
              smooth, and distraction-free.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <button
                onClick={runPipeline}
                disabled={runningPipeline}
                className="rounded-2xl border border-black/20 bg-black px-6 py-3 text-base font-medium text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {runningPipeline ? 'Running pipeline...' : 'Run Pipeline'}
              </button>
              <Link href="/feed" className="text-base font-medium text-black/80 transition hover:text-black">
                Open Live Feed
              </Link>
            </div>

            <div className="mt-6 font-mono text-xs text-black/60">
              {pipelineMessage || 'READY // awaiting next pipeline run'}
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-5">
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
            <div className="w-full max-w-[320px] rounded-2xl border border-black/15 bg-white/70 p-4">
              <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-black/70">Live Systems</p>
              <div className="signal-heartbeat mb-4" />
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
        </section>

        <section
          id="gateway"
          className="signal-section mb-10 rounded-3xl border border-black/10 bg-white/82 p-8 text-black backdrop-blur-md md:p-12"
        >
          <pre className="signal-ascii-marquee">{ASCII_BAND}</pre>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-black/15 bg-black/[0.03] p-5">
              <p className="font-mono text-xs tracking-[0.2em] text-black/70">ENTRY POINT</p>
              <p className="mt-2 text-xl font-semibold">Main feed is intentionally separate.</p>
              <p className="mt-2 text-sm text-black/70">
                Clean landing flow on this page. Operational intelligence lives in `/feed`.
              </p>
            </div>
            <div className="rounded-2xl border border-black/15 bg-black/[0.03] p-5">
              <p className="font-mono text-xs tracking-[0.2em] text-black/70">ACTION</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Link
                  href="/feed"
                  className="rounded-xl border border-black/20 bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-black/80"
                >
                  Enter Live Feed
                </Link>
                <button
                  onClick={runPipeline}
                  disabled={runningPipeline}
                  className="rounded-xl border border-black/20 px-4 py-2 text-sm font-medium transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {runningPipeline ? 'Running...' : 'Run Pipeline'}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section
          id="categories"
          className="signal-section mb-10 grid gap-4 rounded-3xl border border-black/10 bg-white/82 p-8 text-black md:grid-cols-3 md:p-10"
        >
          {['Opportunities', 'Ideas', 'Intel'].map((item) => (
            <div key={item} className="rounded-2xl border border-black/15 bg-black/[0.03] p-5">
              <p className="font-mono text-xs tracking-[0.2em] text-black/70">CATEGORY</p>
              <p className="mt-2 text-2xl font-semibold">{item}</p>
              <p className="mt-2 text-sm text-black/70">Classified and scored for fast decision loops.</p>
            </div>
          ))}
        </section>

        <section id="status" className="signal-section rounded-3xl border border-black/10 bg-white/82 p-8 text-black md:p-10">
          <div className="rounded-2xl border border-emerald-500/40 bg-black p-5 font-mono text-xs text-emerald-300">
            <p className="mb-2">status://signal-core</p>
            <p>&gt; clock: {mounted ? clock.toLocaleString() : '--:--:--'}</p>
            <p>&gt; pipeline: {runningPipeline ? 'running' : 'idle'}</p>
            <p>&gt; ui-mode: wrdlss-inspired immersive landing</p>
            <p>
              &gt; next: <Link href="/feed" className="underline">open live feed</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
