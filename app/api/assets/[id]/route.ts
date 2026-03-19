// GET    /api/assets/[id]  — fetch single asset
// PATCH  /api/assets/[id]  — update metadata
// DELETE /api/assets/[id]  — archive (soft) or hard-delete with storage cleanup

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'
import type { UpdateAssetInput } from '@/lib/assets/asset.types'

type Ctx = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const supabase = createServiceClient()
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: asset, error } = await supabase
    .from('assets').select('*').eq('id', params.id).single()

  if (error || !asset) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true, asset })
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const supabase = createServiceClient()
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const updates: UpdateAssetInput = await req.json()
    const { data: asset, error } = await supabase
      .from('assets').update(updates).eq('id', params.id).select().single()
    if (error) throw error
    return NextResponse.json({ ok: true, asset })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const supabase = createServiceClient()
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const hard = new URL(req.url).searchParams.get('hard') === '1'

  try {
    if (hard) {
      // Fetch storage_path first so we can delete from storage
      const { data: asset } = await supabase
        .from('assets').select('storage_path').eq('id', params.id).single()

      if (asset?.storage_path) {
        await supabase.storage.from('org-assets').remove([asset.storage_path])
      }
      const { error } = await supabase.from('assets').delete().eq('id', params.id)
      if (error) throw error
    } else {
      // Soft archive
      const { error } = await supabase
        .from('assets').update({ is_archived: true }).eq('id', params.id)
      if (error) throw error
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
