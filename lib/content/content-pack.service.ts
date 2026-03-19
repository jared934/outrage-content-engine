// =============================================================================
// OUTRAGE Content Engine — Content Pack Orchestrator
//
// Fetches all required data from Supabase, calls the generator, saves results.
// This is the main entry point — API routes and n8n webhooks call this.
//
// Flow:
//   1. Fetch cluster + latest score + entities + brand settings
//   2. Enforce min-score threshold (cost guard)
//   3. Check org daily rate limit
//   4. Create content_packs row (status=generating)
//   5. Call generateContentPack()
//   6. Save all 13 format outputs to content_ideas
//   7. Update content_packs status → complete
//   8. Return ContentPackResult
// =============================================================================

import { createServiceClient } from '@/lib/supabase/server'
import { generateContentPack, checkDailyLimit, CONTENT_MODELS } from './content-generator.service'
import { regenerateFormat } from './content-generator.service'
import {
  FORMAT_META,
  type GenerateContentPackRequest,
  type RegenerateFormatRequest,
  type ContentPackResult,
  type ClusterContext,
  type OutputStyle,
  type ContentFormatSlug,
} from './content.types'
import { extractPrimaryContent, extractHook, extractCta } from './output-validator'

export const MIN_SCORE_TO_GENERATE = 35  // don't burn tokens on low-priority trends

// ---------------------------------------------------------------------------
// Helper — build ClusterContext from DB rows
// ---------------------------------------------------------------------------

function buildClusterContext(
  cluster: Record<string, unknown>,
  score: Record<string, unknown> | null,
  entities: Array<Record<string, unknown>>,
): ClusterContext {
  const firstSeen = new Date(cluster.first_seen_at as string)
  const ageHours = (Date.now() - firstSeen.getTime()) / 3_600_000

  return {
    title:               String(cluster.title ?? ''),
    summary:             cluster.summary ? String(cluster.summary) : null,
    category:            cluster.category ? String(cluster.category) : null,
    keywords:            (cluster.keywords as string[]) ?? [],
    entities:            entities.map((e) => ({ name: String(e.name), type: String(e.type) })),
    source_count:        Number(cluster.source_count ?? 0),
    age_hours:           Math.round(ageHours * 10) / 10,
    virality_score:      Number(score?.total_priority_score ?? score?.viral_potential ?? cluster.overall_score ?? 0),
    outrage_fit_score:   Number(score?.outrage_fit_score ?? score?.brand_fit ?? 50),
    meme_potential_score: Number(score?.meme_potential_score ?? 50),
    debate_potential_score: Number(score?.debate_potential_score ?? score?.controversy_level ?? 50),
    urgency_score:       Number(score?.urgency_score ?? score?.urgency ?? 50),
    brand_safety_score:  Number(score?.brand_safety_score ?? 60),
    total_priority_score: Number(score?.total_priority_score ?? cluster.overall_score ?? 0),
    recommended_action:  String(score?.recommended_action ?? 'post_soon'),
  }
}

// ---------------------------------------------------------------------------
// Main: generatePack
// ---------------------------------------------------------------------------

export async function generatePack(
  req: GenerateContentPackRequest,
): Promise<ContentPackResult> {
  const supabase = createServiceClient()
  const style: OutputStyle = req.output_style ?? 'mainstream'
  const model = req.model ?? CONTENT_MODELS.default

  // 1. Fetch cluster
  const { data: cluster, error: clusterErr } = await supabase
    .from('trend_clusters')
    .select('*')
    .eq('id', req.cluster_id)
    .eq('org_id', req.org_id)
    .single()

  if (clusterErr || !cluster) {
    throw new Error(`Cluster not found: ${req.cluster_id}`)
  }

  // 2. Min score guard
  const overallScore = Number((cluster as Record<string, unknown>).overall_score ?? 0)
  if (overallScore < MIN_SCORE_TO_GENERATE) {
    throw new Error(
      `Cluster score (${overallScore}) is below minimum threshold (${MIN_SCORE_TO_GENERATE}). ` +
      `Run the scoring engine first or manually override.`,
    )
  }

  // 3. Deduplication check — return existing pack if generated in last 24h
  const oneDayAgo = new Date(Date.now() - 86_400_000).toISOString()
  const { data: existingPack } = await supabase
    .from('content_packs')
    .select('id, status, created_at, tokens_used, estimated_cost_usd, generation_time_ms, model_used, prompt_version')
    .eq('cluster_id', req.cluster_id)
    .eq('org_id', req.org_id)
    .eq('output_style', style)
    .eq('status', 'complete')
    .gte('created_at', oneDayAgo)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingPack && !req.force_regenerate) {
    // Return existing ideas instead of burning tokens
    const existingRow = existingPack as Record<string, unknown>
    const packId = existingRow.id as string

    const { data: existingIdeas } = await supabase
      .from('content_ideas')
      .select('id, format_slug, type, angle, platform, content, hook, cta, structured_data, output_style')
      .eq('pack_id', packId)
      .eq('org_id', req.org_id)
      .order('created_at', { ascending: true })

    return {
      pack_id:            packId,
      cluster_id:         req.cluster_id,
      org_id:             req.org_id,
      output_style:       style,
      ideas:              (existingIdeas ?? []).map((idea: Record<string, unknown>) => ({
        id:              String(idea.id),
        format_slug:     String(idea.format_slug) as ContentFormatSlug,
        type:            idea.type as never,
        angle:           idea.angle as never,
        platform:        idea.platform as never,
        content:         String(idea.content),
        hook:            idea.hook ? String(idea.hook) : null,
        cta:             idea.cta  ? String(idea.cta)  : null,
        structured_data: idea.structured_data as Record<string, unknown>,
        output_style:    String(idea.output_style) as OutputStyle,
      })),
      tokens_used:        existingRow.tokens_used as number,
      estimated_cost_usd: existingRow.estimated_cost_usd as number,
      generation_time_ms: existingRow.generation_time_ms as number,
      model_used:         existingRow.model_used as string,
      prompt_version:     existingRow.prompt_version as string,
      cached:             true,
    }
  }

  // 4. Rate limit check
  const { data: org } = await supabase
    .from('organizations')
    .select('plan')
    .eq('id', req.org_id)
    .single()

  const { allowed, packs_today, limit, reason } = await checkDailyLimit(
    req.org_id,
    (org as Record<string, unknown>)?.plan as string ?? 'free',
  )
  if (!allowed) {
    throw new Error(`Rate limit exceeded: ${reason} (${packs_today}/${limit} packs today)`)
  }

  // 5. Fetch latest score + entities
  const [{ data: scoreRow }, { data: entityRows }, { data: brandRow }] = await Promise.all([
    supabase
      .from('trend_scores')
      .select('*')
      .eq('cluster_id', req.cluster_id)
      .order('scored_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('trend_cluster_entities')
      .select('trend_entities(name, type)')
      .eq('cluster_id', req.cluster_id)
      .limit(10),
    supabase
      .from('brand_settings')
      .select('name, voice_description, tone_keywords, avoid_keywords, content_pillars')
      .eq('org_id', req.org_id)
      .maybeSingle(),
  ])

  const entities = (entityRows ?? []).flatMap((row: Record<string, unknown>) => {
    const e = row.trend_entities as Record<string, unknown> | null
    return e ? [{ name: String(e.name), type: String(e.type) }] : []
  })

  // 6. Build context
  const clusterCtx = buildClusterContext(
    cluster as Record<string, unknown>,
    scoreRow as Record<string, unknown> | null,
    entities,
  )

  // 7. Create content_packs row
  const { data: packRow, error: packCreateErr } = await supabase
    .from('content_packs')
    .insert({
      cluster_id:   req.cluster_id,
      org_id:       req.org_id,
      output_style: style,
      model_used:   model,
      status:       'generating',
      created_by:   req.user_id ?? null,
    })
    .select('id')
    .single()

  if (packCreateErr || !packRow) {
    throw new Error(`Failed to create content_packs row: ${packCreateErr?.message}`)
  }

  const packId = (packRow as Record<string, unknown>).id as string
  const startTime = Date.now()

  try {
    // 8. Generate
    const genResult = await generateContentPack({
      cluster:  clusterCtx,
      style,
      model,
      org_id:   req.org_id,
    })

    const generationTimeMs = Date.now() - startTime

    // 9. Build content_ideas rows from all 13 formats
    const formatSlugs = Object.keys(FORMAT_META) as ContentFormatSlug[]
    const pack = genResult.pack as unknown as Record<string, unknown>

    const ideaRows = formatSlugs.map((slug) => {
      const meta = FORMAT_META[slug]
      const rawData = pack[slug] as Record<string, unknown>
      const primaryContent = extractPrimaryContent(slug, rawData ?? {})
      const hook = extractHook(slug, rawData ?? {})
      const cta  = extractCta(slug, rawData ?? {})

      return {
        cluster_id:       req.cluster_id,
        org_id:           req.org_id,
        pack_id:          packId,
        format_slug:      slug,
        output_style:     style,
        type:             meta.type,
        angle:            meta.angle,
        platform:         meta.platform,
        content:          primaryContent,
        hook:             hook ?? null,
        cta:              cta  ?? null,
        structured_data:  rawData ?? {},
        model_used:       genResult.model_used,
        prompt_template_id: null,
        generated_by:     `outrage-engine-v${genResult.prompt_version}`,
        created_by:       req.user_id ?? null,
      }
    })

    const { data: insertedIdeas, error: ideasErr } = await supabase
      .from('content_ideas')
      .insert(ideaRows)
      .select('id, format_slug, type, angle, platform, content, hook, cta, structured_data, output_style')

    if (ideasErr) {
      throw new Error(`Failed to save content ideas: ${ideasErr.message}`)
    }

    // 10. Update content_packs → complete
    await supabase
      .from('content_packs')
      .update({
        status:              'complete',
        tokens_used:         genResult.usage.total_tokens,
        estimated_cost_usd:  genResult.usage.estimated_cost_usd,
        generation_time_ms:  generationTimeMs,
        prompt_version:      genResult.prompt_version,
        updated_at:          new Date().toISOString(),
      })
      .eq('id', packId)

    return {
      pack_id:           packId,
      cluster_id:        req.cluster_id,
      org_id:            req.org_id,
      output_style:      style,
      ideas:             (insertedIdeas ?? []).map((idea: Record<string, unknown>) => ({
        id:              String(idea.id),
        format_slug:     String(idea.format_slug) as ContentFormatSlug,
        type:            idea.type as never,
        angle:           idea.angle as never,
        platform:        idea.platform as never,
        content:         String(idea.content),
        hook:            idea.hook ? String(idea.hook) : null,
        cta:             idea.cta  ? String(idea.cta)  : null,
        structured_data: idea.structured_data as Record<string, unknown>,
        output_style:    String(idea.output_style) as OutputStyle,
      })),
      tokens_used:       genResult.usage.total_tokens,
      estimated_cost_usd: genResult.usage.estimated_cost_usd,
      generation_time_ms: generationTimeMs,
      model_used:        genResult.model_used,
      prompt_version:    genResult.prompt_version,
    }

  } catch (err) {
    // Mark pack as failed
    await supabase
      .from('content_packs')
      .update({ status: 'failed', error_message: String(err), updated_at: new Date().toISOString() })
      .eq('id', packId)
    throw err
  }
}

// ---------------------------------------------------------------------------
// Regenerate a single format idea
// ---------------------------------------------------------------------------

export async function regenFormat(
  req: RegenerateFormatRequest,
): Promise<{ idea_id: string; content: string; structured_data: Record<string, unknown> }> {
  const supabase = createServiceClient()

  // Fetch the existing idea + its cluster
  const { data: idea, error: ideaErr } = await supabase
    .from('content_ideas')
    .select('*, trend_clusters(title, summary)')
    .eq('id', req.idea_id)
    .eq('org_id', req.org_id)
    .single()

  if (ideaErr || !idea) {
    throw new Error(`Content idea not found: ${req.idea_id}`)
  }

  const ideaRow = idea as Record<string, unknown>
  const cluster = (ideaRow.trend_clusters as Record<string, unknown>) ?? {}
  const style: OutputStyle = (req.output_style ?? ideaRow.output_style ?? 'mainstream') as OutputStyle

  const result = await regenerateFormat({
    format_slug:         req.format_slug,
    original_content:    String(ideaRow.content ?? ''),
    original_structured: ideaRow.structured_data as Record<string, unknown> | null,
    cluster_title:       String(cluster.title ?? ''),
    cluster_summary:     cluster.summary ? String(cluster.summary) : null,
    output_style:        style,
    custom_instruction:  req.custom_instruction ?? null,
  })

  // Save as a new idea row (variant), link parent via pack_id or as sibling
  const { data: newIdea, error: saveErr } = await supabase
    .from('content_ideas')
    .insert({
      cluster_id:      ideaRow.cluster_id,
      org_id:          req.org_id,
      pack_id:         ideaRow.pack_id ?? null,
      format_slug:     req.format_slug,
      output_style:    style,
      type:            FORMAT_META[req.format_slug].type,
      angle:           FORMAT_META[req.format_slug].angle,
      platform:        FORMAT_META[req.format_slug].platform,
      content:         result.primary_content,
      structured_data: result.data,
      model_used:      result.model_used,
      generated_by:    `regen-v${result.prompt_version}`,
      created_by:      req.user_id ?? null,
    })
    .select('id')
    .single()

  if (saveErr || !newIdea) {
    throw new Error(`Failed to save regenerated idea: ${saveErr?.message}`)
  }

  return {
    idea_id:        String((newIdea as Record<string, unknown>).id),
    content:        result.primary_content,
    structured_data: result.data,
  }
}

// ---------------------------------------------------------------------------
// Fetch all packs for a cluster
// ---------------------------------------------------------------------------

export async function getPacksForCluster(clusterId: string, orgId: string) {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('content_packs')
    .select('*')
    .eq('cluster_id', clusterId)
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

// ---------------------------------------------------------------------------
// Fetch ideas for a pack
// ---------------------------------------------------------------------------

export async function getIdeasForPack(packId: string, orgId: string) {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('content_ideas')
    .select('*')
    .eq('pack_id', packId)
    .eq('org_id', orgId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}
