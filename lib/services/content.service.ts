import { createClient } from '@/lib/supabase/client'
import type { ContentSuggestion, SuggestionType, Platform } from '@/types'

export interface SuggestionFilters {
  cluster_id?: string
  /** @deprecated use cluster_id */
  trend_id?: string
  type?: SuggestionType
  platform?: Platform
  is_saved?: boolean
  is_used?: boolean
  limit?: number
}

export async function getSuggestions(filters: SuggestionFilters = {}): Promise<ContentSuggestion[]> {
  const supabase = createClient()

  let query = supabase
    .from('content_ideas')
    .select('*')
    .order('created_at', { ascending: false })

  const clusterId = filters.cluster_id ?? filters.trend_id
  if (clusterId) query = query.eq('cluster_id', clusterId)
  if (filters.type) query = query.eq('type', filters.type)
  if (filters.platform) query = query.in('platform', [filters.platform, 'all'])
  if (filters.is_saved !== undefined) query = query.eq('is_saved', filters.is_saved)
  if (filters.is_used !== undefined) query = query.eq('is_used', filters.is_used)
  if (filters.limit) query = query.limit(filters.limit)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as ContentSuggestion[]
}

export async function saveSuggestion(id: string, saved: boolean): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('content_ideas')
    .update({ is_saved: saved })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function markSuggestionUsed(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('content_ideas')
    .update({ is_used: true })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function createSuggestion(
  suggestion: Omit<ContentSuggestion, 'id' | 'created_at' | 'updated_at'>
): Promise<ContentSuggestion> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('content_ideas')
    .insert(suggestion)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as ContentSuggestion
}

export async function deleteSuggestion(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('content_ideas')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function getSavedSuggestions(): Promise<ContentSuggestion[]> {
  return getSuggestions({ is_saved: true })
}
