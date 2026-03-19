// Pure rule-evaluation engine — no DB calls, no side effects.
// Called from API route /api/alerts/fire to evaluate trend data against rules.

import type { AlertRuleV2 } from './alert.types'
import type { TrendWithScore } from '@/lib/dashboard/dashboard.types'
import type { NotificationType, NotificationSeverity } from '@/types'

export interface FiredAlert {
  type:       NotificationType
  severity:   NotificationSeverity
  title:      string
  message:    string
  cluster_id: string | null
  rule_id:    string
  metadata:   Record<string, unknown>
}

// ─── Evaluators ──────────────────────────────────────────────────────────────

function evalPostNow(trend: TrendWithScore, rule: AlertRuleV2): FiredAlert | null {
  const isPostNow = trend.recommended_action === 'post_now'
  const highScore = (trend.urgency_score ?? 0) >= 80 && (trend.total_priority_score ?? trend.overall_score ?? 0) >= 75
  if (!isPostNow && !highScore) return null
  return {
    type:       'post_now' as NotificationType,
    severity:   'critical',
    title:      `Post Now: ${trend.title}`,
    message:    `Urgency ${Math.round(trend.urgency_score ?? 0)} · Priority ${Math.round(trend.total_priority_score ?? trend.overall_score ?? 0)}. Window is open — act fast.`,
    cluster_id: trend.id,
    rule_id:    rule.id,
    metadata:   { urgency_score: trend.urgency_score, total_priority_score: trend.total_priority_score },
  }
}

function evalTrendDying(trend: TrendWithScore, rule: AlertRuleV2): FiredAlert | null {
  const dying = (trend.shelf_life_score ?? 100) < 35 && (trend.urgency_score ?? 0) > 55
  if (!dying) return null
  return {
    type:       'trend_dying' as NotificationType,
    severity:   'high',
    title:      `Trend Expiring: ${trend.title}`,
    message:    `Shelf life at ${Math.round(trend.shelf_life_score ?? 0)}. Post before this window closes.`,
    cluster_id: trend.id,
    rule_id:    rule.id,
    metadata:   { shelf_life_score: trend.shelf_life_score },
  }
}

function evalMemeWorthy(trend: TrendWithScore, rule: AlertRuleV2): FiredAlert | null {
  const min = rule.threshold ?? 76
  if ((trend.meme_potential_score ?? 0) < min) return null
  return {
    type:       'meme_worthy' as NotificationType,
    severity:   'medium',
    title:      `Meme Opportunity: ${trend.title}`,
    message:    `Meme potential ${Math.round(trend.meme_potential_score ?? 0)} — strong creative angle available.`,
    cluster_id: trend.id,
    rule_id:    rule.id,
    metadata:   { meme_potential_score: trend.meme_potential_score },
  }
}

function evalScoreThreshold(trend: TrendWithScore, rule: AlertRuleV2): FiredAlert | null {
  const min = rule.threshold ?? 75
  const score = trend.total_priority_score ?? trend.overall_score ?? 0
  if (score < min) return null
  return {
    type:       'trend_alert' as NotificationType,
    severity:   'high',
    title:      `High-Score Trend: ${trend.title}`,
    message:    `Priority score ${Math.round(score)} has crossed your threshold of ${min}.`,
    cluster_id: trend.id,
    rule_id:    rule.id,
    metadata:   { score, threshold: min },
  }
}

function evalSaturated(trend: TrendWithScore, rule: AlertRuleV2): FiredAlert | null {
  const sat = (trend.virality_score ?? 100) < 42 && (trend.outrage_fit_score ?? 100) < 42
  if (!sat) return null
  return {
    type:       'saturated_trend' as NotificationType,
    severity:   'medium',
    title:      `Saturated Market: ${trend.title}`,
    message:    `Low virality (${Math.round(trend.virality_score ?? 0)}) and outrage fit (${Math.round(trend.outrage_fit_score ?? 0)}). Consider skipping.`,
    cluster_id: trend.id,
    rule_id:    rule.id,
    metadata:   { virality_score: trend.virality_score, outrage_fit_score: trend.outrage_fit_score },
  }
}

function evalRisky(trend: TrendWithScore, rule: AlertRuleV2): FiredAlert | null {
  const floor = rule.threshold ?? 38
  if ((trend.brand_safety_score ?? 100) >= floor) return null
  return {
    type:       'risky_trend' as NotificationType,
    severity:   'high',
    title:      `Brand Risk: ${trend.title}`,
    message:    `Brand safety score ${Math.round(trend.brand_safety_score ?? 0)} is below threshold ${floor}. Review before posting.`,
    cluster_id: trend.id,
    rule_id:    rule.id,
    metadata:   { brand_safety_score: trend.brand_safety_score },
  }
}

// ─── Main evaluator ───────────────────────────────────────────────────────────

export function evaluateTrendsAgainstRules(
  trends:     TrendWithScore[],
  rules:      AlertRuleV2[],
  /** IDs already alerted recently (cooldown dedup) */
  recentKeys: Set<string>,
): FiredAlert[] {
  const fired: FiredAlert[] = []

  for (const rule of rules) {
    if (!rule.enabled || rule.trigger_type === 'digest') continue

    for (const trend of trends) {
      const dedupKey = `${rule.id}:${trend.id}`
      if (recentKeys.has(dedupKey)) continue

      let alert: FiredAlert | null = null

      switch (rule.trigger_type) {
        case 'post_now':         alert = evalPostNow(trend, rule);         break
        case 'trend_dying':      alert = evalTrendDying(trend, rule);      break
        case 'meme_worthy':      alert = evalMemeWorthy(trend, rule);      break
        case 'score_threshold':  alert = evalScoreThreshold(trend, rule);  break
        case 'saturated':        alert = evalSaturated(trend, rule);       break
        case 'risky':            alert = evalRisky(trend, rule);           break
        default: break
      }

      if (alert) {
        fired.push(alert)
        recentKeys.add(dedupKey)
      }
    }
  }

  return fired
}
