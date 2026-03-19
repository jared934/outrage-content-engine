// POST /api/webhooks/performance
// Receives post performance metrics from n8n (scraped from social platforms).
// Upserts to performance_metrics table.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyWebhookSecret } from '@/lib/n8n/auth'
import { completeRunFromCallback } from '@/lib/n8n/trigger.service'
import type { PerformanceCallbackPayload } from '@/lib/n8n/types'

export async function POST(req: NextRequest) {
  if (!verifyWebhookSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: PerformanceCallbackPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { org_id, run_id, status, metrics, error } = body

  if (!org_id || !Array.isArray(metrics)) {
    return NextResponse.json({ error: 'org_id and metrics[] required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const rows = metrics.map((m) => ({
    post_result_id:   m.post_result_id,
    platform:         m.platform,
    external_post_id: m.external_post_id,
    views:            m.views            ?? null,
    likes:            m.likes            ?? null,
    comments:         m.comments         ?? null,
    shares:           m.shares           ?? null,
    saves:            m.saves            ?? null,
    reach:            m.reach            ?? null,
    impressions:      m.impressions      ?? null,
    engagement_rate:  m.engagement_rate  ?? null,
    measured_at:      m.measured_at,
  }))

  // Insert new metric snapshots (we keep history — don't upsert)
  const { data, error: insertError } = await supabase
    .from('performance_metrics')
    .insert(rows)
    .select('id')

  if (insertError) {
    console.error('[performance webhook] Insert error:', insertError)
  }

  // Update post_results.last_metrics_at for each affected post
  const postIds = Array.from(new Set(metrics.map(m => m.post_result_id)))
  if (postIds.length > 0) {
    await supabase
      .from('post_results')
      .update({ last_metrics_at: new Date().toISOString() })
      .in('id', postIds)
  }

  if (run_id) {
    await completeRunFromCallback(supabase as never, run_id, {
      status:         insertError ? 'error' : status,
      itemsProcessed: data?.length ?? 0,
      error:          insertError?.message ?? error,
    })
  }

  return NextResponse.json({
    ok:       !insertError,
    inserted: data?.length ?? 0,
  })
}
