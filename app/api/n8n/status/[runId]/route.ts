// GET /api/n8n/status/:runId
// Returns the current status of a workflow run.
// Also optionally syncs status from n8n's execution API.
//
// Query params:
//   ?sync=true — fetch live status from n8n API and update local record

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getRunById, updateRunRecord } from '@/lib/n8n/trigger.service'
import { getExecutionStatus, mapN8NStatus } from '@/lib/n8n/client'

export async function GET(
  req: NextRequest,
  { params }: { params: { runId: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { runId } = params
  const syncLive  = req.nextUrl.searchParams.get('sync') === 'true'

  const serviceSupabase = createServiceClient()
  const run = await getRunById(serviceSupabase as never, runId)

  if (!run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 })
  }

  // Verify user has access to this org's run
  const { data: membership } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .eq('org_id', run.org_id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Optionally sync live status from n8n
  if (syncLive && run.n8n_execution_id && run.status === 'running') {
    const n8nStatus = await getExecutionStatus(run.n8n_execution_id)

    if (n8nStatus) {
      const localStatus = mapN8NStatus(n8nStatus.status)

      if (localStatus !== run.status) {
        await updateRunRecord(serviceSupabase as never, runId, {
          status:       localStatus,
          completed_at: n8nStatus.stoppedAt ?? (n8nStatus.finished ? new Date().toISOString() : undefined),
          error_message: n8nStatus.data?.resultData?.error?.message,
        })
        run.status = localStatus
      }
    }
  }

  return NextResponse.json({ run })
}
