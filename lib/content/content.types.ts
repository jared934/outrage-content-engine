// =============================================================================
// OUTRAGE AI Content Suggestion Engine — Types
// =============================================================================

import type { ContentType, ContentAngle, ContentPlatform } from '@/types'

// ---------------------------------------------------------------------------
// Output Style — determines the tone of the entire pack
// ---------------------------------------------------------------------------

export type OutputStyle =
  | 'mainstream'   // broadly appealing, safe-ish, still punchy
  | 'savage'       // maximum edge, no filter, very direct
  | 'safer'        // toned down, works for cautious brands
  | 'editorial'    // journalistic framing, punchy but credible
  | 'deadpan'      // dry humour — says wild things with a straight face
  | 'mock_serious' // treats absurd thing with complete gravitas

// ---------------------------------------------------------------------------
// Format slugs — 13 specific output formats
// ---------------------------------------------------------------------------

export type ContentFormatSlug =
  | 'breaking_alert'
  | 'meme_concept'
  | 'carousel_concept'
  | 'reel_concept'
  | 'story_poll'
  | 'hot_take'
  | 'controversial_take'
  | 'caption_options'
  | 'comment_bait_cta'
  | 'visual_direction'
  | 'safer_version'
  | 'sharper_version'
  | 'savage_version'

// ---------------------------------------------------------------------------
// Structured output shapes — one per format
// ---------------------------------------------------------------------------

export interface BreakingAlert {
  headline: string
  subtext: string
  urgency_level: 'breaking' | 'developing' | 'just_in'
  hashtags: string[]
}

export interface MemeConcept {
  template_description: string
  top_text: string
  bottom_text: string
  visual_vibe: string
  why_it_works: string
}

export interface CarouselConcept {
  hook_slide: string
  slides: string[]
  final_slide_cta: string
}

export interface ReelConcept {
  hook: string
  script_beats: string[]
  cta: string
  audio_vibe: string
  suggested_duration_seconds: number
}

export interface StoryPoll {
  question: string
  option_a: string
  option_b: string
  context_sticker: string
}

export interface CaptionOptions {
  short: string
  medium: string
  long: string
}

export interface ControversialTake {
  take: string
  risk_level: 'low' | 'medium' | 'high'
}

export interface CommentBaitCta {
  primary: string
  alternative: string
}

export interface VisualDirection {
  aesthetic: string
  color_mood: string
  composition: string
  text_overlay_suggestion: string
  reference_vibes: string[]
}

export interface StyledVariant {
  content: string
  format_type: string
}

export interface SavageVariant {
  content: string
  format_type: string
  content_warning: string | null
}

// ---------------------------------------------------------------------------
// Full content pack output
// ---------------------------------------------------------------------------

export interface ContentPackOutput {
  breaking_alert: BreakingAlert
  meme_concept: MemeConcept
  carousel_concept: CarouselConcept
  reel_concept: ReelConcept
  story_poll: StoryPoll
  hot_take: string
  controversial_take: ControversialTake
  caption_options: CaptionOptions
  comment_bait_cta: CommentBaitCta
  visual_direction: VisualDirection
  safer_version: StyledVariant
  sharper_version: StyledVariant
  savage_version: SavageVariant
}

// ---------------------------------------------------------------------------
// Generation request
// ---------------------------------------------------------------------------

export interface GenerateContentPackRequest {
  cluster_id: string
  org_id: string
  output_style?: OutputStyle
  model?: string
  user_id?: string
  /** Skip dedup check and always regenerate — costs tokens, use intentionally */
  force_regenerate?: boolean
}

export interface RegenerateFormatRequest {
  idea_id: string
  org_id: string
  format_slug: ContentFormatSlug
  output_style?: OutputStyle
  custom_instruction?: string
  user_id?: string
}

// ---------------------------------------------------------------------------
// Generation result
// ---------------------------------------------------------------------------

export interface ContentPackResult {
  pack_id: string
  cluster_id: string
  org_id: string
  output_style: OutputStyle
  ideas: GeneratedIdea[]
  tokens_used: number
  estimated_cost_usd: number
  generation_time_ms: number
  model_used: string
  prompt_version: string
  /** True when result was returned from cache (no tokens consumed) */
  cached?: boolean
}

export interface GeneratedIdea {
  id: string
  format_slug: ContentFormatSlug
  type: ContentType
  angle: ContentAngle
  platform: ContentPlatform
  content: string
  hook: string | null
  cta: string | null
  structured_data: Record<string, unknown>
  output_style: OutputStyle
}

// ---------------------------------------------------------------------------
// Cluster context fed to OpenAI (lean — no raw items)
// ---------------------------------------------------------------------------

export interface ClusterContext {
  title: string
  summary: string | null
  category: string | null
  keywords: string[]
  entities: Array<{ name: string; type: string }>
  source_count: number
  age_hours: number
  // Scores from scoring engine
  virality_score: number
  outrage_fit_score: number
  meme_potential_score: number
  debate_potential_score: number
  urgency_score: number
  brand_safety_score: number
  total_priority_score: number
  recommended_action: string
}

// ---------------------------------------------------------------------------
// Cost tracking
// ---------------------------------------------------------------------------

export interface TokenUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  estimated_cost_usd: number
}

// ---------------------------------------------------------------------------
// Format → ContentType + ContentAngle mapping
// ---------------------------------------------------------------------------

export const FORMAT_META: Record<
  ContentFormatSlug,
  { type: ContentType; angle: ContentAngle; platform: ContentPlatform }
> = {
  breaking_alert:    { type: 'headline',   angle: 'outrage',        platform: 'all' },
  meme_concept:      { type: 'meme_idea',  angle: 'humor',          platform: 'instagram' },
  carousel_concept:  { type: 'post_copy',  angle: 'informational',  platform: 'instagram' },
  reel_concept:      { type: 'reel_idea',  angle: 'reaction',       platform: 'instagram' },
  story_poll:        { type: 'poll',        angle: 'reaction',       platform: 'instagram' },
  hot_take:          { type: 'hook',        angle: 'hot_take',       platform: 'all' },
  controversial_take:{ type: 'post_copy',  angle: 'controversial',  platform: 'twitter' },
  caption_options:   { type: 'caption',    angle: 'outrage',        platform: 'instagram' },
  comment_bait_cta:  { type: 'post_copy',  angle: 'outrage',        platform: 'all' },
  visual_direction:  { type: 'post_copy',  angle: 'informational',  platform: 'instagram' },
  safer_version:     { type: 'caption',    angle: 'informational',  platform: 'all' },
  sharper_version:   { type: 'hook',       angle: 'outrage',        platform: 'all' },
  savage_version:    { type: 'post_copy',  angle: 'controversial',  platform: 'all' },
}
