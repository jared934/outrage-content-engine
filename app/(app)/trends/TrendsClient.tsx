'use client'

import { useState } from 'react'
import { TrendingUp, Search } from 'lucide-react'
import { useTrends } from '@/hooks/useTrends'
import { TrendCard } from '@/components/trends/TrendCard'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { SkeletonCard, EmptyState } from '@/components/ui'
import { useDebounce } from 'use-debounce'

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'new', label: 'New' },
  { value: 'active', label: 'Active' },
  { value: 'hot', label: 'Hot' },
  { value: 'declining', label: 'Declining' },
  { value: 'acted_on', label: 'Acted On' },
  { value: 'archived', label: 'Archived' },
]

export function TrendsClient() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('active')
  const [debouncedSearch] = useDebounce(search, 300)

  const { data: trends = [], isLoading } = useTrends({
    status: (status || undefined) as import('@/types').ClusterStatus | undefined,
    search: debouncedSearch || undefined,
    limit: 100,
  })

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-muted" />
          <h1 className="font-display font-bold text-xl text-foreground">Trends</h1>
          <span className="text-sm text-muted">({trends.length})</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="Search trends..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="h-3.5 w-3.5" />}
          className="w-64"
        />
        <Select
          options={STATUS_OPTIONS}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : trends.length === 0 ? (
        <EmptyState
          icon={<TrendingUp className="h-12 w-12" />}
          title="No trends found"
          description="Try adjusting your filters."
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
