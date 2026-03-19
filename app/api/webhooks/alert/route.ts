import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { WebhookAlertPayload } from '@/types'

function verifyWebhookSecret(req: NextRequest): boolean {
  return req.headers.get('x-webhook-secret') === process.env.N8N_WEBHOOK_SECRET
}

export async function POST(req: NextRequest) {
  if (!verifyWebhookSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: WebhookAlertPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { severity, title, message, trend_id, rule_id } = body
  if (!severity || !title) {
    return NextResponse.json({ error: 'severity and title required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      type: 'trend_alert',
      severity: severity ?? 'info',
      title,
      message: message ?? '',
      cluster_id: trend_id ?? null,
      rule_id: rule_id ?? null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[alert webhook] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, alert_id: data?.id })
}
