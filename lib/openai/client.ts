import OpenAI from 'openai'

// Singleton — module-level, only instantiated server-side
let _client: OpenAI | null = null

export function getOpenAIClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return _client
}

export const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

// ─── Trend Scoring Prompt ─────────────────────────────────────────────────────

export function buildScoringPrompt(trend: {
  title: string
  summary: string | null
  category: string | null
  keywords: string[]
  source_count: number
}): string {
  return `You are a viral content strategist for OUTRAGE, a pop culture / meme-news reaction brand targeting Gen Z and Millennials.

Score the following trending topic on 5 dimensions (0-100 each):
- viral_potential: How likely is this to go viral? How much is the internet talking?
- brand_fit: How well does this fit the OUTRAGE brand (celebrity drama, memes, pop culture, sports beefs, etc.)?
- urgency: How time-sensitive is this? Will it be irrelevant in 24h?
- controversy_level: How controversial or outrage-inducing is this topic?
- audience_relevance: How relevant is this to OUTRAGE's core 18-34 audience?

Topic: "${trend.title}"
Summary: ${trend.summary ?? 'N/A'}
Category: ${trend.category ?? 'unknown'}
Keywords: ${trend.keywords.join(', ')}
Source count: ${trend.source_count}

Respond ONLY with valid JSON in this exact format:
{
  "viral_potential": <0-100>,
  "brand_fit": <0-100>,
  "urgency": <0-100>,
  "controversy_level": <0-100>,
  "audience_relevance": <0-100>,
  "overall_score": <weighted average>,
  "scoring_reasoning": "<1-2 sentences explaining the score>"
}`
}

// ─── Content Suggestion Prompt ────────────────────────────────────────────────

export function buildSuggestionsPrompt(trend: {
  title: string
  summary: string | null
  category: string | null
  keywords: string[]
  brand_system_prompt?: string
}): string {
  const voiceInstruction =
    trend.brand_system_prompt ??
    'You are the OUTRAGE brand voice — bold, sarcastic, unapologetic, and chronically online.'

  return `${voiceInstruction}

Generate 8 content ideas for the following trending topic. Mix formats.

Topic: "${trend.title}"
Summary: ${trend.summary ?? 'N/A'}
Category: ${trend.category ?? 'unknown'}
Keywords: ${trend.keywords.join(', ')}

Generate content ideas across these types: headline, hook, caption, meme_idea, reel_idea, tweet, poll, post_copy.

Respond ONLY with valid JSON array:
[
  {
    "type": "headline|hook|caption|meme_idea|reel_idea|tweet|poll|post_copy",
    "content": "<the actual content/copy>",
    "angle": "outrage|humor|informational|reaction|hot_take",
    "platform": "instagram|tiktok|twitter|youtube|threads|all"
  }
]`
}
