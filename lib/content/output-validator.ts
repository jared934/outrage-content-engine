// =============================================================================
// OUTRAGE Content Engine — Output Validator
//
// Zod schema for the full ContentPackOutput + individual format schemas.
// Handles parsing, validation, and graceful fallbacks when OpenAI returns
// malformed or partial JSON.
// =============================================================================

import { z } from 'zod'
import type { ContentPackOutput, ContentFormatSlug } from './content.types'

// ---------------------------------------------------------------------------
// Individual format schemas
// ---------------------------------------------------------------------------

export const BreakingAlertSchema = z.object({
  headline:      z.string().max(120),
  subtext:       z.string().max(400),
  urgency_level: z.enum(['breaking', 'developing', 'just_in']),
  hashtags:      z.array(z.string().max(50)).max(8).default([]),
})

export const MemeConceptSchema = z.object({
  template_description: z.string().max(300),
  top_text:             z.string().max(120),
  bottom_text:          z.string().max(120),
  visual_vibe:          z.string().max(200),
  why_it_works:         z.string().max(300),
})

export const CarouselConceptSchema = z.object({
  hook_slide:      z.string().max(150),
  slides:          z.array(z.string().max(200)).min(2).max(6),
  final_slide_cta: z.string().max(150),
})

export const ReelConceptSchema = z.object({
  hook:                      z.string().max(200),
  script_beats:              z.array(z.string().max(200)).min(2).max(5),
  cta:                       z.string().max(120),
  audio_vibe:                z.string().max(200),
  suggested_duration_seconds: z.number().int().min(10).max(90).default(30),
})

export const StoryPollSchema = z.object({
  question:        z.string().max(100),
  option_a:        z.string().max(32),
  option_b:        z.string().max(32),
  context_sticker: z.string().max(50),
})

export const ControversialTakeSchema = z.object({
  take:       z.string().max(400),
  risk_level: z.enum(['low', 'medium', 'high']),
})

export const CaptionOptionsSchema = z.object({
  short:  z.string().max(80),
  medium: z.string().max(200),
  long:   z.string().max(450),
})

export const CommentBaitCtaSchema = z.object({
  primary:     z.string().max(180),
  alternative: z.string().max(180),
})

export const VisualDirectionSchema = z.object({
  aesthetic:               z.string().max(200),
  color_mood:              z.string().max(150),
  composition:             z.string().max(250),
  text_overlay_suggestion: z.string().max(150),
  reference_vibes:         z.array(z.string().max(80)).max(4).default([]),
})

export const StyledVariantSchema = z.object({
  content:     z.string().max(400),
  format_type: z.string().max(40),
})

export const SavageVariantSchema = z.object({
  content:         z.string().max(400),
  format_type:     z.string().max(40),
  content_warning: z.string().max(200).nullable().default(null),
})

// ---------------------------------------------------------------------------
// Full content pack schema
// ---------------------------------------------------------------------------

export const ContentPackSchema = z.object({
  breaking_alert:     BreakingAlertSchema,
  meme_concept:       MemeConceptSchema,
  carousel_concept:   CarouselConceptSchema,
  reel_concept:       ReelConceptSchema,
  story_poll:         StoryPollSchema,
  hot_take:           z.string().max(200),
  controversial_take: ControversialTakeSchema,
  caption_options:    CaptionOptionsSchema,
  comment_bait_cta:   CommentBaitCtaSchema,
  visual_direction:   VisualDirectionSchema,
  safer_version:      StyledVariantSchema,
  sharper_version:    StyledVariantSchema,
  savage_version:     SavageVariantSchema,
})

export type ValidatedContentPack = z.infer<typeof ContentPackSchema>

// ---------------------------------------------------------------------------
// Per-format schemas map (for individual regen validation)
// ---------------------------------------------------------------------------

export const FORMAT_SCHEMAS: Record<ContentFormatSlug, z.ZodTypeAny> = {
  breaking_alert:     BreakingAlertSchema,
  meme_concept:       MemeConceptSchema,
  carousel_concept:   CarouselConceptSchema,
  reel_concept:       ReelConceptSchema,
  story_poll:         StoryPollSchema,
  hot_take:           z.string().max(200),
  controversial_take: ControversialTakeSchema,
  caption_options:    CaptionOptionsSchema,
  comment_bait_cta:   CommentBaitCtaSchema,
  visual_direction:   VisualDirectionSchema,
  safer_version:      StyledVariantSchema,
  sharper_version:    StyledVariantSchema,
  savage_version:     SavageVariantSchema,
}

// ---------------------------------------------------------------------------
// Parse helpers
// ---------------------------------------------------------------------------

/**
 * Strips markdown code fences that OpenAI sometimes wraps around JSON.
 */
function stripMarkdownFences(raw: string): string {
  return raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

export interface ParseResult<T> {
  data: T | null
  error: string | null
  partial: boolean
}

/**
 * Parse and validate a full content pack response from OpenAI.
 * On validation errors, attempts a lenient parse that returns what it can.
 */
export function parseContentPack(raw: string): ParseResult<ValidatedContentPack> {
  const cleaned = stripMarkdownFences(raw)

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch (e) {
    return { data: null, error: `JSON parse failed: ${String(e)}`, partial: false }
  }

  const result = ContentPackSchema.safeParse(parsed)
  if (result.success) {
    return { data: result.data, error: null, partial: false }
  }

  // Attempt lenient parse — use partial() to accept whatever we got
  const lenient = ContentPackSchema.partial().safeParse(parsed)
  if (lenient.success && Object.keys(lenient.data).length >= 8) {
    // Enough formats present — fill missing with fallbacks
    const complete = applyFallbacks(parsed as Record<string, unknown>, lenient.data as Partial<ValidatedContentPack>)
    return { data: complete, error: result.error.message, partial: true }
  }

  return {
    data: null,
    error: `Validation failed: ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
    partial: false,
  }
}

/**
 * Parse a single-format regeneration response.
 */
export function parseFormatRegen<T>(
  raw: string,
  formatSlug: ContentFormatSlug,
): ParseResult<T> {
  const cleaned = stripMarkdownFences(raw)
  const schema = FORMAT_SCHEMAS[formatSlug]

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    // hot_take may be returned as a plain string — try that
    if (formatSlug === 'hot_take' && cleaned.startsWith('"')) {
      try {
        parsed = JSON.parse(cleaned)
      } catch {
        parsed = cleaned.replace(/^"|"$/g, '')
      }
    } else {
      return { data: null, error: 'JSON parse failed', partial: false }
    }
  }

  const result = schema.safeParse(parsed)
  if (result.success) return { data: result.data as T, error: null, partial: false }
  return { data: null, error: result.error.message, partial: false }
}

// ---------------------------------------------------------------------------
// Fallback values — used when partial parse succeeds
// ---------------------------------------------------------------------------

function applyFallbacks(
  raw: Record<string, unknown>,
  partial: Partial<ValidatedContentPack>,
): ValidatedContentPack {
  return {
    breaking_alert: partial.breaking_alert ?? {
      headline: String((raw.breaking_alert as Record<string, unknown>)?.headline ?? 'Story developing'),
      subtext: 'Details are emerging. Stay tuned.',
      urgency_level: 'developing',
      hashtags: [],
    },
    meme_concept: partial.meme_concept ?? {
      template_description: 'Classic reaction meme format',
      top_text: 'When you see the news',
      bottom_text: 'Your reaction here',
      visual_vibe: 'Reaction meme energy',
      why_it_works: 'Universal reaction format',
    },
    carousel_concept: partial.carousel_concept ?? {
      hook_slide: 'Here\'s what you need to know 👇',
      slides: ['Context here', 'More context', 'The takeaway'],
      final_slide_cta: 'Save this for later.',
    },
    reel_concept: partial.reel_concept ?? {
      hook: 'POV: you just found out',
      script_beats: ['Set the scene', 'Drop the information', 'React'],
      cta: 'Comment your thoughts below.',
      audio_vibe: 'Trending audio',
      suggested_duration_seconds: 30,
    },
    story_poll: partial.story_poll ?? {
      question: 'What do you think?',
      option_a: 'Team Yes',
      option_b: 'Team No',
      context_sticker: '👀',
    },
    hot_take: partial.hot_take ?? 'This is the take nobody asked for but everybody needed.',
    controversial_take: partial.controversial_take ?? {
      take: 'The discourse around this says more about us than about them.',
      risk_level: 'low',
    },
    caption_options: partial.caption_options ?? {
      short: 'We need to talk.',
      medium: 'The internet is having a moment and we have thoughts.',
      long: 'Full breakdown in the comments. Drop your hot take below. 👇',
    },
    comment_bait_cta: partial.comment_bait_cta ?? {
      primary: 'Tell us your take in the comments 👇',
      alternative: 'Tag someone who needs to see this.',
    },
    visual_direction: partial.visual_direction ?? {
      aesthetic: 'Clean, bold typography on contrast background',
      color_mood: 'Black and white with accent colour',
      composition: 'Text-forward, minimal imagery',
      text_overlay_suggestion: 'Key quote or stat from the story',
      reference_vibes: ['Twitter screenshot style', 'Breaking news graphic'],
    },
    safer_version: partial.safer_version ?? {
      content: 'The conversation around this topic is one worth having.',
      format_type: 'caption',
    },
    sharper_version: partial.sharper_version ?? {
      content: 'Nobody is saying the quiet part loud — so we will.',
      format_type: 'hook',
    },
    savage_version: partial.savage_version ?? {
      content: 'This is exactly what it looks like and everyone knows it.',
      format_type: 'post_copy',
      content_warning: null,
    },
  }
}

// ---------------------------------------------------------------------------
// Content extraction — get the primary display string from any format
// ---------------------------------------------------------------------------

export function extractPrimaryContent(
  slug: ContentFormatSlug,
  data: Record<string, unknown>,
): string {
  switch (slug) {
    case 'breaking_alert':    return String((data as Record<string, string>).headline ?? '')
    case 'meme_concept':      return `${data.top_text} / ${data.bottom_text}`
    case 'carousel_concept':  return String((data as Record<string, string>).hook_slide ?? '')
    case 'reel_concept':      return String((data as Record<string, string>).hook ?? '')
    case 'story_poll':        return `${data.question}\nA: ${data.option_a} | B: ${data.option_b}`
    case 'hot_take':          return typeof data === 'string' ? data : String(data)
    case 'controversial_take':return String((data as Record<string, string>).take ?? '')
    case 'caption_options':   return String((data as Record<string, string>).medium ?? '')
    case 'comment_bait_cta':  return String((data as Record<string, string>).primary ?? '')
    case 'visual_direction':  return String((data as Record<string, string>).aesthetic ?? '')
    case 'safer_version':     return String((data as Record<string, string>).content ?? '')
    case 'sharper_version':   return String((data as Record<string, string>).content ?? '')
    case 'savage_version':    return String((data as Record<string, string>).content ?? '')
    default:                  return ''
  }
}

export function extractHook(slug: ContentFormatSlug, data: Record<string, unknown>): string | null {
  switch (slug) {
    case 'carousel_concept':  return String((data as Record<string, string>).hook_slide ?? '')
    case 'reel_concept':      return String((data as Record<string, string>).hook ?? '')
    case 'story_poll':        return String((data as Record<string, string>).question ?? '')
    default:                  return null
  }
}

export function extractCta(slug: ContentFormatSlug, data: Record<string, unknown>): string | null {
  switch (slug) {
    case 'carousel_concept':  return String((data as Record<string, string>).final_slide_cta ?? '')
    case 'reel_concept':      return String((data as Record<string, string>).cta ?? '')
    case 'comment_bait_cta':  return String((data as Record<string, string>).primary ?? '')
    default:                  return null
  }
}
