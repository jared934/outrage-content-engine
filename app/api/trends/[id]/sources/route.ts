import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  // Fetch cluster items with source details in two queries to avoid FK ambiguity
  const { data: clusterItems, error } = await supabase
    .from('trend_cluster_items')
    .select('source_item_id, relevance_score')
    .eq('cluster_id', params.id)
    .order('relevance_score', { ascending: false })
    .limit(30)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!clusterItems || clusterItems.length === 0) {
    return NextResponse.json({ ok: true, items: [] })
  }

  const sourceItemIds = clusterItems.map((ci) => ci.source_item_id)

  const { data: sourceItems, error: siError } = await supabase
    .from('source_items')
    .select('id, title, url, author, published_at, source_id')
    .in('id', sourceItemIds)

  if (siError) return NextResponse.json({ error: siError.message }, { status: 500 })

  // Get source names
  const sourceIds = Array.from(new Set((sourceItems ?? []).map((si) => si.source_id).filter(Boolean)))
  const { data: sources } = sourceIds.length > 0
    ? await supabase.from('sources').select('id, name, type').in('id', sourceIds)
    : { data: [] }

  const sourceMap = Object.fromEntries((sources ?? []).map((s) => [s.id, s]))
  const itemMap = Object.fromEntries((sourceItems ?? []).map((si) => [si.id, si]))

  const items = clusterItems
    .map((ci) => {
      const si = itemMap[ci.source_item_id]
      if (!si || !si.title) return null
      const src = si.source_id ? sourceMap[si.source_id] : null
      return {
        id:              si.id,
        title:           si.title,
        url:             si.url ?? null,
        author:          si.author ?? null,
        published_at:    si.published_at ?? null,
        source_name:     src?.name ?? null,
        source_type:     src?.type ?? null,
        relevance_score: Number(ci.relevance_score),
      }
    })
    .filter(Boolean)

  return NextResponse.json({ ok: true, items })
}
