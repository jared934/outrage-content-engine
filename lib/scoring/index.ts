// =============================================================================
// OUTRAGE Trend Scoring Engine — Public API
// =============================================================================

export { scoreCluster, scoreAndPersist, SCORING_ENGINE_VERSION } from './scoring.service'
export { recommendFormats, recommendFormatsWithReasons } from './format-recommender'
export {
  DEFAULT_SCORING_CONFIG,
  CONSERVATIVE_SCORING_CONFIG,
  VIRAL_MAXIMISER_CONFIG,
  SCORING_PRESETS,
  validateWeights,
} from './scoring.config'

export type {
  RecommendedAction,
  DimensionExplanation,
  ScoreExplanations,
  TrendScoreResult,
  ScoringInput,
  DimensionWeights,
  ActionThresholds,
  ScoringConfig,
} from './scoring.types'

export type { ScoringPreset } from './scoring.config'
