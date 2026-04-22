'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Bug, Loader2, Paperclip, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

const MAX_FILES = 3
const MAX_BYTES = 5 * 1024 * 1024

function acceptImage(file: File): string | null {
  const t = file.type.toLowerCase()
  if (t === 'image/png' || t === 'image/jpeg' || t === 'image/webp' || t === 'image/gif') return null
  return 'Only PNG, JPEG, WebP, or GIF are allowed.'
}

export function BugReportButton() {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [repro, setRepro] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const close = useCallback(() => {
    if (sending) return
    setOpen(false)
    setMessage(null)
  }, [sending])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  const addFiles = useCallback((list: FileList | File[]) => {
    const arr = Array.from(list)
    setFiles((prev) => {
      const next = [...prev]
      for (const f of arr) {
        if (next.length >= MAX_FILES) break
        const err = acceptImage(f)
        if (err) {
          setMessage({ type: 'err', text: err })
          continue
        }
        if (f.size > MAX_BYTES) {
          setMessage({ type: 'err', text: `Each file must be at most ${MAX_BYTES / (1024 * 1024)} MB.` })
          continue
        }
        next.push(f)
      }
      return next
    })
  }, [])

  const onPaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items?.length) return
      const imgs: File[] = []
      for (let i = 0; i < items.length; i++) {
        const it = items[i]
        if (it?.kind !== 'file') continue
        const f = it.getAsFile()
        if (f) imgs.push(f)
      }
      if (imgs.length) {
        e.preventDefault()
        addFiles(imgs)
      }
    },
    [addFiles]
  )

  const submit = async () => {
    setMessage(null)
    const desc = description.trim()
    if (!desc) {
      setMessage({ type: 'err', text: 'Please describe the problem.' })
      return
    }
    setSending(true)
    try {
      const fd = new FormData()
      fd.set('description', desc)
      fd.set('repro', repro.trim())
      fd.set('pageUrl', typeof window !== 'undefined' ? window.location.href : '')
      fd.set('userAgent', typeof navigator !== 'undefined' ? navigator.userAgent : '')
      fd.set('company', '')
      for (const f of files) {
        fd.append('screenshots', f)
      }
      const res = await fetch('/api/bug-report', { method: 'POST', body: fd })
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; error?: string }
      if (!res.ok) {
        setMessage({
          type: 'err',
          text: typeof j.message === 'string' ? j.message : 'Could not send report.',
        })
        return
      }
      setMessage({ type: 'ok', text: 'Thanks — your report was sent.' })
      setDescription('')
      setRepro('')
      setFiles([])
      setTimeout(() => {
        setOpen(false)
        setMessage(null)
      }, 1800)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <div className="fixed bottom-6 left-6 z-40 print:hidden">
        <Button
          type="button"
          onClick={() => {
            setOpen(true)
            setMessage(null)
          }}
          className="h-11 gap-2 rounded-full border border-white/15 bg-zinc-900/95 px-4 text-sm font-medium text-zinc-100 shadow-lg backdrop-blur-md hover:bg-zinc-800/95"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={`${id}-bug-dialog`}
        >
          <Bug className="h-4 w-4" aria-hidden />
          Report bug
        </Button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center print:hidden"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close()
          }}
        >
          <div
            id={`${id}-bug-dialog`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${id}-bug-title`}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl"
            onPaste={onPaste}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id={`${id}-bug-title`} className="text-lg font-semibold text-zinc-50">
                  Report a bug
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Describe what went wrong. You can attach up to {MAX_FILES} screenshots (paste or upload). This page
                  URL is included automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                disabled={sending}
                className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-zinc-200 disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="mt-4 block">
              <span className="text-xs font-medium text-zinc-400">What happened?</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 8000))}
                rows={4}
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-white/25"
                placeholder="e.g. Pipeline stuck on “Scoring…” after I clicked Run"
                disabled={sending}
              />
            </label>

            <label className="mt-3 block">
              <span className="text-xs font-medium text-zinc-400">Steps to reproduce (optional)</span>
              <textarea
                value={repro}
                onChange={(e) => setRepro(e.target.value.slice(0, 8000))}
                rows={3}
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-white/25"
                placeholder="1. … 2. …"
                disabled={sending}
              />
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) addFiles(e.target.files)
                e.target.value = ''
              }}
            />

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={sending || files.length >= MAX_FILES}
                onClick={() => fileInputRef.current?.click()}
                className="border-white/15 bg-transparent text-zinc-200 hover:bg-white/5"
              >
                <Paperclip className="mr-1.5 h-3.5 w-3.5" />
                Attach images ({files.length}/{MAX_FILES})
              </Button>
              <span className="text-[11px] text-zinc-600">Paste images into this window while the form is open.</span>
            </div>

            {files.length > 0 ? (
              <ul className="mt-2 space-y-1 text-xs text-zinc-400">
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 rounded border border-white/5 bg-black/30 px-2 py-1">
                    <span className="truncate font-mono">{f.name}</span>
                    <button
                      type="button"
                      disabled={sending}
                      className="shrink-0 text-zinc-500 hover:text-red-400"
                      onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {message ? (
              <p
                className={`mt-3 text-sm ${message.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}
                role="status"
              >
                {message.text}
              </p>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={sending} onClick={close} className="border-white/15">
                Cancel
              </Button>
              <Button type="button" disabled={sending} onClick={() => void submit()} className="min-w-[7rem]">
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  'Send report'
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
