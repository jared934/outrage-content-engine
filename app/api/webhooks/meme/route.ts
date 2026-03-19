// POST /api/webhooks/meme
// Receives generated meme results from n8n (imgflip or DALL-E).
// Saves to the memes table.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyWebhookSecret } from '@/lib/n8n/auth'
import { completeRunFromCallback } from '@/lib/n8n/trigger.service'
import type { MemeCallbackPayload } from '@/lib/n8n/types'

export async function POST(req: NextRequest) {
  if (!verifyWebhookSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: MemeCallbackPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { org_id, run_id, status, memes, error } = body

  if (!org_id || !Array.isArray(memes)) {
    return NextResponse.json({ error: 'org_id and memes[] required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const rows = memes.map((m) => ({
    org_id,
    cluster_id:   m.cluster_id ?? null,
    variant_id:   m.variant_id ?? null,
    template_id:  m.template_id ?? null,
    caption:      m.caption,
    top_text:     m.top_text ?? null,
    bottom_text:  m.bottom_text ?? null,
    image_url:    m.image_url ?? m.imgflip_url ?? null,
    ai_prompt:    m.ai_prompt ?? null,
    status:       'generated',
  }))

  const { data, error: insertError } = await supabase
    .from('memes')
    .insert(rows)
    .select('id')

  if (insertError) {
    console.error('[meme webhook] Insert error:', insertError)
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
