import { Metadata } from 'next'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardClient } from './DashboardClient'

export const metadata: Metadata = { title: 'Dashboard — OUTRAGE' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Use service client to bypass RLS for the org lookup (user is already auth'd above)
  const svc = createServiceClient()
  const { data: membership } = await svc
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!membership) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div>
          <p className="text-lg font-semibold text-foreground">No organization found</p>
          <p className="text-sm text-muted mt-1">Your account isn&apos;t linked to an org. Contact your admin.</p>
        </div>
      </div>
    )
  }

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
