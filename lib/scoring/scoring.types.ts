// =============================================================================
// OUTRAGE Trend Scoring Engine — Types
// =============================================================================

import type { ContentCategory, ContentType, TrendCluster, SourceItem, TrendEntity, BrandSettings } from '@/types'

// ---------------------------------------------------------------------------
// Recommended Action
// ---------------------------------------------------------------------------

export type RecommendedAction = 'post_now' | 'post_soon' | 'save_for_later' | 'ignore' | 'too_risky'

// ---------------------------------------------------------------------------
// Score Explanation — per dimension
// ---------------------------------------------------------------------------

export interface DimensionExplanation {
  score: number
  label: string         // e.g. "Very High", "Moderate"
  factors: string[]     // human-readable reasons why it scored this way
}

export interface ScoreExplanations {
  virality: DimensionExplanation
  outrage_fit: DimensionExplanation
  meme_potential: DimensionExplanation
  debate_potential: DimensionExplanation
  urgency: DimensionExplanation
  shelf_life: DimensionExplanation
  visual_potential: DimensionExplanation
  reel_potential: DimensionExplanation
  instagram_shareability: DimensionExplanation
  brand_safety: DimensionExplanation
  summary: string
}

// ---------------------------------------------------------------------------
// Full Score Result
// ---------------------------------------------------------------------------

export interface TrendScoreResult {
  // Core dimension scores (0–100)
  virality_score: number
  outrage_fit_score: number
  meme_potential_score: number
  debate_potential_score: number
  urgency_score: number
  shelf_life_score: number
  visual_potential_score: number
  reel_potential_score: number
  instagram_shareability_score: number
  brand_safety_score: number

  // Composite
  total_priority_score: number
  recommended_action: RecommendedAction

  // Explanations + formats
  score_explanations: ScoreExplanations
  recommended_formats: ContentType[]

  // Meta
  scoring_engine_version: string
  scored_at: string
}

// ---------------------------------------------------------------------------
// Scoring Input
// ---------------------------------------------------------------------------

export interface ScoringInput {
  cluster: TrendCluster
  items: SourceItem[]
  entities: TrendEntity[]
  brand_settings?: BrandSettings | null
}

// ---------------------------------------------------------------------------
// Dimension Weight Map (must sum to ~1.0)
// ---------------------------------------------------------------------------

export interface DimensionWeights {
  virality: number
  outrage_fit: number
  meme_potential: number
  debate_potential: number
  urgency: number
  shelf_life: number
  visual_potential: number
  reel_potential: number
  instagram_shareability: number
}

// ---------------------------------------------------------------------------
// Action Thresholds
// ---------------------------------------------------------------------------

export interface ActionThresholds {
  // post_now: high priority + high urgency + safe
  post_now_priority: number
  post_now_urgency: number
  post_now_safety: number

  // post_soon: good priority + safe enough
  post_soon_priority: number
  post_soon_safety: number

  // save_for_later: decent priority + decent shelf life
  save_for_later_priority: number
  save_for_later_shelf_life: number

  // too_risky: brand safety threshold below this = too_risky regardless
  too_risky_safety: number
}

// ---------------------------------------------------------------------------
// Full Config Shape
// ---------------------------------------------------------------------------

export interface ScoringConfig {
  weights: DimensionWeights
  thresholds: ActionThresholds
  /** Engagement values > this floor are treated as viral signals */
  engagement_viral_floor: number
  /** Penalty per duplicate/saturation source after this many */
  saturation_penalty_after: number
  saturation_penalty_per_source: number
}
