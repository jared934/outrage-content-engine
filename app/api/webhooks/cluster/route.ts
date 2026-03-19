// POST /api/webhooks/cluster
// Receives clustering results from n8n.
// Creates or updates trend_clusters and links source_items.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyWebhookSecret } from '@/lib/n8n/auth'
import { completeRunFromCallback } from '@/lib/n8n/trigger.service'
import type { ClusterCallbackPayload } from '@/lib/n8n/types'

export async function POST(req: NextRequest) {
  if (!verifyWebhookSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: ClusterCallbackPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { org_id, run_id, status, clusters, error } = body

  if (!org_id || !Array.isArray(clusters)) {
    return NextResponse.json({ error: 'org_id and clusters[] required' }, { status: 400 })
  }

  const supabase = createServiceClient()
  let upserted = 0
  let linked   = 0
  const errors: string[] = []

  for (const cluster of clusters) {
    try {
      let clusterId = cluster.cluster_id

      if (clusterId) {
        // Update existing cluster
        await supabase
          .from('trend_clusters')
          .update({
            title:      cluster.title,
            summary:    cluster.summary ?? null,
            keywords:   cluster.keywords,
            entities:   cluster.entities,
            item_count: cluster.item_count,
            velocity:   cluster.velocity,
            status:     cluster.item_count > 10 ? 'hot' : 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('id', clusterId)
          .eq('org_id', org_id)
      } else {
        // Create new cluster
        const { data, error: insertError } = await supabase
          .from('trend_clusters')
          .insert({
            org_id,
            title:      cluster.title,
            summary:    cluster.summary ?? null,
            keywords:   cluster.keywords,
            entities:   cluster.entities,
            item_count: cluster.item_count,
            velocity:   cluster.velocity,
            status:     cluster.item_count > 10 ? 'hot' : 'new',
            category:   cluster.category ?? 'other',
          })
          .select('id')
          .single()

        if (insertError || !data) {
          errors.push(`Failed to create cluster "${cluster.title}": ${insertError?.message}`)
          continue
        }
        clusterId = data.id
      }

      upserted++

      // Link source_items to this cluster
      if (cluster.source_item_ids.length > 0) {
        const links = cluster.source_item_ids.map((itemId, idx) => ({
          cluster_id:       clusterId,
          source_item_id:   itemId,
          relevance_score:  Math.max(0, 100 - idx * 5), // descending relevance
        }))

        const { error: linkError } = await supabase
          .from('trend_cluster_items')
          .upsert(links, { onConflict: 'cluster_id,source_item_id', ignoreDuplicates: true })

        if (linkError) {
          errors.push(`Failed to link items to cluster ${clusterId}: ${linkError.message}`)
        } else {
          linked += links.length
        }
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : 'Unknown cluster error')
    }
  }

  if (run_id) {
    await completeRunFromCallback(supabase as never, run_id, {
      status:         errors.length === 0 ? status : 'partial',
      itemsProcessed: upserted,
      resultPayload:  { upserted, linked, errors },
      error:          errors[0],
    })
  }

  return NextResponse.json({
    ok:      errors.length === 0,
    upserted,
    linked,
    errors,
  })
}
