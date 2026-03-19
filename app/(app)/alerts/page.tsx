import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AlertsClient } from './AlertsClient'

export const metadata: Metadata = { title: 'Alerts & Digests — OUTRAGE' }

export default async function AlertsPage() {
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

  return <AlertsClient orgId={orgId} />
}
