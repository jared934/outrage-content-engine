import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('trend_cluster_items')
    .select(`
      relevance_score,
      source_items (
        id, title, url, author, published_at, source_id,
        sources ( name, type )
      )
    `)
    .eq('cluster_id', params.id)
    .order('relevance_score', { ascending: false })
    .limit(30)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const items = (data ?? [])
    .map((row: any) => ({
      id:             row.source_items?.id,
      title:          row.source_items?.title,
      url:            row.source_items?.url,
      author:         row.source_items?.author,
      published_at:   row.source_items?.published_at,
      source_name:    row.source_items?.sources?.name,
      source_type:    row.source_items?.sources?.type,
      relevance_score: row.relevance_score,
    }))
    .filter((i: any) => i.id && i.title)

  return NextResponse.json({ ok: true, items })
}
