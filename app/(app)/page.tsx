import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardClient } from './DashboardClient'

export const metadata: Metadata = { title: 'Dashboard — OUTRAGE' }

export default async function DashboardPage() {
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

  const orgId       = (membership as Record<string, string>).org_id
  const displayName = user.email?.split('@')[0] ?? 'there'
  const hour        = new Date().getHours()
  const greeting    =
    hour < 12 ? 'Good morning' :
    hour < 17 ? 'Good afternoon' :
    'Good evening'

  return (
    <DashboardClient
      greeting={`${greeting}, ${displayName}.`}
      orgId={orgId}
    />
  )
}
