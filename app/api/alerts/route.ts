// GET  /api/alerts — list notifications
// POST /api/alerts — create a notification (internal use)

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)

  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    const isDismissed = searchParams.get('is_dismissed')
    const isRead      = searchParams.get('is_read')
    const severity    = searchParams.get('severity')
    const type        = searchParams.get('type')
    const limit       = Number(searchParams.get('limit') ?? 50)

    if (isDismissed !== null) query = query.eq('is_dismissed', isDismissed === 'true')
    if (isRead      !== null) query = query.eq('is_read',      isRead      === 'true')
    if (severity)             query = query.eq('severity',  severity)
    if (type)                 query = query.eq('type',      type)
    query = query.limit(limit)

    const { data: notifications, error } = await query
    if (error) throw error

    const unread = (notifications ?? []).filter((n) => !n.is_read && !n.is_dismissed).length

    return NextResponse.json({ ok: true, notifications: notifications ?? [], unread })
  } catch (err) {
    console.error('[alerts GET]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  // Internal-only: create notification for a specific user or all org members
  const supabase = createServiceClient()
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { data: m } = await supabase
      .from('org_members').select('org_id').eq('user_id', user.id).limit(1).single()

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        org_id:     body.org_id ?? m?.org_id,
        user_id:    body.user_id ?? user.id,
        type:       body.type,
        severity:   body.severity ?? 'info',
        title:      body.title,
        message:    body.message,
        cluster_id: body.cluster_id ?? null,
        rule_id:    body.rule_id    ?? null,
        metadata:   body.metadata   ?? {},
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ ok: true, notification }, { status: 201 })
  } catch (err) {
    console.error('[alerts POST]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
