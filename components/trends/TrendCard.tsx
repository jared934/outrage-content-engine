'use client'

import Link from 'next/link'
import { ExternalLink, Bookmark, CheckCircle, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ScoreBadge } from './ScoreBadge'
import { timeAgo, categoryLabel, truncate } from '@/lib/utils/format'
import { useUpdateTrendStatus } from '@/hooks/useTrends'
import { cn } from '@/lib/utils/cn'
import type { Trend } from '@/types'

const CATEGORY_VARIANT: Record<string, 'accent' | 'info' | 'success' | 'warning' | 'default'> = {
  celebrity: 'accent',
  politics: 'warning',
  sports: 'info',
  entertainment: 'success',
  meme: 'accent',
  viral: 'accent',
  tech: 'info',
}

interface TrendCardProps {
  trend: Trend
  compact?: boolean
}

export function TrendCard({ trend, compact = false }: TrendCardProps) {
  const { mutate: updateStatus } = useUpdateTrendStatus()

  function handleActedOn(e: React.MouseEvent) {
    e.preventDefault()
    updateStatus({ id: trend.id, status: 'acted_on' })
  }

  const categoryV = CATEGORY_VARIANT[trend.category ?? ''] ?? 'default'

  if (compact) {
    return (
      <Link href={`/trends/${trend.id}`} className="block group">
        <div className="flex items-start gap-3">
          {/* Score */}
          <ScoreBadge score={trend.overall_score} size="sm" />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors line-clamp-2 leading-snug">
              {trend.title}
            </p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {trend.category && (
                <Badge variant={categoryV} size="sm">
                  {categoryLabel(trend.category)}
                </Badge>
              )}
              <span className="text-[10px] text-zinc-600">
                {trend.source_count} source{trend.source_count !== 1 ? 's' : ''}
              </span>
              <span className="text-[10px] text-zinc-600">
                {timeAgo(trend.updated_at)}
              </span>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-4 hover:border-zinc-600 transition-colors">
      <div className="flex items-start gap-4">
        {/* Score */}
        <ScoreBadge score={trend.overall_score} size="md" showLabel />

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <Link href={`/trends/${trend.id}`} className="block group">
            <h3 className="font-medium text-foreground group-hover:text-accent transition-colors line-clamp-2 leading-snug">
              {trend.title}
            </h3>
          </Link>

          {trend.summary && (
            <p className="text-xs text-muted mt-1 line-clamp-2">
              {truncate(trend.summary, 160)}
            </p>
          )}

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {trend.category && (
              <Badge variant={categoryV} size="sm">
                {categoryLabel(trend.category)}
              </Badge>
            )}
            <span className="text-xs text-zinc-600">
              {trend.source_count} source{trend.source_count !== 1 ? 's' : ''}
            </span>
            {trend.keywords.slice(0, 3).map((kw) => (
              <span key={kw} className="text-xs text-zinc-600">
                #{kw}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-3">
            <Button
              variant="primary"
              size="xs"
              onClick={handleActedOn}
              icon={<CheckCircle className="h-3 w-3" />}
              disabled={trend.status === 'acted_on'}
            >
              {trend.status === 'acted_on' ? 'Acted On' : 'Mark Acted'}
            </Button>
            <Button variant="ghost" size="xs" icon={<Bookmark className="h-3 w-3" />}>
              Save
            </Button>
            <span className="ml-auto text-[10px] text-zinc-600">
              {timeAgo(trend.updated_at)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
