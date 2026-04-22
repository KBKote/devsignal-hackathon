"use client"

import { useState, useCallback, useEffect } from "react"
import { ParticleTextEffect, type WordConfig } from "@/components/ui/particle-text-effect"

const INTRO_WORDS: WordConfig[] = [
  { text: "This is",   font: "300 72px Georgia, serif" },
  { text: "DevSignal", font: "bold 120px Georgia, serif" },
  { text: "By",        font: "300 72px Georgia, serif",           msDuration: 2200 },
  { text: "@kbxxxj",   font: "bold 90px 'Courier New', monospace" },
]

interface FeedIntroProps {
  onDone: () => void
}

export function FeedIntro({ onDone }: FeedIntroProps) {
  const [fading, setFading] = useState(false)
  const [showSkip, setShowSkip] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setShowSkip(true), 2500)
    return () => clearTimeout(t)
  }, [])

  const dismiss = useCallback(() => {
    if (fading) return
    setFading(true)
    window.setTimeout(onDone, 900)
  }, [fading, onDone])

  return (
    <div
      className="fixed inset-0 z-50 bg-black"
      style={{
        opacity: fading ? 0 : 1,
        transition: fading ? "opacity 0.9s ease-in-out" : undefined,
        pointerEvents: fading ? "none" : undefined,
      }}
    >
      <ParticleTextEffect
        words={INTRO_WORDS}
        msPerWord={2800}
        msFinalHold={2800}
        msDisperse={500}
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
