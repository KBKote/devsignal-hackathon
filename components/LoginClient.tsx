'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { AuthLandingForm } from '@/components/AuthLandingForm'

function AuthFormFallback() {
  return (
    <div className="w-full max-w-md rounded-3xl border border-black/10 bg-white/95 p-8 text-black shadow-sm backdrop-blur-md">
      <p className="text-sm text-black/50">Loading…</p>
    </div>
  )
}

export function LoginClient() {
  return (
    <main className="signal-wrdlss-shell signal-hero-bg flex min-h-full items-center justify-center px-5 py-16">
      <div className="w-full max-w-md">
        <Suspense fallback={<AuthFormFallback />}>
          <AuthLandingForm />
        </Suspense>
        <p className="mt-8 text-center text-xs text-black/45">
          <Link href="/" className="underline hover:text-black">
            About Signal
          </Link>
        </p>
      </div>
    </main>
  )
}
