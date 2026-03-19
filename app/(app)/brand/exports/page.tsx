import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ExportsClient } from './ExportsClient'

export const metadata: Metadata = {
  title: 'Canva Exports — OUTRAGE',
  description: 'Track and manage Canva production handoffs for OUTRAGE content.',
}

export default async function ExportsPage() {
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

  return <ExportsClient orgId={(membership as Record<string, string>).org_id} />
}
