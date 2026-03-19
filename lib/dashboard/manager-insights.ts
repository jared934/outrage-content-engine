// =============================================================================
// Manager Mode — generate AI content manager insight cards from scoring data
// =============================================================================
// Pure client-side logic. No API calls. Rules applied to scoring dimensions.
// =============================================================================

import type { TrendWithScore, ManagerAlert, ManagerAlertType } from './dashboard.types'

// ---------------------------------------------------------------------------
// Rule definitions
// ---------------------------------------------------------------------------

interface InsightRule {
  type:    ManagerAlertType
  test:    (t: TrendWithScore) => boolean
  urgency: ManagerAlert['urgency']
  title:   (t: TrendWithScore) => string
  message: (t: TrendWithScore) => string
  action:  (t: TrendWithScore) => ManagerAlert['primaryAction']
}

const RULES: InsightRule[] = [
  // --- POST NOW ---------------------------------------------------------------
  {
    type: 'POST_NOW',
    urgency: 'critical',
    test: (t) =>
      t.recommended_action === 'post_now' &&
      (t.urgency_score ?? 0) >= 72,
    title: () => 'Post this NOW',
    message: (t) => {
      const urgency = t.urgency_score ?? 0
      const virality = t.virality_score ?? 0
      if (urgency > 85) return `Urgency is at ${urgency}/100 — this window closes fast.`
      if (virality > 75) return `Virality ${virality}/100 + high urgency. Strike while it's hot.`
      return `Priority score ${t.total_priority_score ?? t.overall_score}/100. Don't wait on this one.`
    },
    action: (t) => ({ label: 'Generate Ideas', href: `/trends/${t.id}` }),
  },

  // --- TREND DYING ------------------------------------------------------------
  {
    type: 'TREND_DYING',
    urgency: 'high',
    test: (t) =>
      (t.shelf_life_score ?? 100) < 35 &&
      (t.urgency_score ?? 0) > 55 &&
      t.recommended_action !== 'ignore' &&
      t.recommended_action !== 'too_risky',
    title: () => 'Trend is dying — last window',
    message: (t) => {
      const shelf = t.shelf_life_score ?? 0
      if (shelf < 20) return `Shelf life is critically low (${shelf}/100). Post in the next hour or skip it.`
      return `Shelf life at ${shelf}/100 and dropping. Get a post out today or move on.`
    },
    action: (t) => ({ label: 'Post quickly', href: `/trends/${t.id}` }),
  },

  // --- MEME OPPORTUNITY -------------------------------------------------------
  {
    type: 'MEME_OPPORTUNITY',
    urgency: 'high',
    test: (t) =>
      (t.meme_potential_score ?? 0) >= 76 &&
      t.recommended_action !== 'ignore' &&
      t.recommended_action !== 'too_risky',
    title: () => 'Strong meme potential',
    message: (t) => {
      const meme = t.meme_potential_score ?? 0
      if (meme >= 88) return `Meme score ${meme}/100 — this story was basically made for meme format.`
      return `Meme potential ${meme}/100. Low effort, high shareability. Hit the Meme Studio.`
    },
    action: (t) => ({ label: 'Open Meme Studio', href: `/memes/studio?cluster_id=${t.id}` }),
  },

  // --- HIGH DEBATE ------------------------------------------------------------
  {
    type: 'HIGH_DEBATE',
    urgency: 'medium',
    test: (t) =>
      (t.debate_potential_score ?? 0) >= 78 &&
      t.recommended_action !== 'ignore' &&
      t.recommended_action !== 'too_risky',
    title: () => 'Comment section gold',
    message: (t) => {
      const debate = t.debate_potential_score ?? 0
      return `Debate potential ${debate}/100. This will drive massive comment engagement. Ask a polarising question.`
    },
    action: (t) => ({ label: 'Generate Ideas', href: `/trends/${t.id}` }),
  },

  // --- REEL OVER STATIC -------------------------------------------------------
  {
    type: 'REEL_OVER_STATIC',
    urgency: 'medium',
    test: (t) => {
      const reel   = t.reel_potential_score   ?? 0
      const visual = t.visual_potential_score ?? 0
      return reel >= 72 && reel > visual + 12
    },
    title: () => 'Make this a Reel, not a static',
    message: (t) => {
      const reel = t.reel_potential_score ?? 0
      return `Reel potential ${reel}/100 — the story arc here is too dynamic for a single image. Motion wins.`
    },
    action: (t) => ({ label: 'View Formats', href: `/trends/${t.id}` }),
  },

  // --- TOO RISKY --------------------------------------------------------------
  {
    type: 'TOO_RISKY',
    urgency: 'medium',
    test: (t) =>
      (t.brand_safety_score ?? 100) < 38 &&
      t.recommended_action !== 'ignore',
    title: () => 'Too risky — potential brand issue',
    message: (t) => {
      const safety = t.brand_safety_score ?? 0
      return `Brand safety score ${safety}/100. Proceed with extreme caution or pass entirely.`
    },
    action: (t) => ({ label: 'Review', href: `/trends/${t.id}` }),
  },

  // --- TOO SATURATED ----------------------------------------------------------
  {
    type: 'TOO_SATURATED',
    urgency: 'low',
    test: (t) =>
      (t.virality_score ?? 100) < 42 &&
      (t.outrage_fit_score ?? 100) < 42 &&
      t.recommended_action !== 'post_now',
    title: () => 'Over-saturated — not worth it',
    message: (t) => {
      const v = t.virality_score ?? 0
      return `Virality ${v}/100 and low OUTRAGE fit. Everyone's already covered this. Use your energy elsewhere.`
    },
    action: (t) => ({ label: 'Ignore trend', href: `/trends/${t.id}` }),
  },

  // --- COMPETITOR GAP ---------------------------------------------------------
  {
    type: 'COMPETITOR_GAP',
    urgency: 'medium',
    test: (t) =>
      (t.total_priority_score ?? t.overall_score) >= 65 &&
      t.source_count <= 4,
    title: () => 'Competitors aren\'t on this yet',
    message: (t) => {
      const count = t.source_count
      return `Only ${count} source${count === 1 ? '' : 's'} covering this so far. Be first and own the angle.`
    },
    action: (t) => ({ label: 'Generate Ideas', href: `/trends/${t.id}` }),
  },
]

// ---------------------------------------------------------------------------
// Public: generate manager alerts from a list of trends
// ---------------------------------------------------------------------------

/**
 * Generate manager-mode insight cards from trend + scoring data.
 * Returns max 1 insight per trend (the highest-priority rule that matches).
 * Results sorted by urgency (critical → low).
 */
export function generateManagerAlerts(
  trends: TrendWithScore[],
  maxAlerts = 6,
): ManagerAlert[] {
  const urgencyOrder: Record<ManagerAlert['urgency'], number> = {
    critical: 0, high: 1, medium: 2, low: 3,
  }

  const alerts: ManagerAlert[] = []

  for (const trend of trends) {
    // Apply rules in order; use first match per trend
    for (const rule of RULES) {
      if (rule.test(trend)) {
        alerts.push({
          id:            `${rule.type}_${trend.id}`,
          type:          rule.type,
          urgency:       rule.urgency,
          title:         rule.title(trend),
          message:       rule.message(trend),
          trend,
          primaryAction: rule.action(trend),
        })
        break // one insight per trend
      }
    }
  }

  return alerts
    .sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency])
    .slice(0, maxAlerts)
}
