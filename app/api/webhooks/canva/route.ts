// POST /api/webhooks/canva
// Receives Canva design export results from n8n.
// Saves design URLs to canva_exports table.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyWebhookSecret } from '@/lib/n8n/auth'
import { completeRunFromCallback } from '@/lib/n8n/trigger.service'
import type { CanvaCallbackPayload } from '@/lib/n8n/types'

export async function POST(req: NextRequest) {
  if (!verifyWebhookSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: CanvaCallbackPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { org_id, run_id, status, exports: canvaExports, error } = body

  if (!org_id || !Array.isArray(canvaExports)) {
    return NextResponse.json({ error: 'org_id and exports[] required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const rows = canvaExports.map((e) => ({
    org_id,
    cluster_id:  e.cluster_id ?? null,
    variant_id:  e.variant_id ?? null,
    design_name: e.design_name,
    design_url:  e.design_url,
    edit_url:    e.edit_url   ?? null,
    preview_url: e.preview_url ?? null,
    platform:    e.platform   ?? null,
    exported_at: new Date().toISOString(),
  }))

  const { data, error: insertError } = await supabase
    .from('canva_exports')
    .insert(rows)
    .select('id')

  if (insertError) {
    console.error('[canva webhook] Insert error:', insertError)
  }

  if (run_id) {
    await completeRunFromCallback(supabase as never, run_id, {
      status:         insertError ? 'error' : status,
      itemsProcessed: data?.length ?? 0,
      resultPayload:  { exports: canvaExports },
      error:          insertError?.message ?? error,
    })
  }

  return NextResponse.json({
    ok:       !insertError,
    inserted: data?.length ?? 0,
    exports:  data?.map(d => d.id) ?? [],
  })
}
