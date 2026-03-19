// GET  /api/settings/automation — fetch current flags
// PATCH /api/settings/automation — update ai_enabled / n8n_enabled

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'

async function getOrgId(userId: string) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('org_members')
    .select('org_id, role')
    .eq('user_id', userId)
    .single()
  return data
}

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getOrgId(user.id)
  if (!membership) return NextResponse.json({ error: 'No org' }, { status: 403 })

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('organizations')
    .select('ai_enabled, n8n_enabled')
    .eq('id', membership.org_id)
    .single()

  return NextResponse.json({ ok: true, ai_enabled: data?.ai_enabled ?? false, n8n_enabled: data?.n8n_enabled ?? false })
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getOrgId(user.id)
  if (!membership) return NextResponse.json({ error: 'No org' }, { status: 403 })
  if (!['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Only owners and admins can change automation settings' }, { status: 403 })
  }

  const body = await req.json()
  const update: Record<string, boolean> = {}
  if (typeof body.ai_enabled  === 'boolean') update.ai_enabled  = body.ai_enabled
  if (typeof body.n8n_enabled === 'boolean') update.n8n_enabled = body.n8n_enabled

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('organizations')
    .update(update)
    .eq('id', membership.org_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, ...update })
}
