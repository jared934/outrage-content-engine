import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { WebhookIngestPayload } from '@/types'

function verifyWebhookSecret(req: NextRequest): boolean {
  const secret = req.headers.get('x-webhook-secret')
  return secret === process.env.N8N_WEBHOOK_SECRET
}

export async function POST(req: NextRequest) {
  if (!verifyWebhookSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: WebhookIngestPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { source_id, items } = body
  if (!source_id || !Array.isArray(items)) {
    return NextResponse.json({ error: 'source_id and items[] required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Upsert source items (dedup by external_id via unique index)
  const rows = items.map((item) => ({
    source_config_id: source_id,
    external_id:      item.external_id,
    title:            item.title,
    body:             item.body ?? null,
    url:              item.url  ?? null,
    author:           item.author ?? null,
    thumbnail_url:    item.thumbnail_url ?? null,
    media_urls:       item.media_urls ?? [],
    published_at:     item.published_at ?? null,
    keywords:         item.keywords ?? [],
    entities:         item.entities ?? {},
    engagement_data:  item.engagement_data ?? {},
    sentiment_score:  item.sentiment_score ?? null,
    raw_data:         item.raw_data ?? {},
  }))

  const { data, error } = await supabase
    .from('source_items')
    .upsert(rows, {
      onConflict: 'external_id',
      ignoreDuplicates: false,   // Refresh engagement data on re-ingest
    })
    .select('id')

  if (error) {
    console.error('[ingest webhook] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update source last_fetched_at
  await supabase
    .from('source_configs')
    .update({
      last_fetched_at: new Date().toISOString(),
      error_count:     0,
      last_error:      null,
    })
    .eq('id', source_id)

  return NextResponse.json({
    ok:             true,
    inserted:       data?.length ?? 0,
    total_received: items.length,
  })
}
