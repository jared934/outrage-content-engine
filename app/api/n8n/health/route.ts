// GET /api/n8n/health
// Returns n8n connectivity status + list of configured workflows.
// Used by the Settings → Workflows page to show live status.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkN8NHealth } from '@/lib/n8n/client'
import { WORKFLOW_REGISTRY } from '@/lib/n8n/workflows'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [health] = await Promise.all([
    checkN8NHealth(),
  ])

  const workflows = Object.values(WORKFLOW_REGISTRY).map(w => ({
    key:           w.key,
    name:          w.name,
    description:   w.description,
    triggerType:   w.triggerType,
    schedule:      w.schedule ?? null,
    callbackRoute: w.callbackRoute,
    webhookUrl:    process.env.N8N_BASE_URL
      ? `${process.env.N8N_BASE_URL}/webhook/${w.webhookPath}`
      : null,
  }))

  return NextResponse.json({
    n8n: {
      configured: !!process.env.N8N_BASE_URL,
      reachable:  health.reachable,
      status:     health.status,
      version:    health.version,
      latency_ms: health.latency_ms,
      base_url:   process.env.N8N_BASE_URL
        ? process.env.N8N_BASE_URL.replace(/^https?:\/\//, '').split('/')[0]
        : null,
    },
    workflows,
    env: {
      N8N_BASE_URL:       !!process.env.N8N_BASE_URL,
      N8N_WEBHOOK_SECRET: !!process.env.N8N_WEBHOOK_SECRET,
      N8N_API_KEY:        !!process.env.N8N_API_KEY,
      OPENAI_API_KEY:     !!process.env.OPENAI_API_KEY,
      YOUTUBE_API_KEY:    !!process.env.YOUTUBE_API_KEY,
    },
  })
}
