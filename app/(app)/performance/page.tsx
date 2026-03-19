import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PerformanceClient } from './PerformanceClient'

export const metadata: Metadata = { title: 'Performance — OUTRAGE' }

export default async function PerformancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!membership) redirect('/login')
  const orgId = (membership as Record<string, string>).org_id

  return <PerformanceClient orgId={orgId} />
}
