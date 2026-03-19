// =============================================================================
// OUTRAGE Trend Scoring Engine — Configuration
//
// This file defines the default weights and thresholds used to compute
// total_priority_score and recommended_action.
//
// All weights in `weights` must sum to 1.0.
// Adjust per brand by passing an override ScoringConfig to scoreCluster().
// =============================================================================

import type { ScoringConfig } from './scoring.types'

// ---------------------------------------------------------------------------
// Default configuration — tuned for OUTRAGE brand
// ---------------------------------------------------------------------------

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  weights: {
    // How fast is this spreading? Core signal.
    virality: 0.22,

    // Does this fit the OUTRAGE brand angle? Second most important.
    outrage_fit: 0.20,

    // Time-sensitive — how urgently should we act?
    urgency: 0.15,

    // Will this spark debate / engagement in comments?
    debate_potential: 0.12,

    // Can this become a shareable meme?
    meme_potential: 0.10,

    // Can we turn this into a Reel?
    reel_potential: 0.07,

    // General visual quality for Instagram
    instagram_shareability: 0.06,

    // Does this have strong visual assets?
    visual_potential: 0.05,

    // Will this stay relevant tomorrow / next week?
    shelf_life: 0.03,
  },

  thresholds: {
    // Must have all three to trigger post_now
    post_now_priority: 72,
    post_now_urgency: 55,
    post_now_safety: 55,

    // post_soon is lower bar on urgency
    post_soon_priority: 52,
    post_soon_safety: 45,

    // save_for_later: decent content but low urgency + shelf life
    save_for_later_priority: 35,
    save_for_later_shelf_life: 40,

    // Below this brand_safety score → too_risky regardless of everything else
    too_risky_safety: 28,
  },

  // Engagement totals (likes + shares*2 + upvotes) considered "viral"
  engagement_viral_floor: 5000,

  // After this many sources, diminishing returns kick in (saturation)
  saturation_penalty_after: 25,
  // Points subtracted per source above that threshold (capped at 15)
  saturation_penalty_per_source: 1,
}

// ---------------------------------------------------------------------------
// Preset: Conservative (brand-safe mode)
// Use when posting on behalf of risk-averse clients
// ---------------------------------------------------------------------------

export const CONSERVATIVE_SCORING_CONFIG: ScoringConfig = {
  ...DEFAULT_SCORING_CONFIG,
  weights: {
    ...DEFAULT_SCORING_CONFIG.weights,
    virality: 0.18,
    outrage_fit: 0.12,
    urgency: 0.12,
    debate_potential: 0.08,
    meme_potential: 0.08,
    reel_potential: 0.10,
    instagram_shareability: 0.12,
    visual_potential: 0.10,
    shelf_life: 0.10,
  },
  thresholds: {
    post_now_priority: 78,
    post_now_urgency: 65,
    post_now_safety: 70,
    post_soon_priority: 60,
    post_soon_safety: 60,
    save_for_later_priority: 45,
    save_for_later_shelf_life: 50,
    too_risky_safety: 45,
  },
}

// ---------------------------------------------------------------------------
// Preset: Viral-Maximiser
// Use when the goal is maximum reach at any cost
// ---------------------------------------------------------------------------

export const VIRAL_MAXIMISER_CONFIG: ScoringConfig = {
  ...DEFAULT_SCORING_CONFIG,
  weights: {
    ...DEFAULT_SCORING_CONFIG.weights,
    virality: 0.30,
    outrage_fit: 0.22,
    urgency: 0.18,
    debate_potential: 0.12,
    meme_potential: 0.08,
    reel_potential: 0.04,
    instagram_shareability: 0.03,
    visual_potential: 0.02,
    shelf_life: 0.01,
  },
  thresholds: {
    post_now_priority: 62,
    post_now_urgency: 45,
    post_now_safety: 40,
    post_soon_priority: 42,
    post_soon_safety: 30,
    save_for_later_priority: 28,
    save_for_later_shelf_life: 25,
    too_risky_safety: 15,
  },
}

// ---------------------------------------------------------------------------
// Preset name registry (for UI dropdowns / API selection)
// ---------------------------------------------------------------------------

export const SCORING_PRESETS = {
  default: DEFAULT_SCORING_CONFIG,
  conservative: CONSERVATIVE_SCORING_CONFIG,
  viral_maximiser: VIRAL_MAXIMISER_CONFIG,
} as const

export type ScoringPreset = keyof typeof SCORING_PRESETS

// ---------------------------------------------------------------------------
// Helper — validate that weights sum to 1.0 (±0.01 tolerance)
// ---------------------------------------------------------------------------

export function validateWeights(config: ScoringConfig): { valid: boolean; sum: number } {
  const sum = Object.values(config.weights).reduce((a, b) => a + b, 0)
  return { valid: Math.abs(sum - 1.0) < 0.01, sum: Math.round(sum * 100) / 100 }
}
