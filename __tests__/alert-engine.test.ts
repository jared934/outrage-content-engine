import { describe, it, expect } from 'vitest'
import { evaluateTrendsAgainstRules, type FiredAlert } from '@/lib/alerts/alert-engine'
import type { AlertRuleV2 } from '@/lib/alerts/alert.types'
import type { TrendWithScore } from '@/lib/dashboard/dashboard.types'

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeTrend(overrides: Partial<TrendWithScore> = {}): TrendWithScore {
  return {
    id: 'trend-1',
    title: 'Test Trend',
    category: 'entertainment',
    status: 'active',
    keywords: ['celebrity', 'drama'],
    summary: 'A test trend about celebrity drama.',
    source_count: 5,
    overall_score: 60,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    first_seen_at: new Date().toISOString(),
    urgency_score: 60,
    meme_potential_score: 60,
    total_priority_score: 60,
    brand_safety_score: 70,
    shelf_life_score: 70,
    virality_score: 60,
    outrage_fit_score: 60,
    recommended_action: 'save_for_later',
    ...overrides,
  }
}

function makeRule(overrides: Partial<AlertRuleV2> = {}): AlertRuleV2 {
  return {
    id: 'rule-1',
    org_id: 'org-1',
    name: 'Test Rule',
    description: null,
    enabled: true,
    trigger_type: 'post_now',
    threshold: null,
    keywords: [],
    categories: [],
    platforms: [],
    channels: [],
    cooldown_hours: 4,
    notify_in_app: true,
    notify_email: false,
    webhook_url: null,
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

// ─── evaluateTrendsAgainstRules ───────────────────────────────────────────────

describe('evaluateTrendsAgainstRules', () => {
  it('returns no alerts for empty inputs', () => {
    const result = evaluateTrendsAgainstRules([], [], new Set())
    expect(result).toHaveLength(0)
  })

  it('skips disabled rules', () => {
    const trend = makeTrend({ recommended_action: 'post_now', urgency_score: 90 })
    const rule  = makeRule({ enabled: false })
    const result = evaluateTrendsAgainstRules([trend], [rule], new Set())
    expect(result).toHaveLength(0)
  })

  it('skips digest rules', () => {
    const trend = makeTrend({ recommended_action: 'post_now', urgency_score: 90 })
    const rule  = makeRule({ trigger_type: 'digest' })
    const result = evaluateTrendsAgainstRules([trend], [rule], new Set())
    expect(result).toHaveLength(0)
  })

  it('skips already-alerted dedup keys', () => {
    const trend = makeTrend({ recommended_action: 'post_now' })
    const rule  = makeRule()
    const recentKeys = new Set(['rule-1:trend-1'])
    const result = evaluateTrendsAgainstRules([trend], [rule], recentKeys)
    expect(result).toHaveLength(0)
  })

  it('fires post_now alert when recommended_action is post_now', () => {
    const trend = makeTrend({ recommended_action: 'post_now' })
    const rule  = makeRule({ trigger_type: 'post_now' })
    const result = evaluateTrendsAgainstRules([trend], [rule], new Set())
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('post_now')
    expect(result[0].severity).toBe('critical')
    expect(result[0].cluster_id).toBe('trend-1')
    expect(result[0].rule_id).toBe('rule-1')
  })

  it('fires post_now alert when urgency >= 80 AND priority >= 75 even without recommended_action', () => {
    const trend = makeTrend({ recommended_action: 'save_for_later', urgency_score: 85, total_priority_score: 80 })
    const rule  = makeRule({ trigger_type: 'post_now' })
    const result = evaluateTrendsAgainstRules([trend], [rule], new Set())
    expect(result).toHaveLength(1)
  })

  it('does NOT fire post_now when urgency < 80 and action is not post_now', () => {
    const trend = makeTrend({ recommended_action: 'save_for_later', urgency_score: 70, total_priority_score: 70 })
    const rule  = makeRule({ trigger_type: 'post_now' })
    const result = evaluateTrendsAgainstRules([trend], [rule], new Set())
    expect(result).toHaveLength(0)
  })

  it('fires meme_worthy alert when meme score exceeds threshold', () => {
    const trend = makeTrend({ meme_potential_score: 80 })
    const rule  = makeRule({ trigger_type: 'meme_worthy', threshold: 76 })
    const result = evaluateTrendsAgainstRules([trend], [rule], new Set())
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('meme_worthy')
  })

  it('does NOT fire meme_worthy when score is below threshold', () => {
    const trend = makeTrend({ meme_potential_score: 70 })
    const rule  = makeRule({ trigger_type: 'meme_worthy', threshold: 76 })
    const result = evaluateTrendsAgainstRules([trend], [rule], new Set())
    expect(result).toHaveLength(0)
  })

  it('fires score_threshold alert when priority score exceeds threshold', () => {
    const trend = makeTrend({ total_priority_score: 88 })
    const rule  = makeRule({ trigger_type: 'score_threshold', threshold: 75 })
    const result = evaluateTrendsAgainstRules([trend], [rule], new Set())
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('trend_alert')
  })

  it('fires risky alert when brand_safety_score is below floor', () => {
    const trend = makeTrend({ brand_safety_score: 30 })
    const rule  = makeRule({ trigger_type: 'risky', threshold: 38 })
    const result = evaluateTrendsAgainstRules([trend], [rule], new Set())
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('risky_trend')
    expect(result[0].severity).toBe('high')
  })

  it('fires trend_dying when shelf_life < 35 AND urgency > 55', () => {
    const trend = makeTrend({ shelf_life_score: 28, urgency_score: 65 })
    const rule  = makeRule({ trigger_type: 'trend_dying' })
    const result = evaluateTrendsAgainstRules([trend], [rule], new Set())
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('trend_dying')
  })

  it('adds dedup key to recentKeys set after firing', () => {
    const trend = makeTrend({ recommended_action: 'post_now' })
    const rule  = makeRule({ trigger_type: 'post_now' })
    const recentKeys = new Set<string>()
    evaluateTrendsAgainstRules([trend], [rule], recentKeys)
    expect(recentKeys.has('rule-1:trend-1')).toBe(true)
  })

  it('can fire multiple alerts for multiple trend+rule combinations', () => {
    const trends = [
      makeTrend({ id: 't1', recommended_action: 'post_now' }),
      makeTrend({ id: 't2', meme_potential_score: 90 }),
    ]
    const rules = [
      makeRule({ id: 'r1', trigger_type: 'post_now' }),
      makeRule({ id: 'r2', trigger_type: 'meme_worthy', threshold: 76 }),
    ]
    const result = evaluateTrendsAgainstRules(trends, rules, new Set())
    expect(result.length).toBeGreaterThanOrEqual(2)
  })
})
