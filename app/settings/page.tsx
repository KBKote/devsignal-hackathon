'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasKey, setHasKey] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/settings/status', { credentials: 'include' })
      if (res.status === 401) {
        router.replace('/login?redirect=/settings')
        return
      }
      const data = await res.json()
      setHasKey(Boolean(data.hasAnthropicKey))
      setLoading(false)
    })()
  }, [router])

  async function saveKey(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    setSaving(true)
    const res = await fetch('/api/settings/anthropic', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: apiKey.trim() }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) {
      setMessage(typeof data.error === 'string' ? data.error : 'Could not save key')
      return
    }
    setHasKey(true)
    setApiKey('')
    setMessage('Saved. Your key is encrypted and only used server-side when you run the filter.')
    const st = await fetch('/api/settings/status', { credentials: 'include' }).then((r) => r.json())
    if (!st.onboardingCompleted) {
      router.push('/onboarding')
    } else {
      router.push('/feed')
    }
  }

  async function removeKey() {
    setMessage('')
    const res = await fetch('/api/settings/anthropic', { method: 'DELETE', credentials: 'include' })
    if (res.ok) {
      setHasKey(false)
      setMessage('Key removed.')
    }
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
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-black/50">Settings</p>
        <h1 className="mt-2 font-serif text-3xl tracking-tight">Anthropic API key</h1>
        <p className="mt-2 text-sm text-black/65">
          Bring your own key (BYOK). It is encrypted before storage and only decrypted on the server when
          you run the scoring step.{' '}
          <a
            href="https://console.anthropic.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-black"
          >
            Get a key
          </a>
        </p>

        {hasKey ? (
          <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900">
            A key is on file. Paste a new one below to replace it.
          </p>
        ) : null}

        <form onSubmit={saveKey} className="mt-6 space-y-4">
          <div>
            <label htmlFor="key" className="block font-mono text-xs text-black/55">
              API key
            </label>
            <input
              id="key"
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-black/15 px-3 py-2 font-mono text-sm outline-none focus:border-black/35"
              placeholder="sk-ant-api03-…"
            />
          </div>
          <button
            type="submit"
            disabled={saving || !apiKey.trim()}
            className="w-full rounded-xl border border-black/20 bg-black py-2.5 text-sm font-medium text-white transition hover:bg-black/85 disabled:opacity-60"
          >
            {saving ? 'Saving…' : hasKey ? 'Replace key' : 'Save key'}
          </button>
        </form>

        {hasKey ? (
          <button
            type="button"
            onClick={() => void removeKey()}
            className="mt-3 w-full rounded-xl border border-black/15 py-2 text-sm text-black/70 transition hover:bg-black/5"
          >
            Remove key
          </button>
        ) : null}

        {message ? <p className="mt-4 text-sm text-black/70">{message}</p> : null}

        <div className="mt-8 flex flex-wrap items-center gap-3 text-sm">
          <Link href="/feed" className="font-medium text-black underline hover:no-underline">
            Open live feed
          </Link>
          <button
            type="button"
            className="ml-auto text-black/45 hover:text-black"
            onClick={() => {
              void createSupabaseBrowserClient().auth.signOut().then(() => router.replace('/'))
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </main>
  )
}
