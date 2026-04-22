"use client"

import { useEffect, useRef } from "react"

// ─── Fixed canvas dimensions (matches reference) ────────────────────────────
// CSS scales the canvas to fill the container; keeping dimensions fixed makes
// spawn positions and travel distances perfectly predictable every word.
const CANVAS_W = 1000
const CANVAS_H = 500

interface Vector2D {
  x: number
  y: number
}

class Particle {
  pos: Vector2D = { x: 0, y: 0 }
  vel: Vector2D = { x: 0, y: 0 }
  acc: Vector2D = { x: 0, y: 0 }
  target: Vector2D = { x: 0, y: 0 }

  closeEnoughTarget = 100
  maxSpeed = 1.0
  maxForce = 0.1
  particleSize = 10
  isKilled = false

  // Always white — start from black (or current blended value), target to white
  startColor = { r: 0, g: 0, b: 0 }
  targetColor = { r: 255, g: 255, b: 255 }
  colorWeight = 0
  colorBlendRate = 0.01

  move() {
    let proximityMult = 1
    const distance = Math.sqrt(
      (this.pos.x - this.target.x) ** 2 + (this.pos.y - this.target.y) ** 2
    )
    if (distance < this.closeEnoughTarget) {
      proximityMult = distance / this.closeEnoughTarget
    }

    const toX = this.target.x - this.pos.x
    const toY = this.target.y - this.pos.y
    const magnitude = Math.sqrt(toX * toX + toY * toY)
    if (magnitude > 0) {
      const desiredX = (toX / magnitude) * this.maxSpeed * proximityMult
      const desiredY = (toY / magnitude) * this.maxSpeed * proximityMult
      const steerX = desiredX - this.vel.x
      const steerY = desiredY - this.vel.y
      const steerMag = Math.sqrt(steerX * steerX + steerY * steerY)
      if (steerMag > 0) {
        this.acc.x += (steerX / steerMag) * this.maxForce
        this.acc.y += (steerY / steerMag) * this.maxForce
      }
    }

    this.vel.x += this.acc.x
    this.vel.y += this.acc.y
    this.pos.x += this.vel.x
    this.pos.y += this.vel.y
    this.acc.x = 0
    this.acc.y = 0
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.colorWeight < 1.0) {
      this.colorWeight = Math.min(this.colorWeight + this.colorBlendRate, 1.0)
    }
    const r = Math.round(this.startColor.r + (this.targetColor.r - this.startColor.r) * this.colorWeight)
    const g = Math.round(this.startColor.g + (this.targetColor.g - this.startColor.g) * this.colorWeight)
    const b = Math.round(this.startColor.b + (this.targetColor.b - this.startColor.b) * this.colorWeight)
    ctx.fillStyle = `rgb(${r},${g},${b})`
    ctx.fillRect(this.pos.x, this.pos.y, 2, 2)
  }

  kill() {
    if (!this.isKilled) {
      // Scatter to a random off-canvas position (reference pattern)
      const cx = CANVAS_W / 2
      const cy = CANVAS_H / 2
      const mag = (CANVAS_W + CANVAS_H) / 2
      const rx = Math.random() * CANVAS_W
      const ry = Math.random() * CANVAS_H
      const dx = rx - cx
      const dy = ry - cy
      const m = Math.sqrt(dx * dx + dy * dy) || 1
      this.target.x = cx + (dx / m) * mag
      this.target.y = cy + (dy / m) * mag

      // Fade to black while scattering
      this.startColor = {
        r: Math.round(this.startColor.r + (this.targetColor.r - this.startColor.r) * this.colorWeight),
        g: Math.round(this.startColor.g + (this.targetColor.g - this.startColor.g) * this.colorWeight),
        b: Math.round(this.startColor.b + (this.targetColor.b - this.startColor.b) * this.colorWeight),
      }
      this.targetColor = { r: 0, g: 0, b: 0 }
      this.colorWeight = 0
      this.isKilled = true
    }
  }
}

export interface WordConfig {
  text: string
  /** Canvas font string, e.g. "bold 100px Arial" */
  font?: string
  /** Override msPerWord for this specific word only */
  msDuration?: number
}

interface ParticleTextEffectProps {
  words: WordConfig[]
  /** Duration each word is displayed (form + hold), in ms. Default 3000. */
  msPerWord?: number
  /** Extra hold time on the very last word before onComplete fires. Default 3000. */
  msFinalHold?: number
  /** Pause while particles scatter before the next word starts. Default 700. */
  msDisperse?: number
  onComplete?: () => void
  pixelSteps?: number
}

export function ParticleTextEffect({
  words,
  msPerWord = 3000,
  msFinalHold = 3000,
  msDisperse = 700,
  onComplete,
  pixelSteps = 6,
}: ParticleTextEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | undefined>(undefined)
  const particlesRef = useRef<Particle[]>([])

  // Keep callback ref fresh without re-running the animation effect
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Fixed dimensions — CSS will stretch to fill the overlay
    canvas.width = CANVAS_W
    canvas.height = CANVAS_H

    const ctx = canvas.getContext("2d")!

    // ── helpers ─────────────────────────────────────────────────────────────

    const randomSpawnPos = (): Vector2D => {
      const cx = CANVAS_W / 2
      const cy = CANVAS_H / 2
      const mag = (CANVAS_W + CANVAS_H) / 2
      const rx = Math.random() * CANVAS_W
      const ry = Math.random() * CANVAS_H
      const dx = rx - cx
      const dy = ry - cy
      const m = Math.sqrt(dx * dx + dy * dy) || 1
      return { x: cx + (dx / m) * mag, y: cy + (dy / m) * mag }
    }

    // Directly adapted from the reference nextWord() function
    const buildWord = (idx: number) => {
      const { text, font } = words[idx]

      const off = document.createElement("canvas")
      off.width = CANVAS_W
      off.height = CANVAS_H
      const offCtx = off.getContext("2d")!
      offCtx.fillStyle = "white"
      offCtx.font = font ?? "bold 100px Arial"
      offCtx.textAlign = "center"
      offCtx.textBaseline = "middle"
      offCtx.fillText(text, CANVAS_W / 2, CANVAS_H / 2)

      const pixels = offCtx.getImageData(0, 0, CANVAS_W, CANVAS_H).data
      const particles = particlesRef.current
      let pIdx = 0

      // Collect pixel coords, then shuffle (reference: fluid-motion effect)
      const coords: number[] = []
      for (let i = 0; i < pixels.length; i += pixelSteps * 4) coords.push(i)
      for (let i = coords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[coords[i], coords[j]] = [coords[j], coords[i]]
      }

      for (const ci of coords) {
        if (pixels[ci + 3] > 0) {
          const x = (ci / 4) % CANVAS_W
          const y = Math.floor(ci / 4 / CANVAS_W)

          let p: Particle
          if (pIdx < particles.length) {
            // Reuse existing particle (reference pattern)
            p = particles[pIdx]
            p.isKilled = false
            pIdx++
          } else {
            p = new Particle()
            const sp = randomSpawnPos()
            p.pos.x = sp.x
            p.pos.y = sp.y
            p.maxSpeed = Math.random() * 8 + 8   // 8–16 px/frame — snappy arrival
            p.maxForce = p.maxSpeed * 0.08
            p.particleSize = Math.random() * 6 + 6
            p.colorBlendRate = Math.random() * 0.04 + 0.02  // faster colour blend
            particles.push(p)
          }

          // Transition colour from wherever it is now to white
          p.startColor = {
            r: Math.round(p.startColor.r + (p.targetColor.r - p.startColor.r) * p.colorWeight),
            g: Math.round(p.startColor.g + (p.targetColor.g - p.startColor.g) * p.colorWeight),
            b: Math.round(p.startColor.b + (p.targetColor.b - p.startColor.b) * p.colorWeight),
          }
          p.targetColor = { r: 255, g: 255, b: 255 }
          p.colorWeight = 0
          p.target.x = x
          p.target.y = y
        }
      }

      // Kill surplus particles left over from a larger previous word
      for (let i = pIdx; i < particles.length; i++) {
        particles[i].kill()
      }
    }

    // ── phase state machine (local vars — reset cleanly on each effect run) ─

    type Phase = "forming" | "dispersing"
    let phase: Phase = "forming"
    let phaseStart: number | null = null
    let wordIdx = 0
    let done = false

    const animate = (ts: number) => {
      if (phaseStart === null) phaseStart = ts
      const elapsed = ts - phaseStart

      // Motion-blur background (reference: rgba(0,0,0,0.1))
      ctx.fillStyle = "rgba(0,0,0,0.1)"
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

      const particles = particlesRef.current
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.move()
        p.draw(ctx)
        if (p.isKilled && (p.pos.x < 0 || p.pos.x > CANVAS_W || p.pos.y < 0 || p.pos.y > CANVAS_H)) {
          particles.splice(i, 1)
        }
      }

      if (phase === "forming") {
        const isLast = wordIdx === words.length - 1
        const wordMs = words[wordIdx].msDuration ?? msPerWord
        // Last word stays on for wordMs (form) + msFinalHold (extra hold)
        const duration = isLast ? wordMs + msFinalHold : wordMs
        if (elapsed >= duration) {
          if (isLast) {
            if (!done) {
              done = true
              onCompleteRef.current?.()
            }
            return // Stop the loop — overlay will fade out
          }
          // Scatter everything, then pause before the next word
          for (const p of particles) p.kill()
          phase = "dispersing"
          phaseStart = ts
        }
      } else {
        // dispersing phase
        if (elapsed >= msDisperse) {
          wordIdx++
          buildWord(wordIdx)
          phase = "forming"
          phaseStart = ts
        }
      }

      animationRef.current = requestAnimationFrame(animate as FrameRequestCallback)
    }

    // Reset shared particle pool (critical for Strict Mode double-invoke)
    particlesRef.current = []
    buildWord(0)
    animationRef.current = requestAnimationFrame(animate as FrameRequestCallback)

    return () => {
      if (animationRef.current !== undefined) cancelAnimationFrame(animationRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-full"
      style={{ imageRendering: "pixelated" }}
    />
  )
}
