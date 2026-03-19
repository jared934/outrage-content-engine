// =============================================================================
// OUTRAGE Content Engine — Core OpenAI Generation Service
//
// Handles all direct OpenAI calls with:
//   - Retry logic (up to 3 attempts, exponential backoff)
//   - Cost tracking (token counting + USD estimate)
//   - Model fallback (gpt-4o → gpt-4o-mini on parse failure)
//   - Rate-limiting safeguards (per-org daily cap check)
//   - Prompt versioning (version embedded in every record)
// =============================================================================

import { getOpenAIClient } from '@/lib/openai/client'
import { getSystemPrompt } from './prompts/outrage-system.prompt'
import { buildContentPackPrompt, CONTENT_PACK_PROMPT_VERSION } from './prompts/content-pack.prompt'
import { buildVariantRegenPrompt, VARIANT_REGEN_PROMPT_VERSION } from './prompts/variant-regen.prompt'
import { parseContentPack, parseFormatRegen, FORMAT_SCHEMAS } from './output-validator'
import type {
  ClusterContext,
  OutputStyle,
  ContentPackOutput,
  ContentFormatSlug,
  TokenUsage,
} from './content.types'

// ---------------------------------------------------------------------------
// Model config
// ---------------------------------------------------------------------------

export const CONTENT_MODELS = {
  default:  'gpt-4o-mini',    // fast, cheap — good for most packs
  quality:  'gpt-4o',         // slower, better — use for high-priority trends
  fallback: 'gpt-4o-mini',   // used if primary model fails validation
} as const

// Cost per 1M tokens (USD) — update as OpenAI pricing changes
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'gpt-4o':        { input: 2.50,  output: 10.00 },
  'gpt-4o-mini':   { input: 0.15,  output: 0.60  },
  'gpt-4.1':       { input: 2.00,  output: 8.00  },
  'gpt-4.1-mini':  { input: 0.40,  output: 1.60  },
}

export const MAX_PACK_TOKENS = 3000     // max output tokens per pack
export const MAX_REGEN_TOKENS = 800     // max output tokens per format regen
export const RETRY_DELAYS_MS  = [1000, 2500, 5000]  // exponential backoff

// ---------------------------------------------------------------------------
// Cost calculation
// ---------------------------------------------------------------------------

export function estimateCost(
  promptTokens: number,
  completionTokens: number,
  model: string,
): number {
  const rates = MODEL_COSTS[model] ?? MODEL_COSTS['gpt-4o-mini']
  return (promptTokens * rates.input + completionTokens * rates.output) / 1_000_000
}

// ---------------------------------------------------------------------------
// Sleep helper (for retry backoff)
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ---------------------------------------------------------------------------
// Per-org daily rate limit check
// ---------------------------------------------------------------------------

export interface RateLimitCheck {
  allowed: boolean
  packs_today: number
  limit: number
  reason?: string
}

export async function checkDailyLimit(orgId: string, plan: string = 'free'): Promise<RateLimitCheck> {
  const limits: Record<string, number> = { free: 10, pro: 100, enterprise: 1000 }
  const limit = limits[plan] ?? 10

  try {
    const { createServiceClient } = await import('@/lib/supabase/server')
    const supabase = createServiceClient()

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { count } = await supabase
      .from('content_packs')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .gte('created_at', todayStart.toISOString())

    const packsToday = count ?? 0
    if (packsToday >= limit) {
      return { allowed: false, packs_today: packsToday, limit, reason: `Daily limit (${limit}) reached for ${plan} plan` }
    }
    return { allowed: true, packs_today: packsToday, limit }
  } catch {
    // If we can't check, allow but log
    console.warn('[content-generator] Could not check rate limit for org', orgId)
    return { allowed: true, packs_today: 0, limit }
  }
}

// ---------------------------------------------------------------------------
// Generate a full content pack
// ---------------------------------------------------------------------------

export interface GeneratePackOptions {
  cluster: ClusterContext
  style: OutputStyle
  model?: string
  org_id: string
}

export interface GeneratePackResult {
  pack: ContentPackOutput
  usage: TokenUsage
  model_used: string
  prompt_version: string
  attempts: number
  partial: boolean
}

export async function generateContentPack(
  opts: GeneratePackOptions,
): Promise<GeneratePackResult> {
  const { cluster, style, org_id } = opts
  const primaryModel = opts.model ?? CONTENT_MODELS.default

  const systemPrompt = getSystemPrompt(style)
  const userPrompt   = buildContentPackPrompt(cluster, style)

  let lastError = ''
  let totalPromptTokens = 0
  let totalCompletionTokens = 0

  for (let attempt = 0; attempt < 3; attempt++) {
    // On last attempt, fall back to cheaper model if different
    const model = attempt === 2 && primaryModel !== CONTENT_MODELS.fallback
      ? CONTENT_MODELS.fallback
      : primaryModel

    if (attempt > 0) {
      await sleep(RETRY_DELAYS_MS[attempt - 1])
      console.log(`[content-generator] Retry ${attempt}/2 for org=${org_id}, model=${model}`)
    }

    try {
      const openai = getOpenAIClient()
      const response = await openai.chat.completions.create({
        model,
        temperature: 0.85,    // creative but not unhinged
        max_tokens:  MAX_PACK_TOKENS,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt   },
        ],
      })

      const rawContent = response.choices[0]?.message?.content ?? ''
      const usage = response.usage

      totalPromptTokens     = usage?.prompt_tokens     ?? 0
      totalCompletionTokens = usage?.completion_tokens ?? 0

      const { data, error, partial } = parseContentPack(rawContent)

      if (data) {
        const estimated_cost_usd = estimateCost(totalPromptTokens, totalCompletionTokens, model)
        return {
          pack: data as unknown as ContentPackOutput,
          usage: {
            prompt_tokens: totalPromptTokens,
            completion_tokens: totalCompletionTokens,
            total_tokens: totalPromptTokens + totalCompletionTokens,
            estimated_cost_usd,
          },
          model_used: model,
          prompt_version: CONTENT_PACK_PROMPT_VERSION,
          attempts: attempt + 1,
          partial: partial ?? false,
        }
      }

      lastError = error ?? 'Unknown parse error'
      console.warn(`[content-generator] Parse failed (attempt ${attempt + 1}): ${lastError}`)

    } catch (err) {
      lastError = String(err)
      console.error(`[content-generator] OpenAI error (attempt ${attempt + 1}):`, err)
    }
  }

  throw new Error(`Content pack generation failed after 3 attempts. Last error: ${lastError}`)
}

// ---------------------------------------------------------------------------
// Regenerate a single format
// ---------------------------------------------------------------------------

export interface RegenFormatOptions {
  format_slug: ContentFormatSlug
  original_content: string
  original_structured: Record<string, unknown> | null
  cluster_title: string
  cluster_summary: string | null
  output_style: OutputStyle
  custom_instruction: string | null
  model?: string
}

export interface RegenFormatResult {
  data: Record<string, unknown>
  primary_content: string
  usage: TokenUsage
  model_used: string
  prompt_version: string
}

export async function regenerateFormat(
  opts: RegenFormatOptions,
): Promise<RegenFormatResult> {
  const model = opts.model ?? CONTENT_MODELS.default
  const systemPrompt = getSystemPrompt(opts.output_style)
  const userPrompt   = buildVariantRegenPrompt({
    format_slug:        opts.format_slug,
    original_content:   opts.original_content,
    cluster_title:      opts.cluster_title,
    cluster_summary:    opts.cluster_summary,
    output_style:       opts.output_style,
    custom_instruction: opts.custom_instruction,
    original_structured: opts.original_structured,
  })

  const { extractPrimaryContent } = await import('./output-validator')

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(RETRY_DELAYS_MS[attempt - 1])

    try {
      const openai = getOpenAIClient()
      const response = await openai.chat.completions.create({
        model,
        temperature: 0.9,
        max_tokens:  MAX_REGEN_TOKENS,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt   },
        ],
      })

      const rawContent = response.choices[0]?.message?.content ?? ''
      const usage = response.usage

      const { data, error } = parseFormatRegen<Record<string, unknown>>(rawContent, opts.format_slug)

      if (data) {
        const primary = extractPrimaryContent(opts.format_slug, data)
        const estimated_cost_usd = estimateCost(
          usage?.prompt_tokens ?? 0,
          usage?.completion_tokens ?? 0,
          model,
        )
        return {
          data,
          primary_content: primary,
          usage: {
            prompt_tokens:     usage?.prompt_tokens ?? 0,
            completion_tokens: usage?.completion_tokens ?? 0,
            total_tokens:      usage?.total_tokens ?? 0,
            estimated_cost_usd,
          },
          model_used:     model,
          prompt_version: VARIANT_REGEN_PROMPT_VERSION,
        }
      }

      console.warn(`[content-generator] Regen parse failed (attempt ${attempt + 1}): ${error}`)

    } catch (err) {
      console.error(`[content-generator] Regen OpenAI error (attempt ${attempt + 1}):`, err)
    }
  }

  throw new Error(`Format regeneration failed after 3 attempts`)
}
