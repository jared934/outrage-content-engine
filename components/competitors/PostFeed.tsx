'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ExternalLink, RefreshCw, ChevronRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils/cn'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { CATEGORY_CONFIG, SOURCE_CONFIG } from '@/lib/competitors/competitor.types'
import { useCompetitorPosts, useCompetitors } from '@/hooks/useCompetitors'
import type { CompetitorCategory } from '@/lib/competitors/competitor.types'

interface PostFeedProps {
  orgId: string
}

export function PostFeed({ orgId }: PostFeedProps) {
  const [filterComp, setFilterComp] = useState<string>('')
  const [filterTag,  setFilterTag]  = useState<string>('')
  const [days,       setDays]       = useState(7)

  const { data: competitors = [] }   = useCompetitors(orgId)
  const { data: posts = [], isLoading, refetch } = useCompetitorPosts(orgId, {
    competitor_id: filterComp || undefined,
    tag:           filterTag || undefined,
    days,
    limit:         60,
  })

  // Collect all tags across posts for the filter bar
  const allTags = Array.from(new Set(posts.flatMap((p) => p.topic_tags ?? []))).slice(0, 20)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Competitor filter */}
        <select
          className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
          value={filterComp}
          onChange={(e) => setFilterComp(e.target.value)}
        >
          <option value="">All competitors</option>
          {competitors.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Days filter */}
        {([3, 7, 14, 30] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={cn(
              'px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all',
              days === d
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border text-zinc-600 hover:border-zinc-600',
            )}
          >
            {d}d
          </button>
        ))}

        <div className="flex-1" />
        <button onClick={() => refetch()} className="text-zinc-600 hover:text-foreground transition-colors">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Tag chips */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {filterTag && (
            <button
              onClick={() => setFilterTag('')}
              className="px-2 py-0.5 rounded-full text-[10px] bg-accent/10 border border-accent/30 text-accent"
            >
              ✕ {filterTag}
            </button>
          )}
          {allTags.filter((t) => t !== filterTag).map((tag) => (
            <button
              key={tag}
              onClick={() => setFilterTag(tag)}
              className="px-2 py-0.5 rounded-full text-[10px] border border-border text-zinc-600 hover:border-zinc-600 hover:text-foreground transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Feed */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="px-4 py-3.5 flex gap-3">
                <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={<RefreshCw className="h-8 w-8" />}
              title="No posts yet"
              description="Add RSS sources to competitors and hit Refresh to pull in posts."
              compact
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {posts.map((post) => {
              const compCfg = CATEGORY_CONFIG[post.competitor_category as CompetitorCategory] ?? CATEGORY_CONFIG.other
              return (
                <div key={post.id} className="flex gap-3 px-4 py-3.5 hover:bg-surface-raised/50 transition-colors">
                  {/* Thumbnail */}
                  {post.thumbnail_url ? (
                    <img
                      src={post.thumbnail_url}
                      alt=""
                      className="h-10 w-10 rounded-lg object-cover shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-surface-raised border border-border flex items-center justify-center text-lg shrink-0">
                      {compCfg.icon}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    {/* Title */}
                    <p className="text-sm text-foreground font-medium leading-snug line-clamp-2">
                      {post.title ?? '(no title)'}
                    </p>

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className={cn('text-[10px] font-semibold', compCfg.color)}>
                        {compCfg.icon} {post.competitor_name}
                      </span>
                      <span className="text-[10px] text-zinc-600">
                        {formatDistanceToNow(new Date(post.published_at), { addSuffix: true })}
                      </span>

                      {/* Matched clusters */}
                      {(post.matched_cluster_ids ?? []).length > 0 && (
                        <Link
                          href={`/trends/${post.matched_cluster_ids[0]}`}
                          className="flex items-center gap-0.5 text-[10px] text-accent hover:underline"
                        >
                          trend <ChevronRight className="h-2.5 w-2.5" />
                        </Link>
                      )}

                      {post.url && (
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto flex items-center gap-0.5 text-[10px] text-zinc-600 hover:text-foreground transition-colors"
                        >
                          <ExternalLink className="h-2.5 w-2.5" />
                          View
                        </a>
                      )}
                    </div>

                    {/* Topic tags */}
                    {(post.topic_tags ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(post.topic_tags ?? []).slice(0, 5).map((tag) => (
                          <button
                            key={tag}
                            onClick={() => setFilterTag(tag)}
                            className="text-[9px] px-1.5 py-0.5 rounded-full border border-border text-zinc-700 hover:border-zinc-600 transition-colors"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {!isLoading && posts.length > 0 && (
        <p className="text-xs text-zinc-600 text-right">{posts.length} posts · last {days} days</p>
      )}
    </div>
  )
}
