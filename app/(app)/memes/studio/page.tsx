import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MemeStudioClient } from './MemeStudioClient'

export const metadata: Metadata = {
  title: 'Meme Studio — OUTRAGE',
  description: 'Create viral memes with AI-powered captions and the OUTRAGE voice.',
}

interface PageProps {
  searchParams: Promise<{ cluster_id?: string; topic?: string }>
}

export default async function MemeStudioPage({ searchParams }: PageProps) {
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

  const params = await searchParams
  const orgId     = (membership as Record<string, string>).org_id
  const clusterId = params.cluster_id
  const topic     = params.topic

  return (
    <MemeStudioClient
      orgId={orgId}
      clusterId={clusterId}
      topic={topic}
    />
  )
}
