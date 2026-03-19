// =============================================================================
// OUTRAGE Brand Voice — Rewrite Tool Prompts
//
// Each tool has a precise directive that transforms the text in a specific way.
// The system prompt injects the brand voice + any org-specific settings.
// User prompt describes exactly what to do and what NOT to do.
// =============================================================================

import type { RewriteTool } from './rewrite.types'

export const REWRITE_PROMPT_VERSION = '1.0.0'

// ---------------------------------------------------------------------------
// OUTRAGE brand voice context (injected into every system prompt)
// ---------------------------------------------------------------------------

const BASE_BRAND_CONTEXT = `You are the OUTRAGE brand voice editor — an expert copywriter who lives on the internet and thinks like a content strategist.

OUTRAGE brand DNA:
- Punchy. Fast. No filler.
- Internet-native. Chronically online.
- Meme-news hybrid — pop culture meets breaking news.
- Not corporate. Not bloated. Not try-hard.
- Built for Instagram shareability first.
- Talks like the group chat, thinks like a strategist.
- Short sentences hit harder than long ones.
- The comment section is the product — write to provoke responses.

RULES:
- Never add em dashes in casual copy.
- Never use "it's giving", "slay", "periodt" — those are dead.
- No corporate hedging. No "as an AI". No explanation of what you changed.
- Return ONLY the rewritten text. Nothing else. No preamble. No explanation.
- If a joke needs explaining, it needs killing.`

// ---------------------------------------------------------------------------
// Build system prompt with optional brand settings
// ---------------------------------------------------------------------------

export interface BrandSettingsContext {
  name?: string
  voice_description?: string | null
  tone_keywords?: string[]
  avoid_keywords?: string[]
  content_pillars?: string[]
}

export function buildRewriteSystemPrompt(brand?: BrandSettingsContext | null): string {
  let prompt = BASE_BRAND_CONTEXT

  if (brand?.voice_description) {
    prompt += `\n\nBRAND VOICE BRIEF:\n${brand.voice_description}`
  }
  if (brand?.tone_keywords?.length) {
    prompt += `\n\nPREFERRED TONE WORDS: ${brand.tone_keywords.join(', ')}`
  }
  if (brand?.avoid_keywords?.length) {
    prompt += `\n\nAVOID THESE WORDS/PHRASES: ${brand.avoid_keywords.join(', ')}`
  }
  if (brand?.content_pillars?.length) {
    prompt += `\n\nBRAND CONTENT PILLARS: ${brand.content_pillars.join(', ')}`
  }

  return prompt
}

// ---------------------------------------------------------------------------
// Per-tool user prompts
// ---------------------------------------------------------------------------

const TOOL_DIRECTIVES: Record<RewriteTool, (text: string, instruction?: string) => string> = {

  make_sharper: (text) => `Make this sharper. Cut every word that doesn't earn its place. Tighten the sentence structure. The idea should hit harder in fewer words. Keep the core meaning — just strip the fat.

Original:
${text}

Rewritten:`,

  make_funnier: (text) => `Make this funnier. Add wit, a well-timed punchline, or a wry observation — without sacrificing the core point. The humour should feel earned, not forced. No obvious jokes. No "lol" or "😂" style writing.

Original:
${text}

Rewritten:`,

  make_savage: (text) => `Make this savage. No filter. Maximum edge. Say the quiet part loud. This version has zero hedging, zero softening, and zero apology. It should make someone either deeply agree or deeply uncomfortable. Both outcomes are fine.

Original:
${text}

Rewritten:`,

  make_safer: (text) => `Make this safer for posting without killing the voice. Reduce the controversy level while keeping the punchy OUTRAGE tone. The version should still feel smart and engaging — just not something that would end up in a brand safety report.

Original:
${text}

Rewritten:`,

  make_mainstream: (text) => `Make this more broadly appealing. Right now it might be too niche, too inside-baseball, or too edge-specific. Rewrite it so it lands for a wider audience — people who aren't already deep in the drama or subculture. Still punchy. Just more universally relatable.

Original:
${text}

Rewritten:`,

  make_editorial: (text) => `Rewrite this with more editorial confidence. Think: a journalist who is also chronically online. The framing should feel authoritative and credible, but still punchy and fast. Use specific language, not vague. Lead with the most interesting part. No clickbait softeners.

Original:
${text}

Rewritten:`,

  make_meme_native: (text) => `Rewrite this in fully internet-native language. Meme grammar, internet cadence, chronically online phrasing. It should feel like it was written in a group chat or as a tweet that people save. Keep the meaning but transform the delivery. Do not use dated slang.

Original:
${text}

Rewritten:`,

  make_more_shareable: (text) => `Optimise this for saves and forwards. Ask yourself: why would someone screenshot this? What makes it worth sending to a friend at 1am? Rework it to maximise that impulse — could be a stronger take, a more universal truth, or a more quotable line.

Original:
${text}

Rewritten:`,

  shorten_headline: (text) => `Shorten this headline to its maximum-impact minimum-word form. Every word must justify its existence. If you can cut it without losing meaning, cut it. Target: 6-10 words that hit harder than the original 15. The shortened version should feel like the only version that ever existed.

Original:
${text}

Rewritten:`,

  improve_hook: (text) => `Rewrite this to improve the hook — the opening line that determines whether someone keeps reading or scrolls past. The hook should create curiosity, provoke a reaction, or drop the audience directly into the tension. No wind-up. No preamble. Start with the thing that matters.

Original:
${text}

Rewritten:`,

  reduce_cringe: (text) => `Strip the cringe from this. Remove try-hard language, over-explanation, anything that feels like it's trying too hard to be cool or relatable. Cut corporate buzzwords, hollow superlatives, and any word that a real person would never say out loud. What's left should feel effortless.

Original:
${text}

Rewritten:`,

  reduce_repetition: (text) => `Remove the repetition from this. Find every idea that appears more than once and eliminate the weaker instance. Tighten sentences that circle back to the same point. The goal is to say each thing exactly once — and say it better than the original did.

Original:
${text}

Rewritten:`,
}

// With custom instruction override
function withCustomInstruction(base: string, customInstruction?: string): string {
  if (!customInstruction) return base
  return base.replace(
    /\nOriginal:/,
    `\n\nAdditional instruction from user: ${customInstruction}\n\nOriginal:`,
  )
}

export function buildRewriteUserPrompt(
  tool: RewriteTool,
  text: string,
  customInstruction?: string,
): string {
  const directive = TOOL_DIRECTIVES[tool]
  const prompt = directive(text, customInstruction)
  return withCustomInstruction(prompt, customInstruction)
}
