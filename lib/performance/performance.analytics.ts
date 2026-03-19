// ─── Analytics computation ────────────────────────────────────────────────────
// Runs in-process from raw post data. Fast enough for <2000 posts.

import type {
  PerformancePost, PerformanceAnalytics,
  DimStat, TimeStat, DayOfWeekStat, TrendImpactStat,
} from './performance.types'
import { DAYS_OF_WEEK } from './performance.types'

export function computeAnalytics(
  posts:      PerformancePost[],
  periodDays: number,
): PerformanceAnalytics {
  if (posts.length === 0) {
    return {
      period_days: periodDays, total_posts: 0, avg_score: 0, avg_engagement: 0,
      best_platform: null, top_posts: [],
      by_topic: [], by_post_type: [], by_hook_type: [],
      by_caption_style: [], by_platform: [], by_category: [],
      by_hour: [], by_day_of_week: [], trend_impact: [],
    }
  }

  const avg_score     = avg(posts.map((p) => p.performance_score))
  const avg_engagement = avg(posts.map((p) => p.engagement_rate).filter(notNull))

  // ── Dimensional aggregations ──────────────────────────────────────────────────

  const by_topic        = aggregateDim(posts, (p) => p.topic ?? 'unknown')
  const by_post_type    = aggregateDim(posts, (p) => p.post_type)
  const by_hook_type    = aggregateDim(posts, (p) => p.hook_type)
  const by_caption_style= aggregateDim(posts, (p) => p.caption_style)
  const by_platform     = aggregateDim(posts, (p) => p.platform)
  const by_category     = aggregateDim(posts, (p) => p.category ?? 'uncategorised')

  const best_platform = by_platform.length > 0
    ? by_platform.sort((a, b) => b.avg_score - a.avg_score)[0].label
    : null

  // ── Time analysis ─────────────────────────────────────────────────────────────

  const by_hour: TimeStat[] = Array.from({ length: 24 }, (_, h) => {
    const hourPosts = posts.filter((p) => new Date(p.posted_at).getHours() === h)
    return {
      hour:      h,
      avg_score: hourPosts.length ? avg(hourPosts.map((p) => p.performance_score)) : 0,
      count:     hourPosts.length,
    }
  })

  const by_day_of_week: DayOfWeekStat[] = Array.from({ length: 7 }, (_, d) => {
    const dayPosts = posts.filter((p) => new Date(p.posted_at).getDay() === d)
    return {
      dow:       d,
      day_label: DAYS_OF_WEEK[d],
      avg_score: dayPosts.length ? avg(dayPosts.map((p) => p.performance_score)) : 0,
      count:     dayPosts.length,
    }
  })

  // ── Trend impact ──────────────────────────────────────────────────────────────

  const withTrend    = posts.filter((p) => p.cluster_id)
  const withoutTrend = posts.filter((p) => !p.cluster_id)

  const trend_impact: TrendImpactStat[] = [
    {
      has_trend: true,
      label:     'Trend-linked',
      avg_score: withTrend.length ? avg(withTrend.map((p) => p.performance_score)) : 0,
      count:     withTrend.length,
    },
    {
      has_trend: false,
      label:     'No trend',
      avg_score: withoutTrend.length ? avg(withoutTrend.map((p) => p.performance_score)) : 0,
      count:     withoutTrend.length,
    },
  ]

  // ── Top posts ─────────────────────────────────────────────────────────────────
  const top_posts = [...posts]
    .sort((a, b) => b.performance_score - a.performance_score)
    .slice(0, 10)

  return {
    period_days:     periodDays,
    total_posts:     posts.length,
    avg_score:       Math.round(avg_score),
    avg_engagement:  Math.round(avg_engagement * 100) / 100,
    best_platform,
    top_posts,
    by_topic:        by_topic.sort((a, b) => b.avg_score - a.avg_score).slice(0, 12),
    by_post_type:    by_post_type.sort((a, b) => b.avg_score - a.avg_score),
    by_hook_type:    by_hook_type.sort((a, b) => b.avg_score - a.avg_score),
    by_caption_style:by_caption_style.sort((a, b) => b.avg_score - a.avg_score),
    by_platform:     by_platform.sort((a, b) => b.avg_score - a.avg_score),
    by_category:     by_category.sort((a, b) => b.avg_score - a.avg_score).slice(0, 10),
    by_hour,
    by_day_of_week,
    trend_impact,
  }
}

// ── Weights derivation ────────────────────────────────────────────────────────
// Normalises avg performance scores to 0-1 weights for each dimension.

export function deriveWeights(posts: PerformancePost[]): Record<string, Record<string, number>> {
  const dims = {
    topic:         (p: PerformancePost) => p.topic ?? 'unknown',
    hook_type:     (p: PerformancePost) => p.hook_type,
    post_type:     (p: PerformancePost) => p.post_type,
    caption_style: (p: PerformancePost) => p.caption_style,
    platform:      (p: PerformancePost) => p.platform,
    category:      (p: PerformancePost) => p.category ?? 'uncategorised',
    hour:          (p: PerformancePost) => String(new Date(p.posted_at).getHours()),
  }

  const weights: Record<string, Record<string, number>> = {}

  for (const [dim, accessor] of Object.entries(dims)) {
    const grouped = aggregateDim(posts, accessor)
    const maxScore = Math.max(...grouped.map((g) => g.avg_score), 1)
    weights[dim] = Object.fromEntries(
      grouped.map((g) => [g.label, Math.round((g.avg_score / maxScore) * 100) / 100])
    )
  }

  return weights
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function avg(nums: number[]): number {
  if (!nums.length) return 0
  return nums.reduce((s, n) => s + n, 0) / nums.length
}

function notNull<T>(v: T | null | undefined): v is T {
  return v !== null && v !== undefined
}

function aggregateDim(posts: PerformancePost[], accessor: (p: PerformancePost) => string): DimStat[] {
  const groups = new Map<string, PerformancePost[]>()
  for (const p of posts) {
    const key = accessor(p)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(p)
  }

  return Array.from(groups.entries()).map(([label, group]) => ({
    label,
    avg_score:      Math.round(avg(group.map((p) => p.performance_score))),
    count:          group.length,
    avg_engagement: Math.round(avg(group.map((p) => p.engagement_rate).filter(notNull)) * 100) / 100,
  }))
}
