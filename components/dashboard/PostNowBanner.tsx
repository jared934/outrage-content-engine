'use client'

import Link from 'next/link'
import { Zap, ArrowRight, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import type { TrendWithScore } from '@/lib/dashboard/dashboard.types'

interface PostNowBannerProps {
  trends: TrendWithScore[]
}

export function PostNowBanner({ trends }: PostNowBannerProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const visible = trends.filter((t) => !dismissed.has(t.id))
  if (visible.length === 0) return null

  return (
    <div className="space-y-2">
      {visible.map((trend, i) => {
        const score   = trend.total_priority_score ?? trend.overall_score ?? 0
        const urgency = trend.urgency_score ?? 0

        return (
          <div
            key={trend.id}
            className={cn(
              'relative flex items-center gap-3 rounded-xl border px-4 py-3',
              'bg-gradient-to-r from-accent/10 via-accent/5 to-transparent',
              'border-accent/30',
            )}
          >
            {/* Pulsing dot */}
            <div className="relative flex-shrink-0">
              <div className="h-2.5 w-2.5 rounded-full bg-accent" />
              <div className="absolute inset-0 h-2.5 w-2.5 rounded-full bg-accent animate-ping opacity-60" />
            </div>

            <Zap className="h-4 w-4 text-accent flex-shrink-0" />

            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-accent uppercase tracking-wider mr-2">
                Post Now
              </span>
              <span className="text-sm text-foreground font-medium line-clamp-1">
                {trend.title}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[10px] text-zinc-500 hidden sm:block">
                {Math.round(score)}/100 · urgency {Math.round(urgency)}
              </span>
              <Link
                href={`/trends/${trend.id}`}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-all"
              >
                Act on this
                <ArrowRight className="h-3 w-3" />
              </Link>
              <button
                onClick={() => setDismissed((prev) => { const next = new Set(prev); next.add(trend.id); return next })}
                className="text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
