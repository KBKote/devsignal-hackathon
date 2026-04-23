"use client"

import { useState, useCallback, useEffect } from "react"
import { ParticleTextEffect, type WordConfig } from "@/components/ui/particle-text-effect"

/** Extra ms once the word reads as formed before disperse. */
const HOLD_AFTER_FORM_MS = 1400

const INTRO_WORDS: WordConfig[] = [
  { text: "This is",    font: (w) => `700 ${Math.round(w * 0.04)}px Georgia, serif`,    msDuration: 2000 + HOLD_AFTER_FORM_MS },
  { text: "Dev Signal", font: (w) => `700 ${Math.round(w * 0.065)}px Georgia, serif`,   msDuration: 1600 + HOLD_AFTER_FORM_MS },
  { text: "By",         font: (w) => `700 ${Math.round(w * 0.04)}px Georgia, serif`,     msDuration: 1200 + HOLD_AFTER_FORM_MS },
  { text: "@kbxxxj",    font: (w) => `700 ${Math.round(w * 0.05)}px 'Courier New', monospace`, msDuration: 1800 + HOLD_AFTER_FORM_MS },
]

interface FeedIntroProps {
  onDone: () => void
}

export function FeedIntro({ onDone }: FeedIntroProps) {
  const [isMobile] = useState(() => window.innerWidth < 768)
  const [fading, setFading] = useState(false)
  const [showSkip, setShowSkip] = useState(false)

  useEffect(() => {
    if (isMobile) { onDone(); return }
    const t = window.setTimeout(() => setShowSkip(true), 2500)
    return () => clearTimeout(t)
  }, [isMobile, onDone])

  const dismiss = useCallback(() => {
    if (fading) return
    setFading(true)
    window.setTimeout(onDone, 900)
  }, [fading, onDone])

  if (isMobile) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black cursor-pointer"
      onClick={dismiss}
      style={{
        opacity: fading ? 0 : 1,
        transition: fading ? "opacity 0.9s ease-in-out" : undefined,
        pointerEvents: fading ? "none" : undefined,
      }}
    >
      <ParticleTextEffect
        words={INTRO_WORDS}
        msPerWord={1800}
        msFinalHold={1200}
        onComplete={dismiss}
      />

      <button
        onClick={dismiss}
        className="absolute bottom-8 right-8 font-mono text-xs text-zinc-600 transition-all duration-500 hover:text-zinc-400"
        style={{
          opacity: showSkip ? 1 : 0,
          pointerEvents: showSkip ? "auto" : "none",
        }}
      >
        skip →
      </button>
    </div>
  )
}
