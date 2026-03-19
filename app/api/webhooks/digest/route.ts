// POST /api/webhooks/digest
// Receives the morning digest payload from n8n.
// Creates a notification and stores digest metadata.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyWebhookSecret } from '@/lib/n8n/auth'
import { completeRunFromCallback } from '@/lib/n8n/trigger.service'
import type { DigestCallbackPayload } from '@/lib/n8n/types'

export async function POST(req: NextRequest) {
  if (!verifyWebhookSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: DigestCallbackPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { org_id, run_id, status, digest, error } = body

  if (!org_id || !digest) {
    return NextResponse.json({ error: 'org_id and digest required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Create a notification for the digest
  if (status !== 'error' && digest.top_clusters.length > 0) {
    const topCluster = digest.top_clusters[0]
    await supabase.from('notifications').insert({
      org_id,
      type:     'digest',
      severity: 'info',
      title:    `Morning Digest — ${new Date(digest.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`,
      message:  `${digest.stats.new_since_yesterday} new trends today. Top: "${topCluster.title}" (score ${Math.round(topCluster.overall_score)})`,
      metadata: {
        digest_date:  digest.date,
        stats:        digest.stats,
        top_cluster:  topCluster,
      },
    })
  }

  // Complete the workflow run
  if (run_id) {
    await completeRunFromCallback(supabase as never, run_id, {
      status:         status,
      itemsProcessed: digest.top_clusters.length,
      resultPayload:  digest as unknown as Record<string, unknown>,
      error,
    })
  }

  return NextResponse.json({
    ok:              true,
    clusters_in_digest: digest.top_clusters.length,
    ideas_in_digest: digest.top_ideas.length,
  })
}
