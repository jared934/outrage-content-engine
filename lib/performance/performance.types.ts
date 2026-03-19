// ─── Performance Feedback Types ───────────────────────────────────────────────

export type PerfPlatform =
  | 'instagram' | 'tiktok' | 'twitter' | 'youtube'
  | 'facebook' | 'threads' | 'linkedin' | 'reddit' | 'other'

export type PerfPostType =
  | 'reel' | 'short' | 'static' | 'carousel' | 'story'
  | 'tweet' | 'thread' | 'video' | 'live' | 'other'

export type PerfHookType =
  | 'question' | 'shock' | 'list' | 'statement' | 'cliffhanger'
  | 'relatable' | 'controversial' | 'challenge' | 'none'

export type PerfCaptionStyle =
  | 'short' | 'punchy' | 'storytelling' | 'educational'
  | 'humorous' | 'emotional' | 'minimalist' | 'long_form'

export interface PerformancePost {
  id:               string
  org_id:           string
  pipeline_item_id: string | null
  cluster_id:       string | null
  title:            string
  platform:         PerfPlatform
  post_type:        PerfPostType
  topic:            string | null
  category:         string | null
  hook_text:        string | null
  hook_type:        PerfHookType
  caption_style:    PerfCaptionStyle
  posted_at:        string
  views:            number | null
  likes:            number | null
  shares:           number | null
  saves:            number | null
  comments:         number | null
  reach:            number | null
  follower_gain:    number | null
  engagement_rate:  number | null
  performance_score: number
  post_url:         string | null
  notes:            string | null
  created_at:       string
  updated_at:       string
}

export interface PerformanceWeights {
  id:                    string
  org_id:                string
  topic_weights:         Record<string, number>
  hook_type_weights:     Record<string, number>
  post_type_weights:     Record<string, number>
  caption_style_weights: Record<string, number>
  hour_weights:          Record<string, number>
  platform_weights:      Record<string, number>
  category_weights:      Record<string, number>
  recalculated_at:       string | null
  updated_at:            string
}

// ── Analytics types ───────────────────────────────────────────────────────────

export interface DimStat {
  label:             string
  avg_score:         number
  count:             number
  avg_engagement:    number
}

export interface TimeStat {
  hour:      number
  avg_score: number
  count:     number
}

export interface DayOfWeekStat {
  dow:       number   // 0 = Sunday
  day_label: string
  avg_score: number
  count:     number
}

export interface TrendImpactStat {
  has_trend: boolean
  avg_score: number
  count:     number
  label:     string
}

export interface PerformanceAnalytics {
  period_days:      number
  total_posts:      number
  avg_score:        number
  avg_engagement:   number
  best_platform:    string | null
  top_posts:        PerformancePost[]
  by_topic:         DimStat[]
  by_post_type:     DimStat[]
  by_hook_type:     DimStat[]
  by_caption_style: DimStat[]
  by_platform:      DimStat[]
  by_category:      DimStat[]
  by_hour:          TimeStat[]
  by_day_of_week:   DayOfWeekStat[]
  trend_impact:     TrendImpactStat[]
}

// ── Config ────────────────────────────────────────────────────────────────────

export const PLATFORM_CONFIG: Record<PerfPlatform, {
  label:     string
  icon:      string
  color:     string
  benchmark: number   // baseline engagement rate %
}> = {
  instagram: { label: 'Instagram', icon: '📸', color: 'text-pink-400',   benchmark: 3.5 },
  tiktok:    { label: 'TikTok',    icon: '🎵', color: 'text-purple-400', benchmark: 5.0 },
  twitter:   { label: 'Twitter/X', icon: '𝕏',  color: 'text-sky-400',   benchmark: 1.0 },
  youtube:   { label: 'YouTube',   icon: '▶️', color: 'text-red-400',    benchmark: 4.0 },
  facebook:  { label: 'Facebook',  icon: '📘', color: 'text-blue-400',   benchmark: 1.5 },
  threads:   { label: 'Threads',   icon: '🧵', color: 'text-zinc-400',   benchmark: 2.0 },
  linkedin:  { label: 'LinkedIn',  icon: '💼', color: 'text-cyan-400',   benchmark: 3.0 },
  reddit:    { label: 'Reddit',    icon: '👽', color: 'text-orange-400', benchmark: 4.0 },
  other:     { label: 'Other',     icon: '🌐', color: 'text-zinc-500',   benchmark: 2.0 },
}

export const POST_TYPE_CONFIG: Record<PerfPostType, { label: string; icon: string }> = {
  reel:     { label: 'Reel',     icon: '🎬' },
  short:    { label: 'Short',    icon: '⚡' },
  static:   { label: 'Static',   icon: '🖼️' },
  carousel: { label: 'Carousel', icon: '🎠' },
  story:    { label: 'Story',    icon: '⭕' },
  tweet:    { label: 'Tweet',    icon: '💬' },
  thread:   { label: 'Thread',   icon: '🧵' },
  video:    { label: 'Video',    icon: '📹' },
  live:     { label: 'Live',     icon: '🔴' },
  other:    { label: 'Other',    icon: '📌' },
}

export const HOOK_TYPE_CONFIG: Record<PerfHookType, { label: string; icon: string; description: string }> = {
  question:     { label: 'Question',     icon: '❓', description: 'Asks the audience something directly' },
  shock:        { label: 'Shock',        icon: '😱', description: 'Surprising statement that stops the scroll' },
  list:         { label: 'List',         icon: '📋', description: 'Numbered or bullet-led structure' },
  statement:    { label: 'Statement',    icon: '📢', description: 'Direct declarative opener' },
  cliffhanger:  { label: 'Cliffhanger', icon: '🎣', description: 'Teases what comes next' },
  relatable:    { label: 'Relatable',    icon: '🤝', description: 'Speaks to shared experience' },
  controversial:{ label: 'Controversial',icon: '🔥', description: 'Deliberately polarizing take' },
  challenge:    { label: 'Challenge',    icon: '🏆', description: 'Challenges assumption or norm' },
  none:         { label: 'No hook',      icon: '—',  description: 'No defined hook structure' },
}

export const CAPTION_STYLE_CONFIG: Record<PerfCaptionStyle, { label: string; description: string }> = {
  short:        { label: 'Short',       description: '1-3 lines' },
  punchy:       { label: 'Punchy',      description: 'High-energy short burst' },
  storytelling: { label: 'Storytelling', description: 'Narrative arc' },
  educational:  { label: 'Educational', description: 'Informative / listicle' },
  humorous:     { label: 'Humorous',    description: 'Comedy-first' },
  emotional:    { label: 'Emotional',   description: 'Vulnerability / feeling' },
  minimalist:   { label: 'Minimalist',  description: 'Single word or emoji' },
  long_form:    { label: 'Long-form',   description: '300+ words' },
}

export const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ── Scoring ───────────────────────────────────────────────────────────────────

export function computePerformanceScore(
  platform:       PerfPlatform,
  engagementRate: number | null,
  views:          number | null,
  shares:         number | null,
  saves:          number | null,
  likes:          number | null,
  comments:       number | null,
): number {
  const benchmark = PLATFORM_CONFIG[platform]?.benchmark ?? 2.0

  // Base: engagement rate vs platform benchmark (0-70)
  let baseScore = 0
  if (engagementRate !== null) {
    baseScore = Math.min((engagementRate / benchmark) * 35, 70)
  } else if (views && (likes || comments)) {
    const totalEng = (likes ?? 0) + (comments ?? 0)
    const er = (totalEng / views) * 100
    baseScore = Math.min((er / benchmark) * 35, 70)
  }

  // Viral bonus: shares + saves relative to views (0-20)
  let viralBonus = 0
  if (views && views > 0) {
    const shareRatio = ((shares ?? 0) / views) * 100
    const saveRatio  = ((saves  ?? 0) / views) * 100
    viralBonus = Math.min(shareRatio * 3 + saveRatio * 2, 20)
  }

  // Engagement depth: comments (0-10)
  let depthBonus = 0
  if (views && views > 0 && comments) {
    depthBonus = Math.min((comments / views) * 2000, 10)
  }

  return Math.min(Math.round(baseScore + viralBonus + depthBonus), 100)
}

// ── Input types ───────────────────────────────────────────────────────────────

export interface CreatePerformancePostInput {
  pipeline_item_id?: string | null
  cluster_id?:       string | null
  title:             string
  platform:          PerfPlatform
  post_type:         PerfPostType
  topic?:            string | null
  category?:         string | null
  hook_text?:        string | null
  hook_type:         PerfHookType
  caption_style:     PerfCaptionStyle
  posted_at:         string
  views?:            number | null
  likes?:            number | null
  shares?:           number | null
  saves?:            number | null
  comments?:         number | null
  reach?:            number | null
  follower_gain?:    number | null
  engagement_rate?:  number | null
  post_url?:         string | null
  notes?:            string | null
}
