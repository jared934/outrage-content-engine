import { getOpenAIClient } from '@/lib/openai/client'
import { createClient } from '@/lib/supabase/client'
import type { PunchlineSuggestion, PunchlineRequest, PunchlineResponse, QuickAction } from './meme.types'

const PUNCHLINE_PROMPT_VERSION = '1.0.0'

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM = `You are the meme copywriter for OUTRAGE — a high-impact social media brand known for:
- Punchy, viral captions that make people stop scrolling
- Impact font energy even when not using it
- Hot takes, absurdist humor, relatable rage, and cultural commentary
- Memes that make people laugh AND share

Your captions are concise, bold, and made for the internet. You understand meme culture deeply.
Always return valid JSON.`

// ---------------------------------------------------------------------------
// Quick action directives
// ---------------------------------------------------------------------------

function quickActionDirective(action: QuickAction | undefined): string {
  if (!action) return ''
  const map: Record<QuickAction, string> = {
    funnier:    'Make it funnier — add absurdist humor, unexpected wordplay, or a comedic escalation.',
    savage:     'Make it more savage — sharper edge, more brutal honesty, less filter.',
    mainstream: 'Make it more mainstream-friendly — broader appeal, less niche, still funny.',
    safer:      'Make it safer — keep the humor but remove anything edgy or potentially offensive.',
    less_cringe:'Reduce cringe — keep the energy but make it feel less try-hard or forced.',
    shorter:    'Make it shorter — tighter, punchier. Every word earns its place.',
    regenerate: 'Generate fresh alternatives — different angles, different comedic styles.',
  }
  return `\n\nQUICK ACTION: ${map[action]}`
}

// ---------------------------------------------------------------------------
// Build prompt
// ---------------------------------------------------------------------------

function buildPrompt(req: PunchlineRequest): string {
  const parts: string[] = []

  if (req.topic) {
    parts.push(`Topic/trend: "${req.topic}"`)
  }

  if (req.current_top || req.current_bottom) {
    parts.push(`Current captions:\n- Top: "${req.current_top ?? '(none)'}"\n- Bottom: "${req.current_bottom ?? '(none)'}"`)
  }

  const n = req.num_suggestions ?? 5
  parts.push(`Generate ${n} meme caption options for this topic.${quickActionDirective(req.quick_action)}`)

  parts.push(`
Return a JSON object:
{
  "suggestions": [
    {
      "top_text": "...",
      "bottom_text": "..." or null,
      "concept": "one-line comedic angle description"
    }
  ]
}

Rules:
- top_text: 1-8 words, ALL CAPS energy (you can uppercase)
- bottom_text: 1-8 words or null for single-panel memes
- concept: describes the comedic angle in 5-10 words
- Vary the angles — don't give 5 versions of the same joke
- Each suggestion should feel distinct`)

  return parts.join('\n\n')
}

// ---------------------------------------------------------------------------
// Main service function
// ---------------------------------------------------------------------------

export async function generatePunchlines(req: PunchlineRequest): Promise<PunchlineResponse> {
  // If cluster_id provided, fetch topic from DB
  let topic = req.topic
  if (req.cluster_id && !topic) {
    const supabase = createClient()
    const { data } = await supabase
      .from('trend_clusters')
      .select('title, summary')
      .eq('id', req.cluster_id)
      .single()
    if (data) {
      topic = `${data.title}${data.summary ? ` — ${data.summary}` : ''}`
    }
  }

  const prompt = buildPrompt({ ...req, topic })

  const openai   = getOpenAIClient()
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user',   content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.9,
    max_tokens: 800,
  })

  const tokensUsed = response.usage?.total_tokens ?? 0
  const raw = response.choices[0]?.message?.content ?? '{}'

  let parsed: { suggestions?: PunchlineSuggestion[] }
  try {
    parsed = JSON.parse(raw)
  } catch {
    parsed = { suggestions: [] }
  }

  const suggestions: PunchlineSuggestion[] = (parsed.suggestions ?? []).map((s, i) => ({
    id:          `punchline_${Date.now()}_${i}`,
    top_text:    typeof s.top_text === 'string'    ? s.top_text.trim()    : '',
    bottom_text: typeof s.bottom_text === 'string' ? s.bottom_text.trim() : null,
    concept:     typeof s.concept === 'string'     ? s.concept.trim()     : '',
  })).filter((s) => s.top_text.length > 0)

  return { suggestions, tokens_used: tokensUsed }
}

export { PUNCHLINE_PROMPT_VERSION }
