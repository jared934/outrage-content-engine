// =============================================================================
// OUTRAGE Trend Scoring Engine — Core Service
//
// Computes 10 dimension scores + total_priority_score + recommended_action
// for a trend cluster using available signals (recency, source count, entities,
// engagement proxies, brand settings, keyword signals).
//
// Usage:
//   import { scoreCluster } from '@/lib/scoring'
//   const result = scoreCluster({ cluster, items, entities, brand_settings })
// =============================================================================

import type { ContentCategory } from '@/types'
import type {
  ScoringInput,
  TrendScoreResult,
  DimensionExplanation,
  ScoreExplanations,
  RecommendedAction,
  ScoringConfig,
} from './scoring.types'
import { DEFAULT_SCORING_CONFIG } from './scoring.config'
import { recommendFormats } from './format-recommender'

export const SCORING_ENGINE_VERSION = '1.0.0'

// ---------------------------------------------------------------------------
// Utility — clamp a value between 0 and 100
// ---------------------------------------------------------------------------

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

// ---------------------------------------------------------------------------
// Utility — count keyword matches in a text blob (case-insensitive)
// ---------------------------------------------------------------------------

function countKeywordMatches(text: string, keywords: string[]): number {
  const lower = text.toLowerCase()
  return keywords.filter((kw) => lower.includes(kw.toLowerCase())).length
}

// ---------------------------------------------------------------------------
// Utility — build a short label from a 0-100 score
// ---------------------------------------------------------------------------

function scoreLabel(score: number): string {
  if (score >= 85) return 'Very High'
  if (score >= 68) return 'High'
  if (score >= 50) return 'Moderate'
  if (score >= 32) return 'Low'
  return 'Very Low'
}

// ---------------------------------------------------------------------------
// Utility — build a DimensionExplanation object
// ---------------------------------------------------------------------------

function explanation(score: number, factors: string[]): DimensionExplanation {
  return { score, label: scoreLabel(score), factors }
}

// ---------------------------------------------------------------------------
// Category base score maps
// ---------------------------------------------------------------------------

const VIRALITY_BASE: Record<ContentCategory, number> = {
  viral: 90, meme: 80, celebrity: 75, drama: 70, entertainment: 65,
  sports: 60, music: 60, culture: 55, crime: 50, politics: 45,
  fashion: 40, tech: 35, other: 40,
}

const OUTRAGE_FIT_BASE: Record<ContentCategory, number> = {
  drama: 92, celebrity: 85, crime: 82, politics: 76, culture: 60,
  entertainment: 58, sports: 52, viral: 65, meme: 48, music: 40,
  fashion: 30, tech: 25, other: 35,
}

const MEME_POTENTIAL_BASE: Record<ContentCategory, number> = {
  meme: 95, viral: 85, celebrity: 75, entertainment: 70, drama: 65,
  sports: 62, culture: 55, music: 55, politics: 40, fashion: 48,
  crime: 20, tech: 35, other: 30,
}

const DEBATE_POTENTIAL_BASE: Record<ContentCategory, number> = {
  politics: 90, crime: 70, drama: 75, celebrity: 65, culture: 62,
  sports: 65, entertainment: 55, tech: 55, meme: 42, music: 50,
  fashion: 40, viral: 45, other: 38,
}

const SHELF_LIFE_BASE: Record<ContentCategory, number> = {
  music: 72, fashion: 68, tech: 65, culture: 65, sports: 52,
  entertainment: 55, celebrity: 40, meme: 35, viral: 25, drama: 32,
  politics: 38, crime: 42, other: 52,
}

const VISUAL_POTENTIAL_BASE: Record<ContentCategory, number> = {
  fashion: 92, celebrity: 82, sports: 78, entertainment: 72, meme: 78,
  music: 68, viral: 72, drama: 58, culture: 56, crime: 30,
  politics: 36, tech: 42, other: 48,
}

const REEL_POTENTIAL_BASE: Record<ContentCategory, number> = {
  music: 92, viral: 90, celebrity: 86, entertainment: 82, sports: 78,
  meme: 82, drama: 65, fashion: 72, culture: 62, tech: 46,
  politics: 40, crime: 25, other: 46,
}

const INSTAGRAM_BASE: Record<ContentCategory, number> = {
  celebrity: 88, fashion: 92, music: 82, entertainment: 78, viral: 82,
  meme: 76, sports: 66, drama: 62, culture: 62, tech: 46,
  politics: 36, crime: 20, other: 50,
}

const BRAND_SAFETY_BASE: Record<ContentCategory, number> = {
  tech: 92, music: 88, fashion: 88, sports: 82, entertainment: 78,
  culture: 72, viral: 66, meme: 62, celebrity: 62, drama: 46,
  politics: 36, crime: 20, other: 62,
}

// ---------------------------------------------------------------------------
// Keyword signal lists
// ---------------------------------------------------------------------------

const OUTRAGE_KEYWORDS = [
  'scandal', 'exposed', 'leaked', 'drama', 'beef', 'canceled', 'cancelled',
  'cheating', 'fired', 'arrested', 'controversy', 'outrage', 'backlash',
  'shocking', 'disgusting', 'unbelievable', 'insane', 'wild', 'receipts',
  'clout', 'dragged', 'called out', 'problematic', 'shaded',
]

const MEME_KEYWORDS = [
  'meme', 'viral', 'funny', 'reaction', 'face', 'mood', 'literally',
  'actually', 'imagine', 'nobody', 'everyone', 'relatable', 'vibe',
  'slay', 'lowkey', 'no cap', 'fr fr', 'bestie',
]

const DEBATE_KEYWORDS = [
  'vs', 'versus', 'debate', 'controversial', 'unpopular opinion', 'hot take',
  'should', 'agree', 'disagree', 'overrated', 'underrated', 'problematic',
  'defend', 'cancelled', 'cancel culture', 'toxic', 'take', 'wrong',
]

const URGENCY_KEYWORDS = [
  'breaking', 'just in', 'happening now', 'live', 'developing', 'alert',
  'urgent', 'just announced', 'moments ago', 'just dropped',
]

const VISUAL_KEYWORDS = [
  'photo', 'video', 'clip', 'image', 'look', 'seen', 'spotted', 'wearing',
  'appeared', 'showing', 'revealed', 'outfit', 'footage', 'pic', 'snap',
]

const REEL_KEYWORDS = [
  'video', 'clip', 'moment', 'scene', 'footage', 'watch', 'see', 'caught',
  'filmed', 'recorded', 'performance', 'reaction video',
]

const TIME_SENSITIVE_KEYWORDS = [
  'breaking', 'today', 'now', 'just', 'this week', 'last night',
  'yesterday', 'this morning', 'hours ago',
]

const EVERGREEN_KEYWORDS = [
  'history', 'always', 'tradition', 'classic', 'legendary', 'iconic',
  'timeless', 'forever', 'culture', 'generation',
]

const DANGER_KEYWORDS = [
  'violence', 'death', 'murder', 'assault', 'rape', 'abuse', 'racist',
  'sexist', 'nazi', 'terrorist', 'suicide', 'overdose', 'graphic',
  'genocide', 'explicit', 'nsfw',
]

const IG_KEYWORDS = [
  'mood', 'literally', 'omg', 'iconic', 'goals', 'love', 'hate',
  'obsessed', 'aesthetic', 'vibe', 'serve', 'lewk', 'glow up',
]

// ---------------------------------------------------------------------------
// DIMENSION: virality_score
// ---------------------------------------------------------------------------

function computeVirality(
  input: ScoringInput,
  config: ScoringConfig,
  allText: string,
): DimensionExplanation {
  const { cluster, items } = input
  const factors: string[] = []
  let score = VIRALITY_BASE[cluster.category ?? 'other'] ?? 40

  factors.push(`Category "${cluster.category ?? 'other'}" base: ${VIRALITY_BASE[cluster.category ?? 'other'] ?? 40}`)

  // Source count (log scale so 1 source ≠ instant 0)
  const sourceCount = cluster.source_count ?? items.length
  const sourceCountPts = Math.min(20, Math.log2(Math.max(1, sourceCount)) * 5)
  score += sourceCountPts
  factors.push(`${sourceCount} source${sourceCount !== 1 ? 's' : ''} (+${Math.round(sourceCountPts)})`)

  // Recency
  const ageHours = (Date.now() - new Date(cluster.first_seen_at).getTime()) / 3_600_000
  let recencyPts = 0
  if (ageHours < 1) recencyPts = 25
  else if (ageHours < 6) recencyPts = 18
  else if (ageHours < 24) recencyPts = 10
  else if (ageHours < 48) recencyPts = 4
  score += recencyPts
  if (recencyPts > 0) factors.push(`Emerged ${Math.round(ageHours)}h ago (+${recencyPts})`)

  // Trend acceleration (sources per hour)
  const acceleration = sourceCount / Math.max(ageHours, 0.5)
  let accelPts = 0
  if (acceleration > 10) { accelPts = 15; factors.push('Accelerating fast (>10 sources/hr, +15)') }
  else if (acceleration > 4) { accelPts = 10; factors.push('Accelerating (>4 sources/hr, +10)') }
  else if (acceleration > 1) { accelPts = 5; factors.push('Steady growth (+5)') }
  score += accelPts

  // Engagement proxy
  const totalEngagement = items.reduce((sum, item) => {
    const eng = item.engagement_data as Record<string, number> ?? {}
    return sum + (eng.likes ?? 0) + (eng.shares ?? 0) * 2 + (eng.upvotes ?? 0) + (eng.comments ?? 0) * 0.5
  }, 0)
  let engPts = 0
  if (totalEngagement > config.engagement_viral_floor * 5) { engPts = 15; factors.push(`High engagement (${Math.round(totalEngagement).toLocaleString()} total, +15)`) }
  else if (totalEngagement > config.engagement_viral_floor) { engPts = 10; factors.push(`Good engagement (+10)`) }
  else if (totalEngagement > config.engagement_viral_floor / 10) { engPts = 5; factors.push('Some engagement (+5)') }
  score += engPts

  // Saturation penalty — too many sources means it may be over-covered
  if (sourceCount > config.saturation_penalty_after) {
    const penalty = Math.min(15, (sourceCount - config.saturation_penalty_after) * config.saturation_penalty_per_source)
    score -= penalty
    factors.push(`Saturation penalty (${sourceCount} sources, -${Math.round(penalty)})`)
  }

  // Urgency keyword boost
  const urgencyMatches = countKeywordMatches(allText, URGENCY_KEYWORDS)
  if (urgencyMatches > 0) {
    score += Math.min(8, urgencyMatches * 4)
    factors.push(`Breaking/urgent signals (+${Math.min(8, urgencyMatches * 4)})`)
  }

  return explanation(clamp(score), factors)
}

// ---------------------------------------------------------------------------
// DIMENSION: outrage_fit_score
// ---------------------------------------------------------------------------

function computeOutrageFit(
  input: ScoringInput,
  allText: string,
): DimensionExplanation {
  const { cluster, items } = input
  const factors: string[] = []
  let score = OUTRAGE_FIT_BASE[cluster.category ?? 'other'] ?? 35

  factors.push(`Category "${cluster.category ?? 'other'}" base: ${OUTRAGE_FIT_BASE[cluster.category ?? 'other'] ?? 35}`)

  // Outrage keyword matches
  const outrageMatches = countKeywordMatches(allText, OUTRAGE_KEYWORDS)
  const outrageBoost = Math.min(15, outrageMatches * 4)
  if (outrageBoost > 0) {
    score += outrageBoost
    factors.push(`Outrage signals (${outrageMatches} keywords, +${outrageBoost})`)
  }

  // Sentiment — negative = higher outrage potential
  const sentimentScores = items.map((i) => i.sentiment_score).filter((s): s is number => s !== null)
  if (sentimentScores.length > 0) {
    const avgSentiment = sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length
    // Normalise: sentiment_score likely 0-100 where low = negative
    if (avgSentiment < 30) { score += 10; factors.push(`Strongly negative sentiment (+10)`) }
    else if (avgSentiment < 45) { score += 5; factors.push(`Negative sentiment (+5)`) }
    else if (avgSentiment > 70) { score -= 5; factors.push('Positive sentiment (-5)') }
  }

  return explanation(clamp(score), factors)
}

// ---------------------------------------------------------------------------
// DIMENSION: meme_potential_score
// ---------------------------------------------------------------------------

function computeMemePotential(
  input: ScoringInput,
  allText: string,
): DimensionExplanation {
  const { cluster, entities } = input
  const factors: string[] = []
  let score = MEME_POTENTIAL_BASE[cluster.category ?? 'other'] ?? 30

  factors.push(`Category "${cluster.category ?? 'other'}" base: ${MEME_POTENTIAL_BASE[cluster.category ?? 'other'] ?? 30}`)

  // Title brevity (short = meme-ready)
  const titleLength = cluster.title?.length ?? 120
  if (titleLength < 40) { score += 12; factors.push('Short, punchy title (+12)') }
  else if (titleLength < 65) { score += 6; factors.push('Reasonably concise title (+6)') }
  else if (titleLength > 100) { score -= 5; factors.push('Long title hurts meme-ability (-5)') }

  // Recognisable entities (people, brands = more meme-able)
  const famousEntities = entities.filter((e) => e.type === 'person' || e.type === 'brand')
  const entityBoost = Math.min(12, famousEntities.length * 4)
  if (entityBoost > 0) {
    score += entityBoost
    factors.push(`${famousEntities.length} recognisable entit${famousEntities.length === 1 ? 'y' : 'ies'} (+${entityBoost})`)
  }

  // Meme keyword signals
  const memeMatches = countKeywordMatches(allText, MEME_KEYWORDS)
  const memeBoost = Math.min(10, memeMatches * 3)
  if (memeBoost > 0) {
    score += memeBoost
    factors.push(`Meme language detected (+${memeBoost})`)
  }

  return explanation(clamp(score), factors)
}

// ---------------------------------------------------------------------------
// DIMENSION: debate_potential_score
// ---------------------------------------------------------------------------

function computeDebatePotential(
  input: ScoringInput,
  allText: string,
): DimensionExplanation {
  const { cluster } = input
  const factors: string[] = []
  let score = DEBATE_POTENTIAL_BASE[cluster.category ?? 'other'] ?? 38

  factors.push(`Category "${cluster.category ?? 'other'}" base: ${DEBATE_POTENTIAL_BASE[cluster.category ?? 'other'] ?? 38}`)

  // Divisive keywords
  const debateMatches = countKeywordMatches(allText, DEBATE_KEYWORDS)
  const debateBoost = Math.min(15, debateMatches * 5)
  if (debateBoost > 0) {
    score += debateBoost
    factors.push(`Debate/opinion signals (${debateMatches} keywords, +${debateBoost})`)
  }

  // Source diversity — multiple outlets = broader debate
  const sourceCount = cluster.source_count ?? 0
  if (sourceCount >= 10) { score += 12; factors.push('High source diversity (+12)') }
  else if (sourceCount >= 5) { score += 7; factors.push('Good source diversity (+7)') }
  else if (sourceCount >= 3) { score += 3; factors.push('Some source diversity (+3)') }

  return explanation(clamp(score), factors)
}

// ---------------------------------------------------------------------------
// DIMENSION: urgency_score
// ---------------------------------------------------------------------------

function computeUrgency(
  input: ScoringInput,
  allText: string,
): DimensionExplanation {
  const { cluster } = input
  const factors: string[] = []

  const ageHours = (Date.now() - new Date(cluster.first_seen_at).getTime()) / 3_600_000
  let score: number
  if (ageHours < 1) { score = 92; factors.push('Less than 1 hour old (92 base)') }
  else if (ageHours < 3) { score = 82; factors.push('Less than 3 hours old (82 base)') }
  else if (ageHours < 6) { score = 70; factors.push('Less than 6 hours old (70 base)') }
  else if (ageHours < 12) { score = 55; factors.push('Less than 12 hours old (55 base)') }
  else if (ageHours < 24) { score = 40; factors.push('Less than 24 hours old (40 base)') }
  else if (ageHours < 48) { score = 22; factors.push('1–2 days old (22 base)') }
  else { score = 6; factors.push(`${Math.round(ageHours)}h old — low urgency (6 base)`) }

  // Cluster status boost
  if (cluster.status === 'hot') { score += 12; factors.push('Status: hot (+12)') }
  else if (cluster.status === 'active') { score += 5; factors.push('Status: active (+5)') }
  else if (cluster.status === 'declining') { score -= 10; factors.push('Status: declining (-10)') }

  // Breaking/live keywords
  const urgencyMatches = countKeywordMatches(allText, URGENCY_KEYWORDS)
  if (urgencyMatches > 0) {
    const boost = Math.min(10, urgencyMatches * 5)
    score += boost
    factors.push(`Breaking/live signals (+${boost})`)
  }

  return explanation(clamp(score), factors)
}

// ---------------------------------------------------------------------------
// DIMENSION: shelf_life_score
// ---------------------------------------------------------------------------

function computeShelfLife(
  input: ScoringInput,
  allText: string,
): DimensionExplanation {
  const { cluster } = input
  const factors: string[] = []
  let score = SHELF_LIFE_BASE[cluster.category ?? 'other'] ?? 52

  factors.push(`Category "${cluster.category ?? 'other'}" base: ${SHELF_LIFE_BASE[cluster.category ?? 'other'] ?? 52}`)

  // Time-sensitive keywords reduce shelf life
  const timeMatches = countKeywordMatches(allText, TIME_SENSITIVE_KEYWORDS)
  const timePenalty = Math.min(28, timeMatches * 7)
  if (timePenalty > 0) {
    score -= timePenalty
    factors.push(`Time-sensitive signals (-${timePenalty})`)
  }

  // Evergreen keywords increase shelf life
  const evergreenMatches = countKeywordMatches(allText, EVERGREEN_KEYWORDS)
  const evergreenBoost = Math.min(20, evergreenMatches * 5)
  if (evergreenBoost > 0) {
    score += evergreenBoost
    factors.push(`Evergreen signals (+${evergreenBoost})`)
  }

  // Trend duration — active for >24h = good staying power
  const durationHours = (new Date(cluster.last_seen_at).getTime() - new Date(cluster.first_seen_at).getTime()) / 3_600_000
  if (durationHours > 48) { score += 15; factors.push('Trending >48h — good longevity (+15)') }
  else if (durationHours > 24) { score += 8; factors.push('Trending >24h (+8)') }

  return explanation(clamp(score), factors)
}

// ---------------------------------------------------------------------------
// DIMENSION: visual_potential_score
// ---------------------------------------------------------------------------

function computeVisualPotential(
  input: ScoringInput,
  allText: string,
): DimensionExplanation {
  const { cluster, items } = input
  const factors: string[] = []
  let score = VISUAL_POTENTIAL_BASE[cluster.category ?? 'other'] ?? 48

  factors.push(`Category "${cluster.category ?? 'other'}" base: ${VISUAL_POTENTIAL_BASE[cluster.category ?? 'other'] ?? 48}`)

  // Media presence in source items
  const itemsWithMedia = items.filter((i) => (i.media_urls ?? []).length > 0).length
  const itemsWithThumb = items.filter((i) => i.thumbnail_url).length

  if (itemsWithMedia > 0) {
    const boost = Math.min(20, itemsWithMedia * 5)
    score += boost
    factors.push(`${itemsWithMedia} item${itemsWithMedia !== 1 ? 's' : ''} with media (+${boost})`)
  } else if (itemsWithThumb > 0) {
    const boost = Math.min(10, itemsWithThumb * 3)
    score += boost
    factors.push(`${itemsWithThumb} item${itemsWithThumb !== 1 ? 's' : ''} with thumbnails (+${boost})`)
  } else {
    factors.push('No media or thumbnails found')
  }

  // Visual keyword signals
  const visualMatches = countKeywordMatches(allText, VISUAL_KEYWORDS)
  const visualBoost = Math.min(12, visualMatches * 3)
  if (visualBoost > 0) {
    score += visualBoost
    factors.push(`Visual language detected (+${visualBoost})`)
  }

  return explanation(clamp(score), factors)
}

// ---------------------------------------------------------------------------
// DIMENSION: reel_potential_score
// ---------------------------------------------------------------------------

function computeReelPotential(
  input: ScoringInput,
  allText: string,
  visualScore: number,
): DimensionExplanation {
  const { cluster } = input
  const factors: string[] = []
  const categoryBase = REEL_POTENTIAL_BASE[cluster.category ?? 'other'] ?? 46

  // Blend category base with visual score
  let score = Math.round(categoryBase * 0.55 + visualScore * 0.45)
  factors.push(`Category "${cluster.category ?? 'other'}" base (${categoryBase}) + visual potential (${visualScore}) blended`)

  // Reel keyword signals
  const reelMatches = countKeywordMatches(allText, REEL_KEYWORDS)
  const reelBoost = Math.min(12, reelMatches * 3)
  if (reelBoost > 0) {
    score += reelBoost
    factors.push(`Video/clip signals (+${reelBoost})`)
  }

  // Music category extra boost (music Reels perform especially well)
  if (cluster.category === 'music') {
    score += 8
    factors.push('Music content — strong Reel format (+8)')
  }

  return explanation(clamp(score), factors)
}

// ---------------------------------------------------------------------------
// DIMENSION: instagram_shareability_score
// ---------------------------------------------------------------------------

function computeInstagramShareability(
  input: ScoringInput,
  allText: string,
  visualScore: number,
): DimensionExplanation {
  const { cluster } = input
  const factors: string[] = []
  const categoryBase = INSTAGRAM_BASE[cluster.category ?? 'other'] ?? 50

  // Blend category base with visual score (IG is very visual)
  let score = Math.round(categoryBase * 0.5 + visualScore * 0.5)
  factors.push(`Category "${cluster.category ?? 'other'}" base (${categoryBase}) blended with visual score (${visualScore})`)

  // IG-friendly keywords
  const igMatches = countKeywordMatches(allText, IG_KEYWORDS)
  const igBoost = Math.min(10, igMatches * 2)
  if (igBoost > 0) {
    score += igBoost
    factors.push(`Instagram language detected (+${igBoost})`)
  }

  // Title as caption potential — concise titles work as captions
  const titleLength = cluster.title?.length ?? 120
  if (titleLength < 50) { score += 8; factors.push('Short title works as IG caption (+8)') }
  else if (titleLength < 80) { score += 4; factors.push('Title usable as IG caption (+4)') }

  return explanation(clamp(score), factors)
}

// ---------------------------------------------------------------------------
// DIMENSION: brand_safety_score
// ---------------------------------------------------------------------------

function computeBrandSafety(
  input: ScoringInput,
  allText: string,
  outrageFitScore: number,
): DimensionExplanation {
  const { cluster, brand_settings } = input
  const factors: string[] = []
  let score = BRAND_SAFETY_BASE[cluster.category ?? 'other'] ?? 62

  factors.push(`Category "${cluster.category ?? 'other'}" base: ${BRAND_SAFETY_BASE[cluster.category ?? 'other'] ?? 62}`)

  // High outrage fit reduces brand safety
  if (outrageFitScore >= 80) { score -= 20; factors.push(`Very high outrage fit (${outrageFitScore}) reduces safety (-20)`) }
  else if (outrageFitScore >= 65) { score -= 12; factors.push(`High outrage fit (${outrageFitScore}) reduces safety (-12)`) }
  else if (outrageFitScore >= 50) { score -= 6; factors.push(`Moderate outrage fit (-6)`) }

  // Danger keywords
  const dangerMatches = countKeywordMatches(allText, DANGER_KEYWORDS)
  const dangerPenalty = Math.min(55, dangerMatches * 15)
  if (dangerPenalty > 0) {
    score -= dangerPenalty
    factors.push(`Danger keywords detected (${dangerMatches} matches, -${dangerPenalty})`)
  }

  // Brand avoid_keywords (org-specific)
  if (brand_settings?.avoid_keywords && brand_settings.avoid_keywords.length > 0) {
    const avoidMatches = countKeywordMatches(allText, brand_settings.avoid_keywords)
    const avoidPenalty = Math.min(30, avoidMatches * 8)
    if (avoidPenalty > 0) {
      score -= avoidPenalty
      factors.push(`Brand avoid keywords matched (${avoidMatches}, -${avoidPenalty})`)
    }
  }

  // Crime category gets extra penalty
  if (cluster.category === 'crime') {
    score -= 15
    factors.push('Crime category — additional safety penalty (-15)')
  }

  if (score > 75) factors.push('Safe for most brands')
  else if (score > 50) factors.push('Exercise caution — review before posting')
  else if (score > 30) factors.push('High risk — strong brand alignment needed')
  else factors.push('Very high risk — likely not suitable')

  return explanation(clamp(score), factors)
}

// ---------------------------------------------------------------------------
// COMPUTE: total_priority_score
// ---------------------------------------------------------------------------

function computeTotalPriority(
  scores: {
    virality: number
    outrage_fit: number
    meme_potential: number
    debate_potential: number
    urgency: number
    shelf_life: number
    visual_potential: number
    reel_potential: number
    instagram_shareability: number
    brand_safety: number
  },
  config: ScoringConfig,
): { total: number; factors: string[] } {
  const w = config.weights
  const factors: string[] = []

  const weighted =
    scores.virality * w.virality +
    scores.outrage_fit * w.outrage_fit +
    scores.meme_potential * w.meme_potential +
    scores.debate_potential * w.debate_potential +
    scores.urgency * w.urgency +
    scores.shelf_life * w.shelf_life +
    scores.visual_potential * w.visual_potential +
    scores.reel_potential * w.reel_potential +
    scores.instagram_shareability * w.instagram_shareability

  let total = Math.round(weighted)
  factors.push(`Weighted composite: ${total}`)

  // Brand safety modifier — unsafe content hard-capped
  if (scores.brand_safety < 30) {
    total = Math.min(total, 15)
    factors.push(`Brand safety very low (${scores.brand_safety}) — priority capped at 15`)
  } else if (scores.brand_safety < 50) {
    total = Math.round(total * 0.65)
    factors.push(`Brand safety low (${scores.brand_safety}) — priority reduced by 35%`)
  }

  return { total: clamp(total), factors }
}

// ---------------------------------------------------------------------------
// COMPUTE: recommended_action
// ---------------------------------------------------------------------------

function computeRecommendedAction(
  scores: {
    total_priority: number
    urgency: number
    brand_safety: number
    shelf_life: number
  },
  config: ScoringConfig,
): RecommendedAction {
  const t = config.thresholds

  if (scores.brand_safety < t.too_risky_safety) return 'too_risky'

  if (
    scores.total_priority >= t.post_now_priority &&
    scores.urgency >= t.post_now_urgency &&
    scores.brand_safety >= t.post_now_safety
  ) return 'post_now'

  if (
    scores.total_priority >= t.post_soon_priority &&
    scores.brand_safety >= t.post_soon_safety
  ) return 'post_soon'

  if (
    scores.total_priority >= t.save_for_later_priority &&
    scores.shelf_life >= t.save_for_later_shelf_life
  ) return 'save_for_later'

  return 'ignore'
}

// ---------------------------------------------------------------------------
// COMPUTE: summary explanation text
// ---------------------------------------------------------------------------

function buildSummary(
  cluster: ScoringInput['cluster'],
  action: RecommendedAction,
  scores: Record<string, number>,
): string {
  const actionLabel: Record<RecommendedAction, string> = {
    post_now: 'Act immediately',
    post_soon: 'Post soon while it is hot',
    save_for_later: 'Save — content has shelf life but low urgency',
    ignore: 'Low priority — skip or deprioritise',
    too_risky: 'Too risky for the brand — do not post',
  }

  const topStrengths = (
    Object.entries(scores) as [string, number][]
  )
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([key, val]) => `${key.replace(/_/g, ' ')} (${val})`)
    .join(', ')

  return (
    `"${cluster.title}" — ${actionLabel[action]}. ` +
    `Priority: ${scores.total_priority}/100. ` +
    `Top strengths: ${topStrengths}.`
  )
}

// ---------------------------------------------------------------------------
// MAIN EXPORT — scoreCluster
// ---------------------------------------------------------------------------

export function scoreCluster(
  input: ScoringInput,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): TrendScoreResult {
  const { cluster, items, entities } = input

  // Build a single text blob from all available signals for keyword matching
  const allText = [
    cluster.title ?? '',
    cluster.summary ?? '',
    ...(cluster.keywords ?? []),
    ...items.map((i) => `${i.title ?? ''} ${i.body ?? ''}`),
    ...entities.map((e) => e.name),
  ]
    .join(' ')
    .toLowerCase()

  // Compute each dimension
  const viralityExp = computeVirality(input, config, allText)
  const outrageExp = computeOutrageFit(input, allText)
  const memeExp = computeMemePotential(input, allText)
  const debateExp = computeDebatePotential(input, allText)
  const urgencyExp = computeUrgency(input, allText)
  const shelfExp = computeShelfLife(input, allText)
  const visualExp = computeVisualPotential(input, allText)
  const reelExp = computeReelPotential(input, allText, visualExp.score)
  const igExp = computeInstagramShareability(input, allText, visualExp.score)
  const safetyExp = computeBrandSafety(input, allText, outrageExp.score)

  // Compute total priority
  const { total: totalPriority, factors: priorityFactors } = computeTotalPriority(
    {
      virality: viralityExp.score,
      outrage_fit: outrageExp.score,
      meme_potential: memeExp.score,
      debate_potential: debateExp.score,
      urgency: urgencyExp.score,
      shelf_life: shelfExp.score,
      visual_potential: visualExp.score,
      reel_potential: reelExp.score,
      instagram_shareability: igExp.score,
      brand_safety: safetyExp.score,
    },
    config,
  )

  // Determine action
  const recommendedAction = computeRecommendedAction(
    {
      total_priority: totalPriority,
      urgency: urgencyExp.score,
      brand_safety: safetyExp.score,
      shelf_life: shelfExp.score,
    },
    config,
  )

  // Build score map for summary
  const scoreMap = {
    virality: viralityExp.score,
    outrage_fit: outrageExp.score,
    meme_potential: memeExp.score,
    debate_potential: debateExp.score,
    urgency: urgencyExp.score,
    shelf_life: shelfExp.score,
    visual_potential: visualExp.score,
    reel_potential: reelExp.score,
    instagram_shareability: igExp.score,
    brand_safety: safetyExp.score,
    total_priority: totalPriority,
  }

  const summary = buildSummary(cluster, recommendedAction, scoreMap)

  // Format recommendations
  const recommendedFormats = recommendFormats({
    virality: viralityExp.score,
    outrage_fit: outrageExp.score,
    meme_potential: memeExp.score,
    debate_potential: debateExp.score,
    urgency: urgencyExp.score,
    shelf_life: shelfExp.score,
    visual_potential: visualExp.score,
    reel_potential: reelExp.score,
    instagram_shareability: igExp.score,
    brand_safety: safetyExp.score,
  })

  return {
    virality_score: viralityExp.score,
    outrage_fit_score: outrageExp.score,
    meme_potential_score: memeExp.score,
    debate_potential_score: debateExp.score,
    urgency_score: urgencyExp.score,
    shelf_life_score: shelfExp.score,
    visual_potential_score: visualExp.score,
    reel_potential_score: reelExp.score,
    instagram_shareability_score: igExp.score,
    brand_safety_score: safetyExp.score,
    total_priority_score: totalPriority,
    recommended_action: recommendedAction,
    score_explanations: {
      virality: viralityExp,
      outrage_fit: outrageExp,
      meme_potential: memeExp,
      debate_potential: debateExp,
      urgency: urgencyExp,
      shelf_life: shelfExp,
      visual_potential: visualExp,
      reel_potential: reelExp,
      instagram_shareability: igExp,
      brand_safety: safetyExp,
      summary,
    },
    recommended_formats: recommendedFormats,
    scoring_engine_version: SCORING_ENGINE_VERSION,
    scored_at: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Convenience: score and persist to Supabase
// ---------------------------------------------------------------------------

export async function scoreAndPersist(
  input: ScoringInput,
  config: ScoringConfig = DEFAULT_SCORING_CONFIG,
): Promise<{ result: TrendScoreResult; error: string | null }> {
  const result = scoreCluster(input, config)

  try {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const supabase = createServiceClient()

    const { error } = await supabase.from('trend_scores').insert({
      cluster_id: input.cluster.id,
      // Legacy columns (existing schema)
      viral_potential: result.virality_score,
      brand_fit: result.outrage_fit_score,
      urgency: result.urgency_score,
      controversy_level: result.debate_potential_score,
      audience_relevance: result.instagram_shareability_score,
      overall_score: result.total_priority_score,
      // Extended columns (migration 005)
      outrage_fit_score: result.outrage_fit_score,
      meme_potential_score: result.meme_potential_score,
      debate_potential_score: result.debate_potential_score,
      shelf_life_score: result.shelf_life_score,
      visual_potential_score: result.visual_potential_score,
      reel_potential_score: result.reel_potential_score,
      instagram_shareability_score: result.instagram_shareability_score,
      brand_safety_score: result.brand_safety_score,
      total_priority_score: result.total_priority_score,
      recommended_action: result.recommended_action,
      score_explanations: result.score_explanations,
      recommended_formats: result.recommended_formats,
      reasoning: result.score_explanations.summary,
      scoring_model: `outrage-engine-v${SCORING_ENGINE_VERSION}`,
      scored_at: result.scored_at,
    })

    if (error) return { result, error: error.message }

    // Keep overall_score on trend_clusters in sync
    await supabase
      .from('trend_clusters')
      .update({ overall_score: result.total_priority_score, updated_at: result.scored_at })
      .eq('id', input.cluster.id)

    return { result, error: null }
  } catch (err) {
    return { result, error: String(err) }
  }
}
