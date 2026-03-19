'use client'

import { cn } from '@/lib/utils/cn'

interface ScoreBarProps {
  label:      string
  score:      number     // 0-100
  count:      number
  engagement?: number | null
  maxScore?:  number
  color?:     string
}

export function ScoreBar({ label, score, count, engagement, maxScore = 100, color = 'bg-accent' }: ScoreBarProps) {
  const pct = Math.round((score / maxScore) * 100)
  const scoreColor =
    score >= 75 ? 'text-green-400'  :
    score >= 55 ? 'text-amber-400'  :
    score >= 35 ? 'text-zinc-400'   :
                  'text-red-400'

  return (
    <div className="flex items-center gap-3 group">
      <div className="w-28 sm:w-36 shrink-0 truncate">
        <span className="text-xs text-foreground capitalize">{label}</span>
      </div>
      <div className="flex-1 h-5 bg-surface-raised rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${pct}%`, opacity: 0.75 + (pct / 400) }}
        />
      </div>
      <div className="flex items-center gap-2 shrink-0 w-24 justify-end">
        <span className={cn('text-sm font-bold tabular-nums', scoreColor)}>{score}</span>
        <span className="text-[10px] text-zinc-600">({count})</span>
        {engagement !== null && engagement !== undefined && engagement > 0 && (
          <span className="hidden sm:inline text-[10px] text-zinc-600">{engagement.toFixed(1)}%</span>
        )}
      </div>
    </div>
  )
}
