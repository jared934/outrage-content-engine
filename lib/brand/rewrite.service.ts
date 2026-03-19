// =============================================================================
// OUTRAGE Brand Voice — Rewrite Service
//
// Calls OpenAI to apply one of the 12 rewrite tools, saves to DB, returns result.
// =============================================================================

import { getOpenAIClient, DEFAULT_MODEL } from '@/lib/openai/client'
import { createServiceClient } from '@/lib/supabase/server'
import {
  buildRewriteSystemPrompt,
  buildRewriteUserPrompt,
  REWRITE_PROMPT_VERSION,
  type BrandSettingsContext,
} from './rewrite-prompts'
import { estimateCost } from '@/lib/content/content-generator.service'
import type { RewriteRequest, RewriteResult } from './rewrite.types'

export const REWRITE_MODEL  = DEFAULT_MODEL
export const REWRITE_MAX_TOKENS = 600

// ---------------------------------------------------------------------------
// Strip markdown fences / leading labels that models sometimes add
// ---------------------------------------------------------------------------

function clean(raw: string): string {
  return raw
    .replace(/^```[\s\S]*?\n/, '')   // opening fence
    .replace(/\n```$/, '')           // closing fence
    .replace(/^Rewritten:\s*/i, '')  // label echo
    .replace(/^Here('s| is)[^:]*:\s*/i, '')
    .trim()
}

// ---------------------------------------------------------------------------
// Fetch org brand settings from DB
// ---------------------------------------------------------------------------

async function fetchBrandSettings(orgId: string): Promise<BrandSettingsContext | null> {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('brand_settings')
      .select('name, voice_description, tone_keywords, avoid_keywords, content_pillars')
      .eq('org_id', orgId)
      .maybeSingle()
    return data as BrandSettingsContext | null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Core rewrite — calls OpenAI and returns cleaned text
// ---------------------------------------------------------------------------

async function callRewrite(
  tool: RewriteRequest['tool'],
  originalText: string,
  customInstruction: string | undefined,
  brand: BrandSettingsContext | null,
  model: string,
): Promise<{ text: string; promptTokens: number; completionTokens: number }> {
  const openai = getOpenAIClient()

  const systemPrompt = buildRewriteSystemPrompt(brand)
  const userPrompt   = buildRewriteUserPrompt(tool, originalText, customInstruction)

  const response = await openai.chat.completions.create({
    model,
    temperature: 0.8,
    max_tokens:  REWRITE_MAX_TOKENS,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt   },
    ],
  })

  const raw = response.choices[0]?.message?.content ?? ''
  return {
    text:             clean(raw),
    promptTokens:     response.usage?.prompt_tokens     ?? 0,
    completionTokens: response.usage?.completion_tokens ?? 0,
  }
}

// ---------------------------------------------------------------------------
// Main export — rewrite + save to DB
// ---------------------------------------------------------------------------

export async function rewriteText(req: RewriteRequest): Promise<RewriteResult> {
  const model = req.model ?? REWRITE_MODEL
  const brand = await fetchBrandSettings(req.org_id)

  let lastError = ''
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, attempt * 1500))
    try {
      const { text, promptTokens, completionTokens } = await callRewrite(
        req.tool,
        req.original_text,
        req.custom_instruction,
        brand,
        model,
      )

      if (!text) { lastError = 'Empty response'; continue }

      const estimated_cost_usd = estimateCost(promptTokens, completionTokens, model)
      const tokens_used        = promptTokens + completionTokens

      // Persist to brand_rewrites
      const supabase = createServiceClient()
      const { data: row, error } = await supabase
        .from('brand_rewrites')
        .insert({
          org_id:                  req.org_id,
          cluster_id:              req.cluster_id  ?? null,
          idea_id:                 req.idea_id     ?? null,
          original_text:           req.original_text,
          rewritten_text:          text,
          tool:                    req.tool,
          custom_instruction:      req.custom_instruction ?? null,
          model_used:              model,
          tokens_used,
          estimated_cost_usd,
          prompt_version:          REWRITE_PROMPT_VERSION,
          brand_settings_snapshot: brand ?? {},
        })
        .select('id')
        .single()

      if (error) {
        console.error('[rewrite.service] DB save error:', error)
        // Still return the result even if save failed
      }

      return {
        id:              (row as Record<string, string> | null)?.id ?? crypto.randomUUID(),
        original_text:   req.original_text,
        rewritten_text:  text,
        tool:            req.tool,
        tokens_used,
        estimated_cost_usd,
        model_used:      model,
        prompt_version:  REWRITE_PROMPT_VERSION,
      }

    } catch (err) {
      lastError = String(err)
      console.error(`[rewrite.service] Attempt ${attempt + 1} failed:`, err)
    }
  }

  throw new Error(`Rewrite failed after 3 attempts. Last error: ${lastError}`)
}

// ---------------------------------------------------------------------------
// History queries
// ---------------------------------------------------------------------------

export async function getRewriteHistory(
  orgId: string,
  filters: { tool?: string; is_saved?: boolean; search?: string; limit?: number } = {},
) {
  const supabase = createServiceClient()
  let query = supabase
    .from('brand_rewrites')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 50)

  if (filters.tool)     query = query.eq('tool', filters.tool)
  if (filters.is_saved) query = query.eq('is_saved', true)
  if (filters.search) {
    query = query.or(
      `original_text.ilike.%${filters.search}%,rewritten_text.ilike.%${filters.search}%`,
    )
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function toggleSaveRewrite(id: string, saved: boolean) {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('brand_rewrites')
    .update({ is_saved: saved })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function markRewriteAccepted(id: string) {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('brand_rewrites')
    .update({ is_accepted: true })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteRewrite(id: string) {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('brand_rewrites')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}
