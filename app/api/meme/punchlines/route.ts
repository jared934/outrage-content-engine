// POST /api/meme/punchlines — generate AI punchline suggestions

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'
import { generatePunchlines } from '@/lib/meme/punchline.service'
import { getAutomationFlags, disabledResponse } from '@/lib/automation/flags'
import type { PunchlineRequest, QuickAction } from '@/lib/meme/meme.types'

const VALID_QUICK_ACTIONS: QuickAction[] = [
  'funnier', 'savage', 'mainstream', 'safer', 'less_cringe', 'shorter', 'regenerate',
]

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Partial<PunchlineRequest>
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const {
    org_id, cluster_id, topic, template_id,
    num_suggestions = 5, quick_action,
    current_top, current_bottom,
  } = body

  if (!org_id) return NextResponse.json({ error: 'org_id is required' }, { status: 400 })
  if (!topic && !cluster_id) return NextResponse.json({ error: 'topic or cluster_id is required' }, { status: 400 })

  // Verify org membership
  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', org_id)
    .eq('user_id', user.id)
    .single()
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Automation gate
  const flags = await getAutomationFlags(org_id)
  if (!flags.ai_enabled) return disabledResponse('AI')

  if (quick_action && !VALID_QUICK_ACTIONS.includes(quick_action)) {
    return NextResponse.json({ error: `Invalid quick_action` }, { status: 400 })
  }

  const count = Math.max(1, Math.min(10, num_suggestions ?? 5))

  try {
    const result = await generatePunchlines({
      org_id,
      cluster_id,
      topic,
      template_id,
      num_suggestions: count,
      quick_action,
      current_top,
      current_bottom,
    })

    // Persist to DB for history/analytics (fire and forget)
    void supabase.from('meme_punchlines').insert({
      org_id,
      cluster_id:  cluster_id ?? null,
      topic:       topic ?? null,
      suggestions: result.suggestions,
      tokens_used: result.tokens_used,
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[meme/punchlines] Error:', err)
    return NextResponse.json({ error: 'Punchline generation failed. Please try again.' }, { status: 500 })
  }
}
