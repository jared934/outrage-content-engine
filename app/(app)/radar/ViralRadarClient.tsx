'use client'

import { useState } from 'react'
import { Zap, Filter } from 'lucide-react'
import { useTrends } from '@/hooks/useTrends'
import { useFiltersStore } from '@/stores/filters.store'
import { TrendCard } from '@/components/trends/TrendCard'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { SkeletonCard, EmptyState } from '@/components/ui'
import type { TrendCategory } from '@/types'

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'celebrity', label: 'Celebrity' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'meme', label: 'Meme' },
  { value: 'sports', label: 'Sports' },
  { value: 'viral', label: 'Viral' },
  { value: 'politics', label: 'Politics' },
  { value: 'tech', label: 'Tech' },
  { value: 'crime', label: 'Crime' },
]

const SCORE_FILTERS = [
  { value: '0', label: 'Any Score' },
  { value: '50', label: '50+ Score' },
  { value: '65', label: '65+ Score' },
  { value: '75', label: '75+ Score' },
  { value: '85', label: '85+ Score (HOT)' },
]

export function ViralRadarClient() {
  const { trendFilters, setTrendFilter } = useFiltersStore()
  const [showFilters, setShowFilters] = useState(false)

  const { data: trends = [], isLoading, refetch } = useTrends({
    status: 'active',
    category: trendFilters.category as TrendCategory | undefined,
    minScore: trendFilters.minScore,
    limit: 50,
  })

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-accent" />
            <h1 className="font-display font-bold text-xl text-foreground">Viral Radar</h1>
            <span className="live-dot ml-1" />
          </div>
          <p className="text-sm text-muted mt-0.5">
            {trends.length} active trend{trends.length !== 1 ? 's' : ''} — sorted by score
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<Filter className="h-3.5 w-3.5" />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
          </Button>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 p-4 bg-surface border border-border rounded-lg animate-slide-in-down">
          <Select
            options={CATEGORIES}
            value={trendFilters.category ?? ''}
            onChange={(e) => setTrendFilter('category', (e.target.value as TrendCategory) || null)}
            label="Category"
          />
          <Select
            options={SCORE_FILTERS}
            value={String(trendFilters.minScore)}
            onChange={(e) => setTrendFilter('minScore', Number(e.target.value))}
            label="Min Score"
          />
        </div>
      )}

      {/* Trend grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : trends.length === 0 ? (
        <EmptyState
          icon={<Zap className="h-12 w-12" />}
          title="No trends detected yet"
          description="Configure your sources in Settings and n8n will start ingesting content automatically."
          action={{ label: 'Go to Settings', href: '/settings/sources', variant: 'primary' }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {trends.map((trend) => (
            <TrendCard key={trend.id} trend={trend} />
          ))}
        </div>
      )}
    </div>
  )
}
