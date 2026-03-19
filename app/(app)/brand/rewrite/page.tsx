import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BrandRewriteClient } from './BrandRewriteClient'

export const metadata: Metadata = {
  title: 'Brand Voice Rewriter — OUTRAGE',
  description: 'Rewrite copy in the OUTRAGE voice using AI-powered tools.',
}

export default async function BrandRewritePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Get the user's org
  const { data: membership } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!membership) redirect('/login')

  return <BrandRewriteClient orgId={(membership as Record<string, string>).org_id} />
}
