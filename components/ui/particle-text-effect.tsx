"use client"

import { useEffect, useRef } from "react"

interface Vector2D {
  x: number
  y: number
}

/** Viewport diagonal in canvas pixels (buffer space). */
function viewportDiagonal(W: number, H: number): number {
  return Math.hypot(W, H)
}

/**
 * Sample stride: grows with buffer area and DPR so particle count stays bounded,
 * while small / 1x displays keep finer detail so text does not look sparse.
 */
function computeAdaptivePixelSteps(
  bufW: number,
  bufH: number,
  dpr: number,
  userOverride?: number
): number {
  if (userOverride != null && userOverride > 0) {
    return Math.max(2, Math.min(14, Math.round(userOverride)))
  }
  const area = bufW * bufH
  // Reference: ~1920×1080 @1x ≈ 2M px → step ~3
  const refArea = 1920 * 1080
  const areaRatio = Math.sqrt(area / refArea)
  const step = Math.round(2 + areaRatio * 1.25 + (dpr - 1) * 1.1)
  return Math.max(2, Math.min(12, step))
}

class Particle {
  pos: Vector2D = { x: 0, y: 0 }
  target: Vector2D = { x: 0, y: 0 }

  /** Pixels — ease speed in final approach. */
  closeEnoughTarget = 50
  isKilled = false

  startColor = { r: 0, g: 0, b: 0 }
  targetColor = { r: 255, g: 255, b: 255 }
  colorWeight = 0

  move(deltaMs: number, diagonalReference: number) {
    if (this.isKilled) return

    const dt = Math.min(0.05, deltaMs / 1000)

    const distance = Math.hypot(this.pos.x - this.target.x, this.pos.y - this.target.y)

    const baseSpeedPerSec = 420
    let speedPerSec = baseSpeedPerSec * (diagonalReference / 2200)

    if (distance < this.closeEnoughTarget) {
      speedPerSec *= distance / this.closeEnoughTarget
    }

    const toX = this.target.x - this.pos.x
    const toY = this.target.y - this.pos.y
    const magnitude = Math.hypot(toX, toY)

    if (magnitude > 0) {
      const distanceThisFrame = speedPerSec * dt
      this.pos.x += (toX / magnitude) * distanceThisFrame
      this.pos.y += (toY / magnitude) * distanceThisFrame
    }
  }

  draw(ctx: CanvasRenderingContext2D, deltaMs: number) {
    const dt = Math.min(0.05, deltaMs / 1000)

    if (this.colorWeight < 1.0) {
      this.colorWeight = Math.min(this.colorWeight + 1.5 * dt, 1.0)
    }

    const r = Math.round(this.startColor.r + (this.targetColor.r - this.startColor.r) * this.colorWeight)
    const g = Math.round(this.startColor.g + (this.targetColor.g - this.startColor.g) * this.colorWeight)
    const b = Math.round(this.startColor.b + (this.targetColor.b - this.startColor.b) * this.colorWeight)
    ctx.fillStyle = `rgb(${r},${g},${b})`
    ctx.fillRect(this.pos.x, this.pos.y, 1, 1)
  }

  kill() {
    if (!this.isKilled) {
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
  font?: string | ((canvasW: number, canvasH: number) => string)
  msDuration?: number
}

interface ParticleTextEffectProps {
  words: WordConfig[]
  msPerWord?: number
  msFinalHold?: number
  onComplete?: () => void
  /** If set, fixes sample stride (2–14). Omit for adaptive stride from size + DPR. */
  pixelSteps?: number
}

export function ParticleTextEffect({
  words,
  msPerWord = 3000,
  msFinalHold = 3000,
  onComplete,
  pixelSteps,
}: ParticleTextEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | undefined>(undefined)
  const particlesRef = useRef<Particle[]>([])

  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let rafId: number | undefined
    let lastBufW = 0
    let lastBufH = 0

    const cancelRaf = () => {
      if (rafId !== undefined) {
        cancelAnimationFrame(rafId)
        rafId = undefined
      }
      animationRef.current = undefined
    }

    /**
     * Fresh animation closure for current buffer dimensions (W×H) and DPR.
     * Re-run on resize so W/H/diag stay correct.
     */
    function createAnimationRuntime(W: number, H: number, dpr: number) {
      const diag = viewportDiagonal(W, H)
      const resolvedPixelSteps = computeAdaptivePixelSteps(W, H, dpr, pixelSteps)

      const randomSpawnPos = (): Vector2D => {
        const cx = W / 2
        const cy = H / 2
        const mag = diag * 0.2
        const rx = Math.random() * W
        const ry = Math.random() * H
        const dx = rx - cx
        const dy = ry - cy
        const m = Math.hypot(dx, dy) || 1
        return { x: cx + (dx / m) * mag, y: cy + (dy / m) * mag }
      }

      const buildWord = (idx: number) => {
        const { text, font } = words[idx]
        const resolvedFont =
          typeof font === "function"
            ? font(W, H)
            : (font ?? `bold ${Math.round(H * 0.2)}px Arial`)

        const off = document.createElement("canvas")
        off.width = W
        off.height = H
        const offCtx = off.getContext("2d")!
        offCtx.fillStyle = "white"
        offCtx.font = resolvedFont
        offCtx.textAlign = "center"
        offCtx.textBaseline = "middle"
        offCtx.fillText(text, W / 2, H / 2)

        const pixels = offCtx.getImageData(0, 0, W, H).data
        const particles = particlesRef.current

        let pIdx = 0
        const existingCount = particles.length

        const coords: number[] = []
        for (let i = 0; i < pixels.length; i += resolvedPixelSteps * 4) coords.push(i)
        for (let i = coords.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[coords[i], coords[j]] = [coords[j], coords[i]]
        }

        let glyphPixelSamples = 0
        for (const ci of coords) {
          if (pixels[ci + 3] > 0) {
            glyphPixelSamples++
            const x = (ci / 4) % W
            const y = Math.floor(ci / 4 / W)

            let p: Particle
            while (pIdx < existingCount && particles[pIdx].isKilled) {
              pIdx++
            }
            if (pIdx < existingCount) {
              p = particles[pIdx]
              p.isKilled = false
              const sp = randomSpawnPos()
              p.pos.x = sp.x
              p.pos.y = sp.y
              pIdx++
            } else {
              p = new Particle()
              const sp = randomSpawnPos()
              p.pos.x = sp.x
              p.pos.y = sp.y
              particles.push(p)
            }

            p.closeEnoughTarget = diag * 0.02

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

        for (let i = pIdx; i < existingCount; i++) {
          if (!particles[i].isKilled) particles[i].kill()
        }

        if (process.env.NODE_ENV === "development") {
          console.log(
            `[ParticleTextEffect] buildWord(${idx}): "${text}" — glyph samples ${glyphPixelSamples}, coord slots ${coords.length}, assigned ${pIdx}, pool ${particles.length}`
          )
        }

        if (idx === 0 && particles.length === 0) {
          if (process.env.NODE_ENV === "development") {
            console.error(
              "[ParticleTextEffect] ERROR: buildWord(0) produced no particles — check canvas size and font."
            )
          }
        }
      }

      let phaseStart = performance.now()
      let wordIdx = 0
      let done = false
      let lastFrameTime = performance.now()

      const animate = (ts: number) => {
        const elapsed = ts - phaseStart

        const deltaMs = Math.min(100, Math.max(1, ts - lastFrameTime))
        lastFrameTime = ts

        ctx.fillStyle = "rgb(0,0,0)"
        ctx.fillRect(0, 0, W, H)

        const particles = particlesRef.current

        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i]
          if (p.isKilled && p.colorWeight >= 1.0) {
            particles.splice(i, 1)
            continue
          }
          p.move(deltaMs, diag)
          p.draw(ctx, deltaMs)
        }

        const isLast = wordIdx === words.length - 1
        const wordMs = words[wordIdx].msDuration ?? msPerWord
        const duration = isLast ? wordMs + msFinalHold : wordMs

        if (elapsed >= duration) {
          if (isLast) {
            if (!done) {
              done = true
              onCompleteRef.current?.()
            }
            return
          }
          for (const p of particles) {
            if (!p.isKilled) p.kill()
          }
          wordIdx++
          buildWord(wordIdx)
          phaseStart = ts
        }

        rafId = requestAnimationFrame(animate)
        animationRef.current = rafId
      }

      buildWord(0)
      rafId = requestAnimationFrame(animate)
      animationRef.current = rafId
    }

    const applyCanvasSizeAndMaybeRestart = () => {
      const cw = canvas.clientWidth
      const ch = canvas.clientHeight

      // Guard: ResizeObserver can fire before layout — bail out and wait for the next observation
      if (cw < 10 || ch < 10) return

      const dpr = Math.min(window.devicePixelRatio ?? 1, 3)
      const bufW = Math.max(1, Math.round(cw * dpr))
      const bufH = Math.max(1, Math.round(ch * dpr))

      if (
        lastBufW > 0 &&
        Math.abs(bufW - lastBufW) <= 1 &&
        Math.abs(bufH - lastBufH) <= 1
      ) {
        return
      }
      lastBufW = bufW
      lastBufH = bufH

      canvas.width = bufW
      canvas.height = bufH

      cancelRaf()
      particlesRef.current = []
      createAnimationRuntime(bufW, bufH, dpr)
    }

    const resizeObserver = new ResizeObserver(() => {
      applyCanvasSizeAndMaybeRestart()
    })
    resizeObserver.observe(canvas)
    applyCanvasSizeAndMaybeRestart()

    return () => {
      cancelRaf()
      resizeObserver.disconnect()
    }
  }, [words, msPerWord, msFinalHold, pixelSteps])

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-full"
      style={{ display: "block" }}
    />
  )
}
