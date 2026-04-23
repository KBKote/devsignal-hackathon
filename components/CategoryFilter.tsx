'use client'

export type Category = 'all' | 'opportunity' | 'idea' | 'intel'

const TABS: { value: Category; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'opportunity', label: 'Opportunities' },
  { value: 'idea', label: 'Ideas' },
  { value: 'intel', label: 'Intel' },
]

interface Props {
  active: Category
  onChange: (cat: Category) => void
  counts: Record<Category, number>
}

export function CategoryFilter({ active, onChange, counts }: Props) {
  return (
    <nav className="-mx-1 flex min-w-0 gap-1 overflow-x-auto overscroll-x-contain rounded-xl border border-white/10 bg-black/45 p-1 backdrop-blur-md [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 [&::-webkit-scrollbar]:hidden">
      {TABS.map((tab) => {
        const isActive = active === tab.value
        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={`flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all sm:flex-1 sm:gap-2 sm:px-4 ${
              isActive
                ? 'bg-white text-black shadow'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <span className={`whitespace-nowrap ${isActive ? 'text-black' : 'text-zinc-300'}`}>
              <span className="sm:hidden">{tab.value === 'opportunity' ? 'Opp' : tab.label}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </span>
            {counts[tab.value] > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs ${
                  isActive ? 'bg-black/10 text-black' : 'bg-white/10 text-zinc-300'
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
