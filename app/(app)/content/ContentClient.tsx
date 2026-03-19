'use client'

import { useState } from 'react'
import { Lightbulb, Bookmark, Loader2, Sparkles } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getSuggestions } from '@/lib/services/content.service'
import { SuggestionCard } from '@/components/content/SuggestionCard'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'headline', label: 'Headlines' },
  { value: 'hook', label: 'Hooks' },
  { value: 'caption', label: 'Captions' },
  { value: 'meme_idea', label: 'Meme Ideas' },
  { value: 'reel_idea', label: 'Reel Ideas' },
  { value: 'tweet', label: 'Tweets' },
  { value: 'poll', label: 'Polls' },
  { value: 'post_copy', label: 'Post Copy' },
]

const PLATFORM_OPTIONS = [
  { value: '', label: 'All Platforms' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'threads', label: 'Threads' },
]

export function ContentClient() {
  const [typeFilter, setTypeFilter] = useState('')
  const [platformFilter, setPlatformFilter] = useState('')
  const [savedOnly, setSavedOnly] = useState(false)

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['content', 'suggestions', { typeFilter, platformFilter, savedOnly }],
    queryFn: () =>
      getSuggestions({
        type: typeFilter as 'headline' | undefined || undefined,
        platform: platformFilter as 'instagram' | undefined || undefined,
        is_saved: savedOnly || undefined,
        limit: 100,
      }),
    staleTime: 30_000,
  })

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-muted" />
            <h1 className="font-display font-bold text-xl text-foreground">Content Ideas</h1>
          </div>
          <p className="text-sm text-muted mt-0.5">
            AI-generated suggestions from trending topics
          </p>
        </div>
        <Button variant="primary" size="sm" icon={<Sparkles className="h-3.5 w-3.5" />}>
          Generate Batch
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <Select
          options={TYPE_OPTIONS}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          label="Type"
        />
        <Select
          options={PLATFORM_OPTIONS}
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          label="Platform"
        />
        <Button
          variant={savedOnly ? 'primary' : 'secondary'}
          size="sm"
          icon={<Bookmark className="h-3.5 w-3.5" />}
          onClick={() => setSavedOnly(!savedOnly)}
        >
          Saved Only
        </Button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-lg p-3 h-24 animate-pulse" />
          ))}
        </div>
      ) : suggestions.length === 0 ? (
        <EmptyState
          icon={<Lightbulb className="h-12 w-12" />}
          title="No content ideas yet"
          description="Once trends are scored, the AI will automatically generate content ideas here."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {suggestions.map((s) => (
            <SuggestionCard key={s.id} suggestion={s} />
          ))}
        </div>
      )}
    </div>
  )
}
