'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Lightbulb, Image, Plus, TrendingUp, ExternalLink, Rss } from 'lucide-react'
import { useTrend, useClusterSources } from '@/hooks/useTrends'
import { ScoreBadge } from '@/components/trends/ScoreBadge'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { categoryLabel, timeAgo } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

interface TrendDetailClientProps {
  id: string
}

export function TrendDetailClient({ id }: TrendDetailClientProps) {
  const router = useRouter()
  const { data: trend, isLoading } = useTrend(id)
  const { data: sources = [], isLoading: sourcesLoading } = useClusterSources(id)

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    )
  }

  if (!trend) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted">Trend not found.</p>
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mt-2">
          Go back
        </Button>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <Button
        variant="ghost"
        size="sm"
        icon={<ArrowLeft className="h-3.5 w-3.5" />}
        onClick={() => router.back()}
      >
        Back
      </Button>

      {/* Trend header */}
      <div className="flex items-start gap-5">
        <ScoreBadge score={trend.overall_score} size="lg" showLabel />
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold text-2xl text-foreground leading-tight">
            {trend.title}
          </h1>
          {trend.summary && (
            <p className="text-muted mt-2 text-sm leading-relaxed">{trend.summary}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {trend.category && (
              <Badge variant="accent">{categoryLabel(trend.category)}</Badge>
            )}
            <a href="#sources" className="text-xs text-zinc-500 hover:text-accent transition-colors underline underline-offset-2">
              {trend.source_count} source{trend.source_count !== 1 ? 's' : ''}
            </a>
            <span className="text-xs text-zinc-600">First seen {timeAgo(trend.first_seen_at)}</span>
            <span className="text-xs text-zinc-600">Updated {timeAgo(trend.updated_at)}</span>
          </div>
          {trend.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {trend.keywords.map((kw) => (
                <span key={kw} className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                  #{kw}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="primary"
            size="sm"
            icon={<Lightbulb className="h-3.5 w-3.5" />}
            onClick={() => router.push(`/content?trend=${trend.id}`)}
          >
            Generate Ideas
          </Button>
        </div>
      </div>

      {/* Score summary */}
      <Card>
        <CardHeader>
          <CardTitle>Score Breakdown</CardTitle>
        </CardHeader>
        <div className="px-4 pb-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-4 w-4 text-muted" />
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted">Overall Score</span>
                <span className="text-foreground font-medium tabular-nums">{trend.overall_score}</span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    trend.overall_score >= 75 ? 'bg-red-500' :
                    trend.overall_score >= 50 ? 'bg-orange-500' :
                    trend.overall_score >= 30 ? 'bg-yellow-500' : 'bg-zinc-600'
                  )}
                  style={{ width: `${trend.overall_score}%` }}
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-muted mt-3">
            Detailed score breakdown is available after AI analysis runs on this trend cluster.
          </p>
        </div>
      </Card>

      {/* Content ideas CTA */}
      <Card>
        <div className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-accent" />
            <div>
              <p className="text-sm font-medium text-foreground">Content Ideas</p>
              <p className="text-xs text-muted">Generate AI-powered content ideas for this trend</p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push(`/content?trend=${trend.id}`)}
          >
            View Ideas
          </Button>
        </div>
      </Card>

      {/* Sources */}
      <div id="sources" className="rounded-xl border border-border bg-surface overflow-hidden scroll-mt-6">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-surface-raised">
          <Rss className="h-4 w-4 text-muted" />
          <span className="font-display font-semibold text-sm text-foreground">Source Articles</span>
          {!sourcesLoading && (
            <span className="text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-400 rounded-full px-1.5 font-bold">
              {sources.length}
            </span>
          )}
        </div>

        <div className="divide-y divide-border">
          {sourcesLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-4 py-3 space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))
          ) : sources.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted">No source articles found for this trend.</p>
            </div>
          ) : (
            sources.map((src) => (
              <div key={src.id} className="flex items-start gap-3 px-4 py-3 hover:bg-surface-raised transition-colors group">
                <div className="flex-1 min-w-0">
                  {src.url ? (
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-foreground hover:text-accent transition-colors line-clamp-2 leading-snug"
                    >
                      {src.title}
                    </a>
                  ) : (
                    <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug">{src.title}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {src.source_name && (
                      <span className="text-[10px] text-zinc-500">{src.source_name}</span>
                    )}
                    {src.author && (
                      <span className="text-[10px] text-zinc-600">by {src.author}</span>
                    )}
                    {src.published_at && (
                      <span className="text-[10px] text-zinc-600">{timeAgo(src.published_at)}</span>
                    )}
                    <span className={cn(
                      'text-[9px] font-medium px-1 py-0.5 rounded border',
                      src.relevance_score >= 0.8
                        ? 'bg-accent/10 border-accent/30 text-red-400'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-500',
                    )}>
                      {Math.round(src.relevance_score * 100)}% match
                    </span>
                  </div>
                </div>
                {src.url && (
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 text-zinc-700 hover:text-accent transition-colors opacity-0 group-hover:opacity-100 mt-0.5"
                    title="Open source"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pb-6">
        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => router.push(`/pipeline?trend=${trend.id}`)}
        >
          Add to Pipeline
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<Image className="h-3.5 w-3.5" />}
          onClick={() => router.push(`/memes?trend=${trend.id}`)}
        >
          Create Meme
        </Button>
      </div>
    </div>
  )
}
