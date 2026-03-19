// GET  /api/alerts/rules — list alert rules for org
// POST /api/alerts/rules — create a new alert rule

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'
import type { CreateAlertRuleInput } from '@/lib/alerts/alert.types'

async function resolveOrgId(supabase: ReturnType<typeof createServiceClient>, userId: string, searchParams: URLSearchParams) {
  let org_id = searchParams.get('org_id')
  if (!org_id) {
    const { data: m } = await supabase
      .from('org_members').select('org_id').eq('user_id', userId).limit(1).single()
    org_id = m?.org_id ?? null
  }
  return org_id
}

export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const org_id = await resolveOrgId(supabase, user.id, new URL(req.url).searchParams)
  if (!org_id) return NextResponse.json({ error: 'No org found' }, { status: 400 })

  const { data: rules, error } = await supabase
    .from('alert_rules')
    .select('*')
    .eq('org_id', org_id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, rules: rules ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const org_id = await resolveOrgId(supabase, user.id, new URL(req.url).searchParams)
  if (!org_id) return NextResponse.json({ error: 'No org found' }, { status: 400 })

  try {
    const body: CreateAlertRuleInput = await req.json()

    const { data: rule, error } = await supabase
      .from('alert_rules')
      .insert({
        org_id,
        name:           body.name,
        description:    body.description    ?? null,
        trigger_type:   body.trigger_type,
        threshold:      body.threshold      ?? null,
        keywords:       body.keywords       ?? [],
        categories:     body.categories     ?? [],
        cooldown_hours: body.cooldown_hours ?? 1,
        notify_in_app:  body.notify_in_app  ?? true,
        notify_email:   body.notify_email   ?? false,
        webhook_url:    body.webhook_url    ?? null,
        enabled:        true,
        created_by:     user.id,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ ok: true, rule }, { status: 201 })
  } catch (err) {
    console.error('[alerts/rules POST]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
