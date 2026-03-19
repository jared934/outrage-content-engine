import { createClient } from '@/lib/supabase/client'
import type { Source, SourceType } from '@/types'

export async function getSources(filters: {
  type?: SourceType
  status?: import('@/types').SourceStatus
} = {}): Promise<Source[]> {
  const supabase = createClient()

  let query = supabase
    .from('sources')
    .select('*')
    .order('name', { ascending: true })

  if (filters.type) query = query.eq('type', filters.type)
  if (filters.status !== undefined) query = query.eq('status', filters.status)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as Source[]
}

export async function createSource(source: {
  name: string
  type: SourceType
  url?: string
  config?: Record<string, unknown>
  fetch_interval_minutes?: number
}): Promise<Source> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sources')
    .insert({
      ...source,
      config: source.config ?? {},
      fetch_interval_minutes: source.fetch_interval_minutes ?? 60,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Source
}

export async function updateSource(id: string, updates: Partial<Source>): Promise<Source> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sources')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Source
}

export async function toggleSource(id: string, status: import('@/types').SourceStatus): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('sources')
    .update({ status })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteSource(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('sources')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function resetSourceErrors(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('sources')
    .update({ error_count: 0, last_error: null })
    .eq('id', id)
  if (error) throw new Error(error.message)
}
