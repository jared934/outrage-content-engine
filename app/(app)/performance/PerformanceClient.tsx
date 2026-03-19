'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  BarChart2, Plus, ExternalLink, Trash2, RefreshCw,
  TrendingUp, Clock, Zap, ChevronRight, Eye,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'

import { PLATFORM_CONFIG, POST_TYPE_CONFIG, HOOK_TYPE_CONFIG } from '@/lib/performance/performance.types'
import {
  usePerformanceAnalytics, usePerformancePosts, useDeletePerformancePost,
} from '@/hooks/usePerformance'

import { ScoreBar } from '@/components/performance/ScoreBar'
import { BestTimesGrid } from '@/components/performance/BestTimesGrid'
import { WeightsPanel } from '@/components/performance/WeightsPanel'
import { AddPostModal } from '@/components/performance/AddPostModal'
import type { PerformancePost, PerfPlatform, PerfPostType, PerfHookType } from '@/lib/performance/performance.types'

type Tab = 'overview' | 'content' | 'timing' | 'trend' | 'weights'

interface PerformanceClientProps {
  orgId: string
}

// ─── Score badge ─────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 75 ? 'text-green-400 bg-green-950/40 border-green-800/40' :
    score >= 55 ? 'text-amber-400 bg-amber-950/40 border-amber-800/40' :
    score >= 35 ? 'text-zinc-400 bg-zinc-800/40 border-zinc-700/40'   :
                  'text-red-400 bg-red-950/40 border-red-800/40'

  return (
    <span className={cn('inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full border tabular-nums', color)}>
      {score}
    </span>
  )
}

// ─── Post row ────────────────────────────────────────────────────────────────

function PostRow({ post }: { post: PerformancePost }) {
  const { mutate: remove } = useDeletePerformancePost()
  const platCfg  = PLATFORM_CONFIG[post.platform]
  const typeCfg  = POST_TYPE_CONFIG[post.post_type]

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-raised/50 transition-colors group">
      {/* Score */}
      <ScoreBadge score={post.performance_score} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground font-medium leading-snug truncate">{post.title}</p>
        <div className="flex flex-wrap items-center gap-2 mt-0.5">
          <span className={cn('text-[10px] font-semibold', platCfg.color)}>
            {platCfg.icon} {platCfg.label}
          </span>
          <span className="text-[10px] text-zinc-600">{typeCfg.icon} {typeCfg.label}</span>
          {post.topic && (
            <span className="text-[10px] text-zinc-600 capitalize">· {post.topic}</span>
          )}
          <span className="text-[10px] text-zinc-700">
            · {formatDistanceToNow(new Date(post.posted_at), { addSuffix: true })}
          </span>
        </div>
      </div>

      {/* Metrics */}
      <div className="hidden sm:flex items-center gap-4 shrink-0 text-right">
        {post.views != null && (
          <div>
            <p className="text-xs font-semibold text-foreground tabular-nums">{fmtNum(post.views)}</p>
            <p className="text-[9px] text-zinc-600">views</p>
          </div>
        )}
        {post.engagement_rate != null && (
          <div>
            <p className="text-xs font-semibold text-foreground tabular-nums">{post.engagement_rate.toFixed(1)}%</p>
            <p className="text-[9px] text-zinc-600">eng. rate</p>
          </div>
        )}
        {post.shares != null && (
          <div>
            <p className="text-xs font-semibold text-foreground tabular-nums">{fmtNum(post.shares)}</p>
            <p className="text-[9px] text-zinc-600">shares</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {post.post_url && (
          <a
            href={post.post_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-zinc-600 hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        {post.cluster_id && (
          <Link
            href={`/trends/${post.cluster_id}`}
            className="p-1.5 text-zinc-600 hover:text-accent transition-colors"
            title="View trend"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
        <button
          onClick={() => remove(post.id)}
          className="p-1.5 text-zinc-700 hover:text-red-500 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Main client ─────────────────────────────────────────────────────────────

export function PerformanceClient({ orgId }: PerformanceClientProps) {
  const [tab,      setTab]      = useState<Tab>('overview')
  const [days,     setDays]     = useState(90)
  const [showAdd,  setShowAdd]  = useState(false)

  const { data: analytics, isLoading: analyticsLoading, refetch } = usePerformanceAnalytics(orgId, days)
  const { data: posts = [], isLoading: postsLoading }              = usePerformancePosts(orgId, days)

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview',  icon: <BarChart2 className="h-3.5 w-3.5" /> },
    { id: 'content',  label: 'Content',   icon: <Zap className="h-3.5 w-3.5" />      },
    { id: 'timing',   label: 'Timing',    icon: <Clock className="h-3.5 w-3.5" />    },
    { id: 'trend',    label: 'Trend Impact', icon: <TrendingUp className="h-3.5 w-3.5" /> },
    { id: 'weights',  label: 'Weights',   icon: <Eye className="h-3.5 w-3.5" />      },
  ]

  return (
    <div className="p-5 max-w-screen-lg mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart2 className="h-4 w-4 text-muted shrink-0" />
        <h1 className="font-display font-bold text-xl text-foreground flex-1">Performance</h1>
        <div className="flex items-center gap-2">
          {([30, 60, 90, 180] as const).map((d) => (
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
          <button onClick={() => refetch()} className="text-zinc-600 hover:text-foreground transition-colors">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <Button
            variant="primary" size="sm"
            icon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => setShowAdd(true)}
          >
            Log result
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0.5 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
              tab === t.id
                ? 'border-accent text-foreground'
                : 'border-transparent text-muted hover:text-foreground',
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-5">
          {/* Summary cards */}
          {analyticsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Posts Logged',    value: analytics?.total_posts ?? 0,     suffix: '',   color: 'text-foreground' },
                { label: 'Avg Score',       value: analytics?.avg_score ?? 0,        suffix: '',   color: scoreTextColor(analytics?.avg_score ?? 0) },
                { label: 'Avg Eng. Rate',   value: analytics?.avg_engagement ?? 0,   suffix: '%',  color: 'text-foreground' },
                { label: 'Best Platform',   value: analytics?.best_platform ? PLATFORM_CONFIG[analytics.best_platform as PerfPlatform]?.label : '—', suffix: '', color: 'text-accent' },
              ].map(({ label, value, suffix, color }) => (
                <div key={label} className="rounded-xl border border-border bg-surface p-4">
                  <p className={cn('text-2xl font-bold tabular-nums', color)}>
                    {typeof value === 'number' ? value.toFixed(value % 1 === 0 ? 0 : 1) : value}{suffix}
                  </p>
                  <p className="text-xs text-muted mt-1">{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Top posts */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Top Posts — last {days} days</p>
              <span className="text-[10px] text-zinc-600">{posts.length} total</span>
            </div>

            {postsLoading ? (
              <div className="divide-y divide-border">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="px-4 py-3.5 flex gap-3">
                    <Skeleton className="h-6 w-8 rounded" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  icon={<BarChart2 className="h-8 w-8" />}
                  title="No results logged yet"
                  description="Add post performance data to start tracking what works."
                  action={{ label: 'Log first result', onClick: () => setShowAdd(true) }}
                  compact
                />
              </div>
            ) : (
              <div className="divide-y divide-border">
                {[...posts].sort((a, b) => b.performance_score - a.performance_score).slice(0, 15).map((post) => (
                  <PostRow key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CONTENT TAB ──────────────────────────────────────────────────────── */}
      {tab === 'content' && (
        <div className="space-y-6">
          {analyticsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
            </div>
          ) : !analytics || analytics.total_posts === 0 ? (
            <EmptyState
              icon={<BarChart2 className="h-8 w-8" />}
              title="No data yet"
              description="Log post results to see content analytics."
              compact
            />
          ) : (
            <>
              {/* Hook type */}
              <AnalyticsSection title="Best Hook Structures" subtitle="Which opening types drive performance">
                {analytics.by_hook_type.map((d) => (
                  <ScoreBar
                    key={d.label}
                    label={`${HOOK_TYPE_CONFIG[d.label as PerfHookType]?.icon ?? ''} ${HOOK_TYPE_CONFIG[d.label as PerfHookType]?.label ?? d.label}`}
                    score={d.avg_score}
                    count={d.count}
                    engagement={d.avg_engagement}
                    maxScore={100}
                    color="bg-purple-500"
                  />
                ))}
              </AnalyticsSection>

              {/* Post type / format */}
              <AnalyticsSection title="Best Content Formats" subtitle="Avg performance score by format">
                {analytics.by_post_type.map((d) => (
                  <ScoreBar
                    key={d.label}
                    label={`${POST_TYPE_CONFIG[d.label as PerfPostType]?.icon ?? ''} ${POST_TYPE_CONFIG[d.label as PerfPostType]?.label ?? d.label}`}
                    score={d.avg_score}
                    count={d.count}
                    engagement={d.avg_engagement}
                    maxScore={100}
                    color="bg-blue-500"
                  />
                ))}
              </AnalyticsSection>

              {/* Caption style */}
              <AnalyticsSection title="Best Caption Styles" subtitle="Which writing approach resonates">
                {analytics.by_caption_style.map((d) => (
                  <ScoreBar
                    key={d.label}
                    label={d.label}
                    score={d.avg_score}
                    count={d.count}
                    engagement={d.avg_engagement}
                    maxScore={100}
                    color="bg-cyan-500"
                  />
                ))}
              </AnalyticsSection>

              {/* Topic */}
              {analytics.by_topic.length > 0 && (
                <AnalyticsSection title="Best Topics" subtitle="Top-performing subject matter">
                  {analytics.by_topic.slice(0, 10).map((d) => (
                    <ScoreBar
                      key={d.label}
                      label={d.label}
                      score={d.avg_score}
                      count={d.count}
                      engagement={d.avg_engagement}
                      maxScore={analytics.by_topic[0]?.avg_score ?? 100}
                      color="bg-amber-500"
                    />
                  ))}
                </AnalyticsSection>
              )}

              {/* Platform */}
              <AnalyticsSection title="Platform Comparison" subtitle="Which platforms perform best for you">
                {analytics.by_platform.map((d) => {
                  const cfg = PLATFORM_CONFIG[d.label as PerfPlatform]
                  return (
                    <ScoreBar
                      key={d.label}
                      label={`${cfg?.icon ?? ''} ${cfg?.label ?? d.label}`}
                      score={d.avg_score}
                      count={d.count}
                      engagement={d.avg_engagement}
                      maxScore={100}
                      color="bg-pink-500"
                    />
                  )
                })}
              </AnalyticsSection>
            </>
          )}
        </div>
      )}

      {/* ── TIMING TAB ───────────────────────────────────────────────────────── */}
      {tab === 'timing' && (
        <div className="bg-surface border border-border rounded-xl p-5">
          {analyticsLoading ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : !analytics || analytics.total_posts === 0 ? (
            <EmptyState
              icon={<Clock className="h-8 w-8" />}
              title="No timing data yet"
              description="Log post results with posted_at times to see best posting windows."
              compact
            />
          ) : (
            <BestTimesGrid
              byHour={analytics.by_hour}
              byDayOfWeek={analytics.by_day_of_week}
            />
          )}
        </div>
      )}

      {/* ── TREND IMPACT TAB ─────────────────────────────────────────────────── */}
      {tab === 'trend' && (
        <div className="space-y-5">
          {analyticsLoading ? (
            <Skeleton className="h-48 rounded-xl" />
          ) : !analytics || analytics.total_posts === 0 ? (
            <EmptyState
              icon={<TrendingUp className="h-8 w-8" />}
              title="No data yet"
              description="Log post results and link them to trends to see the impact."
              compact
            />
          ) : (
            <>
              {/* Linked vs not */}
              <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Trend-linked vs Standalone</p>
                  <p className="text-xs text-muted mt-0.5">
                    Posts linked to active trend clusters vs those that aren't.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {analytics.trend_impact.map((t) => (
                    <div
                      key={String(t.has_trend)}
                      className={cn(
                        'rounded-xl border p-4 text-center',
                        t.has_trend
                          ? 'border-accent/40 bg-accent/5'
                          : 'border-border bg-surface-raised',
                      )}
                    >
                      <p className="text-3xl font-bold tabular-nums text-foreground">{t.avg_score}</p>
                      <p className="text-xs text-muted mt-1">{t.label}</p>
                      <p className="text-[10px] text-zinc-600 mt-0.5">{t.count} posts</p>
                    </div>
                  ))}
                </div>
                {analytics.trend_impact.length === 2 && analytics.trend_impact[0].avg_score > analytics.trend_impact[1].avg_score && (
                  <div className="flex items-center gap-2 text-xs text-green-400 bg-green-950/20 border border-green-800/40 rounded-lg px-3 py-2">
                    <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                    Trend-linked posts score{' '}
                    <strong>{analytics.trend_impact[0].avg_score - analytics.trend_impact[1].avg_score} points</strong>{' '}
                    higher on average. Keep riding active trends.
                  </div>
                )}
              </div>

              {/* All posts with cluster linkage */}
              <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold text-foreground">All Posts</p>
                </div>
                <div className="divide-y divide-border">
                  {posts.map((p) => <PostRow key={p.id} post={p} />)}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── WEIGHTS TAB ──────────────────────────────────────────────────────── */}
      {tab === 'weights' && <WeightsPanel orgId={orgId} />}

      {/* Add modal */}
      {showAdd && <AddPostModal orgId={orgId} onClose={() => setShowAdd(false)} />}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function AnalyticsSection({
  title, subtitle, children,
}: {
  title:    string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted mt-0.5">{subtitle}</p>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function scoreTextColor(score: number) {
  if (score >= 75) return 'text-green-400'
  if (score >= 55) return 'text-amber-400'
  if (score >= 35) return 'text-zinc-400'
  return 'text-red-400'
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}
