// PATCH /api/alerts/[id] — mark read / dismiss

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'

type Ctx = { params: { id: string } }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const supabase = createServiceClient()
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body: { is_read?: boolean; is_dismissed?: boolean } = await req.json()
    const updates: Record<string, unknown> = {}

    if (body.is_read !== undefined) {
      updates.is_read = body.is_read
      if (body.is_read) updates.read_at = new Date().toISOString()
    }
    if (body.is_dismissed !== undefined) {
      updates.is_dismissed = body.is_dismissed
      if (body.is_dismissed) {
        updates.dismissed_at = new Date().toISOString()
        updates.is_read      = true
        updates.read_at      = new Date().toISOString()
      }
    }

    const { data: notification, error } = await supabase
      .from('notifications')
      .update(updates)
      .eq('id', params.id)
      .eq('user_id', user.id)    // RLS-style safety
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ ok: true, notification })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
