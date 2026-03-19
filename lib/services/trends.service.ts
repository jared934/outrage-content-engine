import { createClient } from '@/lib/supabase/client'
import type { Trend, TrendStatus, TrendCategory } from '@/types'

export interface TrendFilters {
  status?: TrendStatus
  category?: TrendCategory
  minScore?: number
  search?: string
  limit?: number
  offset?: number
}

export async function getTrends(filters: TrendFilters = {}): Promise<Trend[]> {
  const supabase = createClient()

  let query = supabase
    .from('trend_clusters')
    .select('*')
    .order('overall_score', { ascending: false })

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.category) query = query.eq('category', filters.category)
  if (filters.minScore !== undefined) query = query.gte('overall_score', filters.minScore)
  if (filters.search) query = query.ilike('title', `%${filters.search}%`)
  if (filters.limit) query = query.limit(filters.limit)
  if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit ?? 20) - 1)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as Trend[]
}

export async function getTrendById(id: string): Promise<Trend | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('trend_clusters')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data as Trend
}

export async function getTopTrends(limit = 10): Promise<Trend[]> {
  return getTrends({ status: 'active', minScore: 0, limit })
}

export async function createTrend(
  trend: Omit<Trend, 'id' | 'created_at' | 'updated_at' | 'first_seen_at'>
): Promise<Trend> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('trend_clusters')
    .insert(trend)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Trend
}

export async function updateTrendStatus(id: string, status: TrendStatus): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('trend_clusters')
    .update({ status })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function markTrendActedOn(id: string): Promise<void> {
  return updateTrendStatus(id, 'acted_on')
}

export async function getTrendStats(): Promise<{
  active: number
  highScore: number
  fadingCount: number
  avgScore: number
}> {
  const supabase = createClient()

  const { data: active } = await supabase
    .from('trend_clusters')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')

  const { data: highScore } = await supabase
    .from('trend_clusters')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
    .gte('overall_score', 70)

  const { data: fading } = await supabase
    .from('trend_clusters')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'declining')

  const { data: scoreData } = await supabase
    .from('trend_clusters')
    .select('overall_score')
    .eq('status', 'active')
    .limit(100)

  const scores = (scoreData ?? []).map((t) => t.overall_score)
  const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0

  return {
    active: (active as unknown as { count: number } | null)?.count ?? 0,
    highScore: (highScore as unknown as { count: number } | null)?.count ?? 0,
    fadingCount: (fading as unknown as { count: number } | null)?.count ?? 0,
    avgScore: Math.round(avgScore),
  }
}
