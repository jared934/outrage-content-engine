// =============================================================================
// OUTRAGE Content Pack — User Prompt Builder
//
// Builds the user-turn prompt for a full 13-format content pack.
// Only uses cluster-level data (title, summary, scores, keywords, entities)
// — never raw source item bodies, to keep prompts lean and cost-efficient.
// =============================================================================

import type { ClusterContext, OutputStyle } from '../content.types'

export const CONTENT_PACK_PROMPT_VERSION = '1.2.0'

// Style-specific tone modifier appended to the task description
const STYLE_MODIFIERS: Record<OutputStyle, string> = {
  mainstream:   'Make everything broadly appealing — viral potential from relatability and timing, not from risk.',
  savage:       'Go full savage. No filter. Maximum edge. Call it exactly what it is. Screenshot-worthy at all costs.',
  safer:        'Keep it smart and cheeky but leave out anything that could start a PR fire. Punchy, not spicy.',
  editorial:    'Write with journalistic confidence. Specific, authoritative, culturally fluent. Think byline energy.',
  deadpan:      'Completely dry. No excitement. Treat everything like a weather report. Let the absurdity speak for itself.',
  mock_serious: 'Full mock-documentary energy. Treat this like a global geopolitical crisis. Play it completely straight.',
}

export function buildContentPackPrompt(
  cluster: ClusterContext,
  style: OutputStyle,
): string {
  const styleNote = STYLE_MODIFIERS[style]
  const ageLabel =
    cluster.age_hours < 1 ? 'less than 1 hour ago' :
    cluster.age_hours < 24 ? `${Math.round(cluster.age_hours)} hours ago` :
    `${Math.round(cluster.age_hours / 24)} days ago`

  const entityLine = cluster.entities.length > 0
    ? cluster.entities.slice(0, 6).map((e) => `${e.name} (${e.type})`).join(', ')
    : 'none identified'

  const scoreBlock = [
    `virality: ${cluster.virality_score}/100`,
    `outrage fit: ${cluster.outrage_fit_score}/100`,
    `meme potential: ${cluster.meme_potential_score}/100`,
    `debate potential: ${cluster.debate_potential_score}/100`,
    `urgency: ${cluster.urgency_score}/100`,
    `brand safety: ${cluster.brand_safety_score}/100`,
    `overall priority: ${cluster.total_priority_score}/100`,
    `recommended action: ${cluster.recommended_action}`,
  ].join(' | ')

  return `Generate a full OUTRAGE content pack for the trending topic below.

TONE DIRECTIVE: ${styleNote}

---
TREND BRIEF
Title: ${cluster.title}
Summary: ${cluster.summary ?? 'No summary available — infer from title and keywords.'}
Category: ${cluster.category ?? 'unclassified'}
Emerged: ${ageLabel}
Sources covering it: ${cluster.source_count}
Keywords: ${cluster.keywords.slice(0, 12).join(', ')}
Key entities: ${entityLine}
Score profile: ${scoreBlock}
---

Generate ALL 13 formats below. Every format must reflect the tone directive above — not just the copy style, but the entire framing, angle, and attitude.

Respond ONLY with valid JSON matching this EXACT schema. No markdown. No explanation. Just the JSON object.

{
  "breaking_alert": {
    "headline": "<punchy 1-line headline — 60 chars max>",
    "subtext": "<1-2 sentences of context — what happened, why it matters to the audience>",
    "urgency_level": "<one of: breaking | developing | just_in>",
    "hashtags": ["<hashtag1>", "<hashtag2>"]
  },
  "meme_concept": {
    "template_description": "<describe the meme format/template to use — specific and visual>",
    "top_text": "<top text — short, direct>",
    "bottom_text": "<bottom text — the punchline>",
    "visual_vibe": "<describe the visual aesthetic in 1 sentence — e.g. 'distracted boyfriend energy', 'Twitter screenshot style'>",
    "why_it_works": "<1 sentence on why this lands for the audience>"
  },
  "carousel_concept": {
    "hook_slide": "<slide 1 text — this must stop the scroll. Short. Bold.>",
    "slides": ["<slide 2 content>", "<slide 3>", "<slide 4>", "<slide 5 — optional: can be 2-5 slides>"],
    "final_slide_cta": "<last slide CTA — drives saves/shares/comments>"
  },
  "reel_concept": {
    "hook": "<first 2 seconds — what appears on screen that stops the scroll. Text + action.>",
    "script_beats": ["<beat 1>", "<beat 2>", "<beat 3 — 3-5 beats total, each 1 sentence>"],
    "cta": "<end of video CTA — max 1 sentence>",
    "audio_vibe": "<suggested audio style or specific trending sound type>",
    "suggested_duration_seconds": <number between 15 and 60>
  },
  "story_poll": {
    "question": "<question that forces people to pick a side — max 60 chars>",
    "option_a": "<option A — max 24 chars>",
    "option_b": "<option B — max 24 chars>",
    "context_sticker": "<short text for a GIF/emoji context sticker — max 30 chars>"
  },
  "hot_take": "<single sentence take — direct, controversial, punchy. 140 chars max. No hedging.>",
  "controversial_take": {
    "take": "<a take that will divide the comments — 1-3 sentences. Must be defensible but spicy.>",
    "risk_level": "<one of: low | medium | high>"
  },
  "caption_options": {
    "short": "<under 50 chars — for stories or standalone with strong visual>",
    "medium": "<50-150 chars — IG feed caption with 1-2 hashtags>",
    "long": "<150-300 chars — full IG caption with hook, body, hashtags, CTA>"
  },
  "comment_bait_cta": {
    "primary": "<the main comment-driving CTA — direct, specific, creates urgency to respond>",
    "alternative": "<a backup CTA with different angle>"
  },
  "visual_direction": {
    "aesthetic": "<overall visual style — e.g. 'chaotic Twitter screenshot collage', 'clean editorial bold type'>",
    "color_mood": "<color palette direction — e.g. 'high contrast black and red', 'washed-out muted tones'>",
    "composition": "<what the image/video frame looks like — describe layout and elements>",
    "text_overlay_suggestion": "<specific text to overlay on the visual>",
    "reference_vibes": ["<cultural reference 1>", "<cultural reference 2>"]
  },
  "safer_version": {
    "content": "<a toned-down but still engaging version of the hot take or caption — works for risk-averse posting>",
    "format_type": "<what format this works best as: caption | hook | headline>"
  },
  "sharper_version": {
    "content": "<a more direct, edgier version — same idea but harder-hitting>",
    "format_type": "<what format this works best as: hook | headline | post_copy>"
  },
  "savage_version": {
    "content": "<absolutely no filter version — honest, ruthless, and completely on point>",
    "format_type": "<what format this works best as: hook | post_copy | caption>",
    "content_warning": "<null if fine, or 1 sentence flagging what makes this risky>"
  }
}`
}
