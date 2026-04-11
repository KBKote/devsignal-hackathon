'use client'

import {
  DEFAULT_PIPELINE_PREFS,
  SCOPES,
  TOPIC_CUSTOM_MAX_LEN,
  TOPIC_MODES,
  TOPIC_MODE_LABELS,
  SCOPE_LABELS,
  type PipelinePreferences,
  type ScopeLevel,
  type TopicMode,
} from '@/lib/pipeline-preferences'

export type { PipelinePreferences }

interface Props {
  value: PipelinePreferences
  onChange: (next: PipelinePreferences) => void
  disabled?: boolean
  /** Short note under the title */
  hint?: string
}

export function PipelinePreferencesPanel({ value, onChange, disabled, hint }: Props) {
  const setTopicMode = (topicMode: TopicMode) => {
    onChange({
      ...value,
      topicMode,
      topicCustom: topicMode === 'other' ? value.topicCustom : '',
    })
  }

  const setScope = (scope: ScopeLevel) => {
    onChange({ ...value, scope })
  }

  return (
    <div className="rounded-2xl border border-black/12 bg-black/[0.02] p-4 text-black md:p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-black/50">
        Pipeline preferences
      </p>
      <p className="mt-1 text-sm text-black/65">
        Applied when scoring with Claude Haiku. Scrape sources are unchanged.
      </p>
      {hint ? <p className="mt-1 text-xs text-black/50">{hint}</p> : null}

      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="signal-topic-mode" className="block font-mono text-xs text-black/55">
            Topic emphasis
          </label>
          <select
            id="signal-topic-mode"
            disabled={disabled}
            value={value.topicMode}
            onChange={(e) => setTopicMode(e.target.value as TopicMode)}
            className="mt-1.5 w-full max-w-md rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-black/35 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {TOPIC_MODES.map((m) => (
              <option key={m} value={m}>
                {TOPIC_MODE_LABELS[m]}
              </option>
            ))}
          </select>
        </div>

        {value.topicMode === 'other' ? (
          <div>
            <label htmlFor="signal-topic-custom" className="block font-mono text-xs text-black/55">
              Custom focus (max {TOPIC_CUSTOM_MAX_LEN} chars)
            </label>
            <textarea
              id="signal-topic-custom"
              disabled={disabled}
              value={value.topicCustom}
              onChange={(e) =>
                onChange({
                  ...value,
                  topicCustom: e.target.value.slice(0, TOPIC_CUSTOM_MAX_LEN),
                })
              }
              rows={3}
              placeholder="e.g. restaking, ZK coprocessors, AI coding agents for Solidity"
              className="mt-1.5 w-full max-w-lg resize-y rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-black outline-none transition placeholder:text-black/35 focus:border-black/35 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <p className="mt-1 text-xs text-black/45">
              {value.topicCustom.length}/{TOPIC_CUSTOM_MAX_LEN}
            </p>
          </div>
        ) : null}

        <div>
          <span className="block font-mono text-xs text-black/55">Focus calibration</span>
          <p className="mt-0.5 text-xs text-black/45">
            Strict relevance versus a broader lens for adjacent or early signals.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SCOPES.map((s) => (
              <button
                key={s}
                type="button"
                disabled={disabled}
                onClick={() => setScope(s)}
                className={`rounded-lg border px-3 py-2 text-left text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  value.scope === s
                    ? 'border-black/40 bg-black text-white'
                    : 'border-black/15 bg-white text-black hover:border-black/25'
                }`}
              >
                {SCOPE_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export { DEFAULT_PIPELINE_PREFS }
