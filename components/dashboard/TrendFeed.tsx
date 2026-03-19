'use client'

import Link from 'next/link'
import { TrendingUp, ArrowRight } from 'lucide-react'
import { TrendOpportunityCard } from './TrendOpportunityCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import type { TrendWithScore } from '@/lib/dashboard/dashboard.types'

interface TrendFeedProps {
  trends:   TrendWithScore[]
  loading?: boolean
  onIgnore?: (id: string) => void
}

export function TrendFeed({ trends, loading, onIgnore }: TrendFeedProps) {
  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-raised">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-accent" />
          <span className="font-display font-semibold text-sm text-foreground">
            Top Opportunities
          </span>
          <span className="live-dot ml-1" />
        </div>
        <Link href="/trends">
          <button className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-muted transition-colors">
            All trends <ArrowRight className="h-3 w-3" />
          </button>
        </Link>
      </div>

      <div className="p-3 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border p-4 space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-3" />
                ))}
              </div>
            </div>
          ))
        ) : trends.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<TrendingUp className="h-8 w-8" />}
              title="No active trends"
              description="Configure sources in Settings to start ingesting content."
              compact
            />
          </div>
        ) : (
          trends.map((trend) => (
            <TrendOpportunityCard
              key={trend.id}
              trend={trend}
              onIgnore={onIgnore}
            />
          ))
        )}
      </div>
    </div>
  )
}
