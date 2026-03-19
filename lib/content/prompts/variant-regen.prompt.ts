// =============================================================================
// OUTRAGE Content Engine — Variant Regeneration Prompt Builder
//
// Used when a user wants to regenerate a single format, optionally with a
// different style or a custom instruction (e.g. "make it funnier", "shorter").
// =============================================================================

import type { ContentFormatSlug, OutputStyle, ContentPackOutput } from '../content.types'

export const VARIANT_REGEN_PROMPT_VERSION = '1.1.0'

// Schema hint per format — tells the model what shape to return
const FORMAT_SCHEMAS: Record<ContentFormatSlug, string> = {
  breaking_alert: `{
  "headline": "<punchy headline — 60 chars max>",
  "subtext": "<1-2 sentences of context>",
  "urgency_level": "<breaking | developing | just_in>",
  "hashtags": ["<tag1>", "<tag2>"]
}`,
  meme_concept: `{
  "template_description": "<describe the meme template>",
  "top_text": "<top text>",
  "bottom_text": "<bottom text — the punchline>",
  "visual_vibe": "<visual aesthetic description>",
  "why_it_works": "<why this lands>"
}`,
  carousel_concept: `{
  "hook_slide": "<scroll-stopping slide 1>",
  "slides": ["<slide 2>", "<slide 3>", "<slide 4>"],
  "final_slide_cta": "<last slide CTA>"
}`,
  reel_concept: `{
  "hook": "<first 2 seconds description>",
  "script_beats": ["<beat 1>", "<beat 2>", "<beat 3>"],
  "cta": "<end CTA>",
  "audio_vibe": "<suggested audio>",
  "suggested_duration_seconds": <15-60>
}`,
  story_poll: `{
  "question": "<question — 60 chars max>",
  "option_a": "<option A — 24 chars max>",
  "option_b": "<option B — 24 chars max>",
  "context_sticker": "<sticker text — 30 chars max>"
}`,
  hot_take: `"<single sentence take — 140 chars max>"`,
  controversial_take: `{
  "take": "<1-3 sentence divisive take>",
  "risk_level": "<low | medium | high>"
}`,
  caption_options: `{
  "short": "<under 50 chars>",
  "medium": "<50-150 chars>",
  "long": "<150-300 chars with hashtags>"
}`,
  comment_bait_cta: `{
  "primary": "<main comment CTA>",
  "alternative": "<backup CTA>"
}`,
  visual_direction: `{
  "aesthetic": "<visual style>",
  "color_mood": "<color palette direction>",
  "composition": "<frame layout>",
  "text_overlay_suggestion": "<overlay text>",
  "reference_vibes": ["<ref 1>", "<ref 2>"]
}`,
  safer_version: `{
  "content": "<safer but still punchy version>",
  "format_type": "<caption | hook | headline>"
}`,
  sharper_version: `{
  "content": "<harder-hitting version>",
  "format_type": "<hook | headline | post_copy>"
}`,
  savage_version: `{
  "content": "<no filter version>",
  "format_type": "<hook | post_copy | caption>",
  "content_warning": "<null or 1-sentence risk flag>"
}`,
}

export function buildVariantRegenPrompt(params: {
  format_slug: ContentFormatSlug
  original_content: string
  cluster_title: string
  cluster_summary: string | null
  output_style: OutputStyle
  custom_instruction: string | null
  original_structured: Record<string, unknown> | null
}): string {
  const { format_slug, original_content, cluster_title, cluster_summary, output_style, custom_instruction, original_structured } = params

  const formatLabel = format_slug.replace(/_/g, ' ').toUpperCase()
  const originalDisplay = original_structured && Object.keys(original_structured).length > 0
    ? `Original structured output:\n${JSON.stringify(original_structured, null, 2)}`
    : `Original content:\n"${original_content}"`

  const instruction = custom_instruction
    ? `Custom instruction: ${custom_instruction}`
    : `Regenerate with a fresh take — different angle, same quality bar.`

  return `Regenerate the ${formatLabel} format for this OUTRAGE content piece.

Trend: "${cluster_title}"
Summary: ${cluster_summary ?? 'N/A'}
Output style: ${output_style.toUpperCase()}

${originalDisplay}

${instruction}

Rules:
- Keep the OUTRAGE brand voice throughout
- Apply the ${output_style} style directive fully
- Do NOT repeat the original — this must be a genuinely different take
- Hit the same quality bar or higher

Respond ONLY with valid JSON matching this exact schema:
${FORMAT_SCHEMAS[format_slug]}`
}
