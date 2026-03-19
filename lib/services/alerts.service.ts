import { createClient } from '@/lib/supabase/client'
import type { Alert, AlertRule, AlertSeverity, AlertType } from '@/types'

export async function getAlerts(filters: {
  is_read?: boolean
  is_dismissed?: boolean
  severity?: AlertSeverity
  limit?: number
} = {}): Promise<Alert[]> {
  const supabase = createClient()

  let query = supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters.is_read !== undefined) query = query.eq('is_read', filters.is_read)
  if (filters.is_dismissed !== undefined) query = query.eq('is_dismissed', filters.is_dismissed)
  if (filters.severity) query = query.eq('severity', filters.severity)
  if (filters.limit) query = query.limit(filters.limit)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as Alert[]
}

export async function getUnreadAlerts(): Promise<Alert[]> {
  return getAlerts({ is_read: false, is_dismissed: false, limit: 20 })
}

export async function getUnreadCount(): Promise<number> {
  const supabase = createClient()
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false)
    .eq('is_dismissed', false)

  if (error) return 0
  return count ?? 0
}

export async function markAlertRead(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function markAllAlertsRead(): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('is_read', false)
  if (error) throw new Error(error.message)
}

export async function dismissAlert(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('notifications')
    .update({ is_dismissed: true, is_read: true })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function createAlert(alert: {
  type: AlertType
  severity: AlertSeverity
  title: string
  message?: string
  cluster_id?: string
  rule_id?: string
  metadata?: Record<string, unknown>
}): Promise<Alert> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('notifications')
    .insert({ ...alert, message: alert.message ?? '' })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Alert
}

export async function getAlertRules(): Promise<AlertRule[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('alert_rules')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as AlertRule[]
}

export async function toggleAlertRule(id: string, enabled: boolean): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('alert_rules')
    .update({ enabled })
    .eq('id', id)
  if (error) throw new Error(error.message)
}
