import { createServiceClient } from '@/lib/supabase/server'
import type { MemeCanvasState, MemeDraft } from './meme.types'

// ---------------------------------------------------------------------------
// Save / upsert a draft
// ---------------------------------------------------------------------------

export async function saveDraft(params: {
  org_id: string
  name: string
  state: MemeCanvasState
  thumbnail_data_url?: string | null
  cluster_id?: string | null
  draft_id?: string | null
}): Promise<MemeDraft> {
  const supabase = createServiceClient()

  const payload = {
    org_id:             params.org_id,
    name:               params.name,
    state:              params.state as unknown as Record<string, unknown>,
    thumbnail_data_url: params.thumbnail_data_url ?? null,
    cluster_id:         params.cluster_id ?? null,
    updated_at:         new Date().toISOString(),
  }

  let result
  if (params.draft_id) {
    const { data, error } = await supabase
      .from('meme_drafts')
      .update(payload)
      .eq('id', params.draft_id)
      .eq('org_id', params.org_id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    result = data
  } else {
    const { data, error } = await supabase
      .from('meme_drafts')
      .insert(payload)
      .select()
      .single()
    if (error) throw new Error(error.message)
    result = data
  }

  return result as MemeDraft
}

// ---------------------------------------------------------------------------
// List drafts for an org
// ---------------------------------------------------------------------------

export async function listDrafts(org_id: string, limit = 20): Promise<MemeDraft[]> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('meme_drafts')
    .select('id, org_id, name, thumbnail_data_url, cluster_id, created_at, updated_at, state')
    .eq('org_id', org_id)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data ?? []) as MemeDraft[]
}

// ---------------------------------------------------------------------------
// Get a single draft
// ---------------------------------------------------------------------------

export async function getDraft(id: string, org_id: string): Promise<MemeDraft | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('meme_drafts')
    .select('*')
    .eq('id', id)
    .eq('org_id', org_id)
    .single()

  if (error) return null
  return data as MemeDraft
}

// ---------------------------------------------------------------------------
// Delete a draft
// ---------------------------------------------------------------------------

export async function deleteDraft(id: string, org_id: string): Promise<void> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('meme_drafts')
    .delete()
    .eq('id', id)
    .eq('org_id', org_id)

  if (error) throw new Error(error.message)
}
