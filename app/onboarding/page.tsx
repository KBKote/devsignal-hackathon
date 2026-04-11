'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const EXPERIENCE_OPTIONS = [
  { value: 'beginner', label: 'Early journey (under 1 year in AI/crypto)' },
  { value: 'intermediate', label: 'Intermediate (1–3 years)' },
  { value: 'advanced', label: 'Advanced (3+ years)' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [background, setBackground] = useState('')
  const [goals, setGoals] = useState('')
  const [avoid, setAvoid] = useState('')
  const [experience, setExperience] = useState('beginner')

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/onboarding', { credentials: 'include' })
      if (res.status === 401) {
        router.replace('/login?redirect=/onboarding')
        return
      }
      const data = await res.json()
      const p = data.profile ?? {}
      if (typeof p.background === 'string') setBackground(p.background)
      if (typeof p.goals === 'string') setGoals(p.goals)
      if (typeof p.avoid === 'string') setAvoid(p.avoid)
      if (typeof p.experience === 'string' && p.experience) setExperience(p.experience)
      setLoading(false)
    })()
  }, [router])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/onboarding', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile: {
          background: background.trim(),
          goals: goals.trim(),
          avoid: avoid.trim(),
          experience: experience.trim(),
        },
        onboarding_completed: true,
      }),
    })
    setSaving(false)
    if (!res.ok) return
    router.push('/settings')
  }

  if (loading) {
    return (
      <main className="signal-wrdlss-shell signal-hero-bg flex min-h-full items-center justify-center px-5 py-16">
        <p className="text-sm text-black/50">Loading…</p>
      </main>
    )
  }

  return (
    <main className="signal-wrdlss-shell signal-hero-bg px-5 py-12 md:py-16">
      <div className="mx-auto max-w-lg rounded-3xl border border-black/10 bg-white/90 p-8 text-black shadow-sm backdrop-blur-md">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-black/50">Onboarding</p>
        <h1 className="mt-2 font-serif text-3xl tracking-tight">Tailor your signal</h1>
        <p className="mt-2 text-sm text-black/65">
          Answers shape how Claude Haiku scores stories for you. You can change them later in settings.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <label className="block font-mono text-xs text-black/55" htmlFor="bg">
              Background
            </label>
            <textarea
              id="bg"
              required
              rows={3}
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-black/35"
              placeholder="What you’re working on, time zone, focus areas…"
            />
          </div>
          <div>
            <label className="block font-mono text-xs text-black/55" htmlFor="goals">
              Goals
            </label>
            <textarea
              id="goals"
              required
              rows={3}
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-black/35"
              placeholder="Opportunities, learning, projects, career…"
            />
          </div>
          <div>
            <label className="block font-mono text-xs text-black/55" htmlFor="avoid">
              Deprioritize
            </label>
            <textarea
              id="avoid"
              rows={2}
              value={avoid}
              onChange={(e) => setAvoid(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-black/35"
              placeholder="Noise you want scored lower (optional)"
            />
          </div>
          <div>
            <label className="block font-mono text-xs text-black/55" htmlFor="exp">
              Experience level
            </label>
            <select
              id="exp"
              required
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-black/35"
            >
              {EXPERIENCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl border border-black/20 bg-black py-2.5 text-sm font-medium text-white transition hover:bg-black/85 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save and continue'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-black/45">
          <Link href="/feed" className="underline hover:text-black">
            Skip and open feed
          </Link>
        </p>
      </div>
    </main>
  )
}
