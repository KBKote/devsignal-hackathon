'use client'

export type StepState = 'pending' | 'running' | 'done' | 'error'

interface Props {
  steps: { label: string; state: StepState }[]
}

export function PipelineProgress({ steps }: Props) {
  return (
    <div
      className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2.5 font-mono text-[11px] leading-relaxed text-black/80"
      role="status"
      aria-live="polite"
    >
      <p className="mb-1.5 text-[10px] uppercase tracking-[0.18em] text-black/50">Pipeline status</p>
      <ul className="space-y-1">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-0.5 w-4 shrink-0 text-center">
              {step.state === 'done'
                ? '✓'
                : step.state === 'error'
                  ? '✕'
                  : step.state === 'running'
                    ? '●'
                    : '○'}
            </span>
            <span
              className={
                step.state === 'running'
                  ? 'font-medium text-black animate-pulse'
                  : step.state === 'done'
                    ? 'text-black/60'
                    : step.state === 'error'
                      ? 'text-red-600'
                      : 'text-black/45'
              }
            >
              {step.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
