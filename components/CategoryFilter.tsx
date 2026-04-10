'use client'

export type Category = 'all' | 'opportunity' | 'idea' | 'intel'

const TABS: { value: Category; label: string; color: string }[] = [
  { value: 'all', label: 'All', color: 'text-black/75' },
  { value: 'opportunity', label: 'Opportunities', color: 'text-black/75' },
  { value: 'idea', label: 'Ideas', color: 'text-black/75' },
  { value: 'intel', label: 'Intel', color: 'text-black/75' },
]

interface Props {
  active: Category
  onChange: (cat: Category) => void
  counts: Record<Category, number>
}

export function CategoryFilter({ active, onChange, counts }: Props) {
  return (
    <nav className="flex gap-1 rounded-xl border border-black/15 bg-white/70 p-1">
      {TABS.map((tab) => {
        const isActive = active === tab.value
        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              isActive
                ? 'bg-black text-white shadow'
                : 'text-black/60 hover:text-black'
            }`}
          >
            <span className={isActive ? 'text-white' : tab.color}>
              {tab.label}
            </span>
            {counts[tab.value] > 0 && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-black/10 text-black/60'
                }`}
              >
                {counts[tab.value]}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
