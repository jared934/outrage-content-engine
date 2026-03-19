// POST /api/webhooks/cleanup
// Receives stale trend cleanup results from n8n.
// Logs the cleanup summary and completes the workflow run.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyWebhookSecret } from '@/lib/n8n/auth'
import { completeRunFromCallback } from '@/lib/n8n/trigger.service'
import type { CleanupCallbackPayload } from '@/lib/n8n/types'

export async function POST(req: NextRequest) {
  if (!verifyWebhookSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: CleanupCallbackPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { org_id, run_id, status, archived_count, declined_count, error } = body

  if (!org_id) {
    return NextResponse.json({ error: 'org_id required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  if (run_id) {
    await completeRunFromCallback(supabase as never, run_id, {
      status,
      itemsProcessed: archived_count + declined_count,
      resultPayload:  { archived_count, declined_count },
      error,
    })
  }

  return NextResponse.json({
    ok:             status !== 'error',
    archived_count,
    declined_count,
  })
}
