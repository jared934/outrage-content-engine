import { cn } from '@/lib/utils/cn'

interface ScoreBadgeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

function getScoreColors(score: number) {
  if (score >= 80) return { ring: 'border-red-500/50', bg: 'bg-red-500/10', text: 'text-red-400' }
  if (score >= 65) return { ring: 'border-orange-500/50', bg: 'bg-orange-500/10', text: 'text-orange-400' }
  if (score >= 45) return { ring: 'border-yellow-500/50', bg: 'bg-yellow-500/10', text: 'text-yellow-400' }
  return { ring: 'border-zinc-700', bg: 'bg-zinc-800/50', text: 'text-zinc-500' }
}

const sizeClasses = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-12 w-12 text-sm',
}

export function ScoreBadge({ score, size = 'md', showLabel = false, className }: ScoreBadgeProps) {
  const { ring, bg, text } = getScoreColors(score)

  return (
    <div className={cn('flex flex-col items-center gap-0.5', className)}>
      <div
        className={cn(
          'flex items-center justify-center rounded-full border font-bold tabular-nums',
          bg, ring, text,
          sizeClasses[size]
        )}
      >
        {Math.round(score)}
      </div>
      {showLabel && <span className="text-[9px] text-zinc-600 uppercase tracking-wider">score</span>}
    </div>
  )
}
