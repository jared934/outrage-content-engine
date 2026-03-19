// POST /api/content/generate
// Triggers a full 13-format AI content pack for a trend cluster.
// Requires a valid session (authenticated user) and a high-enough trend score.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'
import { generatePack, MIN_SCORE_TO_GENERATE } from '@/lib/content/content-pack.service'
import type { GenerateContentPackRequest, OutputStyle } from '@/lib/content/content.types'

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = createServiceClient()
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Partial<GenerateContentPackRequest>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { cluster_id, org_id, output_style, model } = body

  if (!cluster_id || !org_id) {
    return NextResponse.json({ error: 'cluster_id and org_id are required' }, { status: 400 })
  }

  // Validate output_style if provided
  const validStyles: OutputStyle[] = ['mainstream', 'savage', 'safer', 'editorial', 'deadpan', 'mock_serious']
  if (output_style && !validStyles.includes(output_style)) {
    return NextResponse.json({ error: `Invalid output_style. Must be one of: ${validStyles.join(', ')}` }, { status: 400 })
  }

  // Verify user is a member of the org
  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', org_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden — not a member of this org' }, { status: 403 })
  }

  // Viewers cannot generate content
  if ((membership as Record<string, string>).role === 'viewer') {
    return NextResponse.json({ error: 'Forbidden — viewers cannot generate content' }, { status: 403 })
  }

  try {
    const result = await generatePack({
      cluster_id,
      org_id,
      output_style: output_style ?? 'mainstream',
      model,
      user_id: user.id,
    })

    return NextResponse.json({
      ok: true,
      pack_id:           result.pack_id,
      cluster_id:        result.cluster_id,
      output_style:      result.output_style,
      ideas_generated:   result.ideas.length,
      tokens_used:       result.tokens_used,
      estimated_cost_usd: result.estimated_cost_usd,
      generation_time_ms: result.generation_time_ms,
      model_used:        result.model_used,
      ideas:             result.ideas,
    })

  } catch (err) {
    const msg = String(err)

    // Known business-logic errors → 400/402
    if (msg.includes('below minimum threshold')) {
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    if (msg.includes('Rate limit')) {
      return NextResponse.json({ error: msg }, { status: 429 })
    }
    if (msg.includes('not found')) {
      return NextResponse.json({ error: msg }, { status: 404 })
    }

    console.error('[content/generate] Unexpected error:', err)
    return NextResponse.json({ error: 'Content generation failed. Please try again.' }, { status: 500 })
  }
}

// GET /api/content/generate?cluster_id=...&org_id=...
// Returns existing packs for a cluster (no generation)
export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const cluster_id = searchParams.get('cluster_id')
  const org_id     = searchParams.get('org_id')

  if (!cluster_id || !org_id) {
    return NextResponse.json({ error: 'cluster_id and org_id are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('content_packs')
    .select('*, content_ideas(id, format_slug, type, content, output_style, is_saved, created_at)')
    .eq('cluster_id', cluster_id)
    .eq('org_id', org_id)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, packs: data ?? [] })
}
