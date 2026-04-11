'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export function PublicNav() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    void supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null))
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    setUser(null)
  }

  if (user) {
    return (
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link
          href="/feed"
          className="rounded-full border border-black/20 bg-black px-4 py-2 font-medium text-white transition hover:bg-black/85"
        >
          Live feed
        </Link>
        <Link href="/settings" className="font-medium text-black/75 transition hover:text-black">
          Settings
        </Link>
        <button
          type="button"
          onClick={() => void signOut()}
          className="font-medium text-black/55 transition hover:text-black"
        >
          Sign out
        </button>
      </div>
    )
  }

  return (
    <Link
      href="/"
      className="rounded-full border border-black/20 bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-black/5"
    >
      Sign in
    </Link>
  )
}
