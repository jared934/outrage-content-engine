// POST /api/n8n/trigger
// App-side endpoint to trigger n8n workflows.
// Used by the UI (settings/workflows page, trend detail actions, etc.)
//
// Body: { workflow: WorkflowKey, payload?: object }
// Auth: Bearer CRON_SECRET or session cookie (Supabase)
//
// Returns: { ok, run_id, execution_id, message }

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { verifyApiAuth } from '@/lib/n8n/auth'
import { triggerWorkflow, getRecentRuns } from '@/lib/n8n/trigger.service'
import { WORKFLOW_REGISTRY } from '@/lib/n8n/workflows'
import { getAutomationFlags, disabledResponse } from '@/lib/automation/flags'
import type { WorkflowKey } from '@/lib/n8n/types'

export async function POST(req: NextRequest) {
  // Auth: API key or user session
  const isApiKey = verifyApiAuth(req)

  const supabase = await createClient()

  let userId: string | null = null
  let orgId:  string | null = null

  if (!isApiKey) {
    // Fall back to session auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    userId = user.id

    // Get user's org
    const { data: membership } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', userId)
      .limit(1)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'No org membership found' }, { status: 403 })
    }
    orgId = membership.org_id
  }

  let body: { workflow: WorkflowKey; payload?: Record<string, unknown>; org_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { workflow: workflowKey, payload } = body

  // Resolve org_id — from body (API key auth) or session
  orgId = body.org_id ?? orgId
  if (!orgId) {
    return NextResponse.json({ error: 'org_id required' }, { status: 400 })
  }

  if (!workflowKey || !(workflowKey in WORKFLOW_REGISTRY)) {
    return NextResponse.json({
      error:     'Invalid workflow key',
      available: Object.keys(WORKFLOW_REGISTRY),
    }, { status: 400 })
  }

  // Automation gate
  const flags = await getAutomationFlags(orgId)
  if (!flags.n8n_enabled) return disabledResponse('n8n')

  const result = await triggerWorkflow(workflowKey, {
    orgId,
    payload,
    triggeredBy: userId ?? 'api',
  })

  return NextResponse.json({
    ok:           result.ok,
    run_id:       result.runId,
    execution_id: result.executionId,
    message:      result.ok
      ? `Workflow triggered successfully`
      : `Trigger failed: ${result.error}`,
  }, { status: result.ok ? 200 : 500 })
}

// GET /api/n8n/trigger — list recent workflow runs
export async function GET(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: membership } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'No org membership' }, { status: 403 })
  }

  const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '20')
  const svcClient = createServiceClient()
  const runs  = await getRecentRuns(svcClient as never, membership.org_id, limit)

  return NextResponse.json({ runs })
}
