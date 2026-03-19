import { createClient } from '@/lib/supabase/client'
import type { ContentPiece, ContentStatus, PipelineStageConfig, ContentType, Platform } from '@/types'

export async function getPipelineStages(): Promise<PipelineStageConfig[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('pipeline_stages_config')
    .select('*')
    .eq('is_active', true)
    .order('position', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as PipelineStageConfig[]
}

export async function getContentPieces(filters: {
  status?: ContentStatus
  stage_config_id?: string
  cluster_id?: string
  /** @deprecated use cluster_id */
  trend_id?: string
  scheduled_from?: string
  scheduled_to?: string
} = {}): Promise<ContentPiece[]> {
  const supabase = createClient()

  let query = supabase
    .from('content_variants')
    .select('*')
    .order('updated_at', { ascending: false })

  if (filters.status) query = query.eq('status', filters.status)
  const clusterId = filters.cluster_id ?? filters.trend_id
  if (clusterId) query = query.eq('cluster_id', clusterId)
  if (filters.scheduled_from) query = query.gte('scheduled_for', filters.scheduled_from)
  if (filters.scheduled_to) query = query.lte('scheduled_for', filters.scheduled_to)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as ContentPiece[]
}

export async function getContentPieceById(id: string): Promise<ContentPiece | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('content_variants')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data as ContentPiece
}

export interface CreateContentPieceInput {
  title?: string
  body: string
  type: ContentType
  platform: Platform
  status?: ContentStatus
  idea_id?: string
  cluster_id?: string
  scheduled_for?: string
}

export async function createContentPiece(input: CreateContentPieceInput): Promise<ContentPiece> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('content_variants')
    .insert({
      ...input,
      status: input.status ?? 'draft',
      created_by: user?.id,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as ContentPiece
}

export async function updateContentPiece(
  id: string,
  updates: Partial<ContentPiece>
): Promise<ContentPiece> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('content_variants')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as ContentPiece
}

export async function moveContentPiece(id: string, stage_config_id: string, status: ContentStatus): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('content_variants')
    .update({ status })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteContentPiece(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('content_variants')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function getPipelineStats(): Promise<Record<string, number>> {
  const supabase = createClient()
  const { data } = await supabase
    .from('content_variants')
    .select('status')

  const counts: Record<string, number> = {}
  for (const piece of data ?? []) {
    counts[piece.status] = (counts[piece.status] ?? 0) + 1
  }
  return counts
}
