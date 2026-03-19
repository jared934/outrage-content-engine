// =============================================================================
// OUTRAGE Trend Scoring Engine — Format Recommender
//
// Takes a score profile (all dimension scores) and returns an ordered list
// of ContentType formats that best fit the trend's score shape.
//
// Rules are scored independently so multiple formats can qualify.
// The output is ordered best-fit first.
// =============================================================================

import type { ContentType } from '@/types'

interface ScoreProfile {
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
}

interface FormatScore {
  format: ContentType
  score: number
  reason: string
}

// ---------------------------------------------------------------------------
// Format scoring rules — each rule contributes to a format's suitability
// ---------------------------------------------------------------------------

function scoreFormats(profile: ScoreProfile): FormatScore[] {
  const candidates: FormatScore[] = []

  // --- hook ---
  // Best for: high outrage + urgency — grab attention fast
  {
    const s = profile.outrage_fit * 0.45 + profile.urgency * 0.35 + profile.virality * 0.20
    candidates.push({
      format: 'hook',
      score: Math.round(s),
      reason: 'High outrage + urgency makes this ideal for a hook that grabs attention',
    })
  }

  // --- headline ---
  // Best for: breaking news angle — high urgency + virality
  {
    const s = profile.urgency * 0.50 + profile.virality * 0.35 + profile.outrage_fit * 0.15
    candidates.push({
      format: 'headline',
      score: Math.round(s),
      reason: 'Fast-moving trend suits a punchy news-style headline',
    })
  }

  // --- meme_idea ---
  // Best for: high meme potential + visual
  {
    const s = profile.meme_potential * 0.60 + profile.visual_potential * 0.25 + profile.virality * 0.15
    candidates.push({
      format: 'meme_idea',
      score: Math.round(s),
      reason: 'High meme potential — strong candidate for a shareable image/meme format',
    })
  }

  // --- reel_idea ---
  // Best for: high reel potential + visual
  {
    const s = profile.reel_potential * 0.60 + profile.visual_potential * 0.25 + profile.virality * 0.15
    candidates.push({
      format: 'reel_idea',
      score: Math.round(s),
      reason: 'High Reel potential — short-form video will outperform static posts here',
    })
  }

  // --- caption ---
  // Best for: instagram_shareability + visual
  {
    const s = profile.instagram_shareability * 0.55 + profile.visual_potential * 0.30 + profile.outrage_fit * 0.15
    candidates.push({
      format: 'caption',
      score: Math.round(s),
      reason: 'Great for Instagram — strong visual with a shareable caption',
    })
  }

  // --- poll ---
  // Best for: high debate potential — get followers to weigh in
  {
    const s = profile.debate_potential * 0.65 + profile.virality * 0.20 + profile.outrage_fit * 0.15
    candidates.push({
      format: 'poll',
      score: Math.round(s),
      reason: 'Divisive topic is perfect for a poll — drives engagement and comments',
    })
  }

  // --- hot_take / post_copy ---
  // Best for: outrage + debate
  {
    const s = profile.outrage_fit * 0.40 + profile.debate_potential * 0.40 + profile.virality * 0.20
    candidates.push({
      format: 'post_copy',
      score: Math.round(s),
      reason: 'Opinionated angle suits a bold POV post',
    })
  }

  // --- reaction ---
  // High urgency + outrage = react fast
  {
    const s = profile.outrage_fit * 0.50 + profile.urgency * 0.35 + profile.virality * 0.15
    candidates.push({
      format: 'hook',  // reaction maps to hook in ContentType
      score: Math.round(s * 0.9),  // slightly lower to avoid exact tie with hook
      reason: 'Breaking outrage moment — reaction content performs well',
    })
  }

  // --- thread ---
  // Best for: high debate + shelf_life — worth exploring in depth
  {
    const s = profile.debate_potential * 0.45 + profile.shelf_life * 0.30 + profile.outrage_fit * 0.25
    candidates.push({
      format: 'thread',
      score: Math.round(s),
      reason: 'Deep debate topic worth exploring across a thread for maximum reach',
    })
  }

  // --- short_form_video ---
  // High reel + visual
  {
    const s = profile.reel_potential * 0.50 + profile.visual_potential * 0.30 + profile.urgency * 0.20
    candidates.push({
      format: 'short_form_video',
      score: Math.round(s),
      reason: 'Strong visual + reel signals — short-form video will perform',
    })
  }

  // --- tweet ---
  // High urgency + debate
  {
    const s = profile.urgency * 0.45 + profile.debate_potential * 0.35 + profile.virality * 0.20
    candidates.push({
      format: 'tweet',
      score: Math.round(s),
      reason: 'Fast-moving debate topic ideal for a sharp tweet',
    })
  }

  // --- newsletter ---
  // Best for: shelf_life — evergreen + analysed
  {
    const s = profile.shelf_life * 0.55 + profile.debate_potential * 0.25 + profile.outrage_fit * 0.20
    candidates.push({
      format: 'newsletter',
      score: Math.round(s),
      reason: 'Good shelf life — worth deeper treatment in a newsletter or digest',
    })
  }

  return candidates
}

// ---------------------------------------------------------------------------
// Dedup + sort
// ---------------------------------------------------------------------------

export function recommendFormats(profile: ScoreProfile): ContentType[] {
  const scored = scoreFormats(profile)

  // Deduplicate by format (keep highest score if duplicated)
  const best = new Map<ContentType, number>()
  for (const { format, score } of scored) {
    if (!best.has(format) || score > best.get(format)!) {
      best.set(format, score)
    }
  }

  // Sort descending by score, return top formats that clear the bar (> 45)
  return Array.from(best.entries())
    .filter(([, score]) => score > 45)
    .sort(([, a], [, b]) => b - a)
    .map(([format]) => format)
    .slice(0, 5) as ContentType[]
}

// ---------------------------------------------------------------------------
// Export with reasons (for UI / explanations)
// ---------------------------------------------------------------------------

export function recommendFormatsWithReasons(
  profile: ScoreProfile,
): Array<{ format: ContentType; score: number; reason: string }> {
  const scored = scoreFormats(profile)

  const best = new Map<ContentType, FormatScore>()
  for (const item of scored) {
    if (!best.has(item.format) || item.score > best.get(item.format)!.score) {
      best.set(item.format, item)
    }
  }

  return Array.from(best.values())
    .filter((f) => f.score > 45)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((f) => ({ format: f.format as ContentType, score: f.score, reason: f.reason }))
}
