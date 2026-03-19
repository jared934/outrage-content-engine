import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { WebhookScoringPayload } from '@/types'
import type { TrendScoreResult } from '@/lib/scoring/scoring.types'

function verifyWebhookSecret(req: NextRequest): boolean {
  return req.headers.get('x-webhook-secret') === process.env.N8N_WEBHOOK_SECRET
}

// Extended payload that n8n can send after running the scoring engine
interface ExtendedScoringPayload extends WebhookScoringPayload {
  full_score?: TrendScoreResult
}

export async function POST(req: NextRequest) {
  if (!verifyWebhookSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: ExtendedScoringPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const clusterId = body.cluster_id ?? body.trend_id
  const { scores, full_score } = body

  if (!clusterId || (!scores && !full_score)) {
    return NextResponse.json(
      { error: 'cluster_id (or trend_id) and scores (or full_score) required' },
      { status: 400 },
    )
  }

  const supabase = createServiceClient()
  const now = new Date().toISOString()

  // Build the insert row — supports both legacy minimal payloads and new full scores
  const scoreRow: Record<string, unknown> = {
    cluster_id: clusterId,
    scored_at: now,
  }

  if (full_score) {
    // Full scoring engine result — map all fields
    scoreRow.viral_potential             = full_score.virality_score
    scoreRow.brand_fit                   = full_score.outrage_fit_score
    scoreRow.urgency                     = full_score.urgency_score
    scoreRow.controversy_level           = full_score.debate_potential_score
    scoreRow.audience_relevance          = full_score.instagram_shareability_score
    scoreRow.overall_score               = full_score.total_priority_score
    scoreRow.outrage_fit_score           = full_score.outrage_fit_score
    scoreRow.meme_potential_score        = full_score.meme_potential_score
    scoreRow.debate_potential_score      = full_score.debate_potential_score
    scoreRow.shelf_life_score            = full_score.shelf_life_score
    scoreRow.visual_potential_score      = full_score.visual_potential_score
    scoreRow.reel_potential_score        = full_score.reel_potential_score
    scoreRow.instagram_shareability_score = full_score.instagram_shareability_score
    scoreRow.brand_safety_score          = full_score.brand_safety_score
    scoreRow.total_priority_score        = full_score.total_priority_score
    scoreRow.recommended_action          = full_score.recommended_action
    scoreRow.score_explanations          = full_score.score_explanations
    scoreRow.recommended_formats         = full_score.recommended_formats
    scoreRow.reasoning                   = full_score.score_explanations.summary
    scoreRow.scoring_model               = `outrage-engine-v${full_score.scoring_engine_version}`
    scoreRow.scoring_engine_version      = full_score.scoring_engine_version
    scoreRow.scored_at                   = full_score.scored_at ?? now
    scoreRow.raw_response                = full_score as unknown as Record<string, unknown>
  } else if (scores) {
    // Legacy minimal payload from n8n (backward-compatible)
    scoreRow.viral_potential             = scores.virality_score    ?? null
    scoreRow.audience_relevance          = scores.relevance_score   ?? null
    scoreRow.brand_fit                   = scores.brand_fit_score   ?? null
    scoreRow.overall_score               = scores.overall_score
    scoreRow.reasoning                   = scores.reasoning ?? scores.scoring_reasoning ?? null
  }

  const { error: scoreError } = await supabase.from('trend_scores').insert(scoreRow)

  if (scoreError) {
    console.error('[scoring webhook] Score insert error:', scoreError)
    return NextResponse.json({ error: scoreError.message }, { status: 500 })
  }

  // Keep overall_score on trend_clusters in sync
  const newOverall = full_score?.total_priority_score ?? scores?.overall_score
  if (newOverall !== undefined) {
    const { error: clusterError } = await supabase
      .from('trend_clusters')
      .update({ overall_score: newOverall, updated_at: now })
      .eq('id', clusterId)

    if (clusterError) {
      console.error('[scoring webhook] Cluster update error:', clusterError)
    }
  }

  // Auto-fire notification on high-priority trends
  const priority = full_score?.total_priority_score ?? scores?.overall_score ?? 0
  if (priority >= 75) {
    const action = full_score?.recommended_action
    const title =
      action === 'post_now'
        ? `🔥 Post NOW — priority ${Math.round(priority)}/100`
        : `High-priority trend detected (${Math.round(priority)}/100)`

    await supabase.from('notifications').insert({
      type: 'trend_alert',
      severity: priority >= 85 ? 'critical' : 'high',
      title,
      message: full_score?.score_explanations.summary ?? scores?.reasoning ?? scores?.scoring_reasoning ?? null,
      cluster_id: clusterId,
    })
  }

  return NextResponse.json({
    ok: true,
    cluster_id: clusterId,
    overall_score: newOverall,
    recommended_action: full_score?.recommended_action ?? null,
  })
}
