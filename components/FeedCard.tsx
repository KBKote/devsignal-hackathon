'use client'

import { useState } from 'react'

export interface Story {
  id: string
  title: string
  url: string
  source: string
  summary: string
  category: 'opportunity' | 'idea' | 'intel'
  score: number
  why: string
  published_at: string | null
  scored_at: string
  seen: boolean
}

const CATEGORY_STYLES = {
  opportunity: {
    label: 'Opportunity',
    badge: 'bg-black/5 text-black/80 border-black/20',
  },
  idea: {
    label: 'Idea',
    badge: 'bg-black/5 text-black/80 border-black/20',
  },
  intel: {
    label: 'Intel',
    badge: 'bg-black/5 text-black/80 border-black/20',
  },
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 9
      ? 'bg-black text-white'
      : score >= 7
      ? 'bg-black/85 text-white'
      : 'bg-black/70 text-white'

  const pulse = score >= 9 ? 'animate-pulse' : ''

  return (
    <span
      className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${color} ${pulse}`}
    >
      {score}
    </span>
  )
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor(diff / 60_000)
  if (h >= 24) return `${Math.floor(h / 24)}d ago`
  if (h >= 1) return `${h}h ago`
  return `${m}m ago`
}

export function FeedCard({ story }: { story: Story }) {
  const [expanded, setExpanded] = useState(false)
  const cat = CATEGORY_STYLES[story.category]

  return (
    <article className="rounded-xl border border-black/15 bg-white/82 p-5 text-black transition-colors hover:border-black/30">
      <div className="flex items-start gap-4">
        {/* Score badge */}
        <div className="flex-shrink-0 pt-0.5">
          <ScoreBadge score={story.score} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Category + source + time */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cat.badge}`}
            >
              {cat.label}
            </span>
            <span className="font-mono text-xs text-black/55">{story.source}</span>
            <span className="font-mono text-xs text-black/45">
              {timeAgo(story.published_at ?? story.scored_at)}
            </span>
          </div>

          {/* Title */}
          <h2 className="mb-2 font-medium leading-snug text-black">
            <a
              href={story.url}
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:underline"
            >
              {story.title}
            </a>
          </h2>

          {/* Summary */}
          <p className="mb-3 text-sm leading-relaxed text-black/70">
            {story.summary}
          </p>

          {/* Expand/collapse why it matters */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-black/55 transition-colors hover:text-black"
          >
            {expanded ? '▲ Hide reasoning' : '▼ Why it matters'}
          </button>

          {expanded && (
            <p className="mt-2 rounded-lg border border-black/15 bg-black/[0.03] p-3 text-xs leading-relaxed text-black/70">
              {story.why}
            </p>
          )}
        </div>
      </div>
    </article>
  )
}
