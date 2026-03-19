import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PipelineClient } from './PipelineClient'

export const metadata: Metadata = { title: 'Pipeline — OUTRAGE' }

export default async function PipelinePage() {
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

  return <PipelineClient orgId={orgId} />
}
