'use client'

import { cn } from '@/lib/utils/cn'
import type { TimeStat, DayOfWeekStat } from '@/lib/performance/performance.types'
import { DAYS_OF_WEEK } from '@/lib/performance/performance.types'

interface BestTimesGridProps {
  byHour:       TimeStat[]
  byDayOfWeek:  DayOfWeekStat[]
}

export function BestTimesGrid({ byHour, byDayOfWeek }: BestTimesGridProps) {
  const maxHourScore = Math.max(...byHour.map((h) => h.avg_score), 1)
  const maxDayScore  = Math.max(...byDayOfWeek.map((d) => d.avg_score), 1)

  // Best windows
  const bestHours = [...byHour]
    .filter((h) => h.count > 0)
    .sort((a, b) => b.avg_score - a.avg_score)
    .slice(0, 3)

  const bestDays = [...byDayOfWeek]
    .filter((d) => d.count > 0)
    .sort((a, b) => b.avg_score - a.avg_score)
    .slice(0, 3)

  function hourLabel(h: number) {
    if (h === 0)  return '12am'
    if (h === 12) return '12pm'
    return h < 12 ? `${h}am` : `${h - 12}pm`
  }

  function scoreColor(score: number, max: number) {
    const pct = max > 0 ? score / max : 0
    if (pct >= 0.8)  return 'bg-green-500/80 text-green-100'
    if (pct >= 0.6)  return 'bg-green-400/50 text-green-200'
    if (pct >= 0.4)  return 'bg-amber-500/40 text-amber-200'
    if (pct >= 0.2)  return 'bg-zinc-600/30 text-zinc-400'
    return 'bg-surface-raised text-zinc-700'
  }

  return (
    <div className="space-y-6">
      {/* Best windows summary */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-2">Best Hours</p>
          <div className="space-y-1">
            {bestHours.map((h, i) => (
              <div key={h.hour} className="flex items-center gap-2">
                <span className="text-xs text-zinc-600 w-4 tabular-nums">{i + 1}.</span>
                <span className="text-sm font-semibold text-foreground w-12">{hourLabel(h.hour)}</span>
                <div className="flex-1 h-1.5 bg-surface-raised rounded-full">
                  <div
                    className="h-full bg-accent rounded-full"
                    style={{ width: `${(h.avg_score / maxHourScore) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-zinc-400 tabular-nums w-6">{h.avg_score}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-2">Best Days</p>
          <div className="space-y-1">
            {bestDays.map((d, i) => (
              <div key={d.dow} className="flex items-center gap-2">
                <span className="text-xs text-zinc-600 w-4 tabular-nums">{i + 1}.</span>
                <span className="text-sm font-semibold text-foreground w-10">{d.day_label}</span>
                <div className="flex-1 h-1.5 bg-surface-raised rounded-full">
                  <div
                    className="h-full bg-accent rounded-full"
                    style={{ width: `${(d.avg_score / maxDayScore) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-zinc-400 tabular-nums w-6">{d.avg_score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hour-of-day heatmap strip */}
      <div>
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-2">Performance by Hour</p>
        <div className="flex gap-0.5">
          {byHour.map((h) => (
            <div
              key={h.hour}
              title={`${hourLabel(h.hour)}: score ${h.avg_score} (${h.count} posts)`}
              className={cn(
                'flex-1 rounded-sm transition-all cursor-default',
                h.count === 0 ? 'h-8 bg-surface-raised/40' : cn('h-8', scoreColor(h.avg_score, maxHourScore))
              )}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1 text-[9px] text-zinc-700">
          <span>12am</span>
          <span>6am</span>
          <span>12pm</span>
          <span>6pm</span>
          <span>11pm</span>
        </div>
      </div>

      {/* Day-of-week bar */}
      <div>
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-2">Performance by Day</p>
        <div className="flex gap-1.5 items-end h-16">
          {byDayOfWeek.map((d) => {
            const h = d.count > 0 ? Math.max((d.avg_score / maxDayScore) * 56, 4) : 4
            return (
              <div
                key={d.dow}
                className="flex-1 flex flex-col items-center gap-1"
                title={`${DAYS_OF_WEEK[d.dow]}: score ${d.avg_score} (${d.count} posts)`}
              >
                <div
                  className={cn(
                    'w-full rounded-t-sm transition-all',
                    d.count === 0
                      ? 'bg-surface-raised/40'
                      : scoreColor(d.avg_score, maxDayScore).split(' ')[0],
                  )}
                  style={{ height: `${h}px` }}
                />
                <span className="text-[9px] text-zinc-600">{d.day_label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
