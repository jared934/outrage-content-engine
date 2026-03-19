import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { WebhookSuggestionsPayload } from '@/types'

function verifyWebhookSecret(req: NextRequest): boolean {
  return req.headers.get('x-webhook-secret') === process.env.N8N_WEBHOOK_SECRET
}

export async function POST(req: NextRequest) {
  if (!verifyWebhookSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: WebhookSuggestionsPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Accept both cluster_id (new schema) and trend_id (legacy n8n payload)
  const clusterId = body.cluster_id ?? body.trend_id
  const { suggestions } = body

  if (!clusterId || !Array.isArray(suggestions)) {
    return NextResponse.json({ error: 'cluster_id (or trend_id) and suggestions[] required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const rows = suggestions.map((s) => ({
    cluster_id: clusterId,
    type:       s.type,
    content:    s.content,
    angle:      s.angle   ?? null,
    hook:       s.hook    ?? null,
    cta:        s.cta     ?? null,
    platform:   s.platform ?? 'all',
    ai_model:   s.ai_model ?? null,
    confidence: s.confidence ?? null,
  }))

  const { data, error } = await supabase
    .from('content_ideas')
    .insert(rows)
    .select('id')

  if (error) {
    console.error('[suggestions webhook] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, inserted: data?.length ?? 0 })
}
