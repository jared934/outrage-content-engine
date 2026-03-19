import { describe, it, expect } from 'vitest'
import { computeAnalytics, deriveWeights } from '@/lib/performance/performance.analytics'
import type { PerformancePost } from '@/lib/performance/performance.types'

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makePost(overrides: Partial<PerformancePost> = {}): PerformancePost {
  return {
    id: crypto.randomUUID(),
    org_id: 'org-1',
    pipeline_item_id: null,
    cluster_id: null,
    title: 'Test Post',
    platform: 'instagram',
    post_type: 'reel',
    hook_type: 'question',
    hook_text: null,
    caption_style: 'punchy',
    topic: 'celebrity',
    category: 'entertainment',
    posted_at: new Date('2024-06-15T18:00:00Z').toISOString(),
    views: 10000,
    likes: 800,
    comments: 120,
    shares: 200,
    saves: 150,
    reach: 9500,
    follower_gain: null,
    engagement_rate: 8.0,
    performance_score: 85,
    post_url: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

const HIGH_POST = makePost({ performance_score: 90, engagement_rate: 9.5, topic: 'celebrity', post_type: 'reel', platform: 'instagram' })
const MID_POST  = makePost({ performance_score: 55, engagement_rate: 3.5, topic: 'politics',  post_type: 'static', platform: 'facebook', posted_at: new Date('2024-06-15T10:00:00Z').toISOString() })
const LOW_POST  = makePost({ performance_score: 25, engagement_rate: 0.8, topic: 'generic',   post_type: 'static', platform: 'twitter',  posted_at: new Date('2024-06-15T03:00:00Z').toISOString() })

// ─── computeAnalytics ─────────────────────────────────────────────────────────

describe('computeAnalytics', () => {
  it('returns zeroed result for empty post array', () => {
    const result = computeAnalytics([], 30)
    expect(result.total_posts).toBe(0)
    expect(result.avg_score).toBe(0)
    expect(result.top_posts).toHaveLength(0)
  })

  it('calculates correct averages for known posts', () => {
    const posts = [HIGH_POST, MID_POST, LOW_POST]
    const result = computeAnalytics(posts, 30)

    expect(result.total_posts).toBe(3)
    expect(result.avg_score).toBe(Math.round((90 + 55 + 25) / 3))
  })

  it('returns top_posts sorted by performance_score descending', () => {
    const posts = [LOW_POST, HIGH_POST, MID_POST]
    const result = computeAnalytics(posts, 30)

    expect(result.top_posts[0].performance_score).toBeGreaterThanOrEqual(result.top_posts[1].performance_score)
    expect(result.top_posts[0].id).toBe(HIGH_POST.id)
  })

  it('aggregates by_platform correctly', () => {
    const posts = [HIGH_POST, MID_POST, LOW_POST]
    const result = computeAnalytics(posts, 30)

    const instaPlatform = result.by_platform.find((p) => p.label === 'instagram')
    expect(instaPlatform).toBeDefined()
    expect(instaPlatform?.avg_score).toBe(90)
    expect(instaPlatform?.count).toBe(1)
  })

  it('fills all 24 hours in by_hour', () => {
    const result = computeAnalytics([HIGH_POST, MID_POST], 30)
    expect(result.by_hour).toHaveLength(24)
  })

  it('fills all 7 days in by_day_of_week', () => {
    const result = computeAnalytics([HIGH_POST], 30)
    expect(result.by_day_of_week).toHaveLength(7)
  })

  it('separates trend-linked from standalone posts correctly', () => {
    const withTrend = makePost({ cluster_id: 'cluster-abc', performance_score: 80 })
    const standalone = makePost({ cluster_id: null, performance_score: 40 })

    const result = computeAnalytics([withTrend, standalone], 30)
    const linked  = result.trend_impact.find((t) => t.has_trend)
    const noTrend = result.trend_impact.find((t) => !t.has_trend)

    expect(linked?.count).toBe(1)
    expect(linked?.avg_score).toBe(80)
    expect(noTrend?.count).toBe(1)
    expect(noTrend?.avg_score).toBe(40)
  })

  it('passes through period_days unchanged', () => {
    const result = computeAnalytics([HIGH_POST], 90)
    expect(result.period_days).toBe(90)
  })

  it('exposes best_platform as the highest-scoring platform', () => {
    const posts = [HIGH_POST, MID_POST, LOW_POST]
    const result = computeAnalytics(posts, 30)
    // instagram (score 90) > facebook (55) > twitter (25)
    expect(result.best_platform).toBe('instagram')
  })
})

// ─── deriveWeights ────────────────────────────────────────────────────────────

describe('deriveWeights', () => {
  it('returns empty object for each dimension when posts are empty', () => {
    const weights = deriveWeights([])
    expect(weights.topic).toEqual({})
    expect(weights.hook_type).toEqual({})
  })

  it('normalises weights so the best performer in each dim is 1.0', () => {
    const posts = [
      makePost({ post_type: 'reel',   performance_score: 90 }),
      makePost({ post_type: 'static', performance_score: 45 }),
    ]
    const weights = deriveWeights(posts)

    const postTypeWeights = weights.post_type
    expect(postTypeWeights['reel']).toBe(1.0)
    expect(postTypeWeights['static']).toBeCloseTo(0.5, 1)
  })

  it('all weight values are between 0 and 1 inclusive', () => {
    const posts = [HIGH_POST, MID_POST, LOW_POST]
    const weights = deriveWeights(posts)

    for (const dim of Object.values(weights)) {
      for (const val of Object.values(dim)) {
        expect(val).toBeGreaterThanOrEqual(0)
        expect(val).toBeLessThanOrEqual(1)
      }
    }
  })

  it('produces weights for all expected dimensions', () => {
    const weights = deriveWeights([HIGH_POST])
    const expectedDims = ['topic', 'hook_type', 'post_type', 'caption_style', 'platform', 'category', 'hour']
    for (const dim of expectedDims) {
      expect(weights).toHaveProperty(dim)
    }
  })

  it('single post produces weight of 1.0 for its own values', () => {
    const post = makePost({ platform: 'tiktok', performance_score: 77 })
    const weights = deriveWeights([post])
    expect(weights.platform['tiktok']).toBe(1.0)
  })
})
