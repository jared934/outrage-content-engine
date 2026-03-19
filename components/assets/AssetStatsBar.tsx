'use client'

import { cn } from '@/lib/utils/cn'
import { CATEGORY_CONFIG } from '@/lib/assets/asset.types'
import type { AssetCategory } from '@/lib/assets/asset.types'

interface AssetStatsBarProps {
  total:          number
  categoryCounts: Record<string, number>
  activeCategory: AssetCategory | ''
  onCategory:     (cat: AssetCategory | '') => void
}

export function AssetStatsBar({
  total, categoryCounts, activeCategory, onCategory,
}: AssetStatsBarProps) {
  // Only show categories that have assets
  const populated = Object.entries(categoryCounts)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a) as [AssetCategory, number][]

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
      {/* All */}
      <button
        onClick={() => onCategory('')}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap shrink-0 transition-all',
          activeCategory === ''
            ? 'bg-accent/10 border-accent/40 text-accent'
            : 'border-border text-zinc-500 hover:border-zinc-600 hover:text-foreground',
        )}
      >
        All
        <span className={cn(
          'text-[10px] tabular-nums px-1.5 py-0.5 rounded-full',
          activeCategory === '' ? 'bg-accent/20 text-accent' : 'bg-zinc-800 text-zinc-600',
        )}>
          {total}
        </span>
      </button>

      {populated.map(([cat, count]) => {
        const cfg    = CATEGORY_CONFIG[cat]
        const active = activeCategory === cat
        return (
          <button
            key={cat}
            onClick={() => onCategory(active ? '' : cat)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap shrink-0 transition-all',
              active
                ? 'bg-surface-raised border-zinc-600 text-foreground'
                : 'border-border text-zinc-500 hover:border-zinc-600 hover:text-foreground',
            )}
          >
            <span>{cfg.icon}</span>
            <span>{cfg.label}</span>
            <span className="text-[10px] tabular-nums text-zinc-700">{count}</span>
          </button>
        )
      })}
    </div>
  )
}
