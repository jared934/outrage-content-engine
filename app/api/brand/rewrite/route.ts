// POST /api/brand/rewrite — run a rewrite tool on submitted text
// GET  /api/brand/rewrite — fetch rewrite history for the org

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'
import { rewriteText, getRewriteHistory, toggleSaveRewrite, markRewriteAccepted, deleteRewrite } from '@/lib/brand/rewrite.service'
import { getAutomationFlags, disabledResponse } from '@/lib/automation/flags'
import type { RewriteRequest, RewriteTool } from '@/lib/brand/rewrite.types'

const VALID_TOOLS: RewriteTool[] = [
  'make_sharper', 'make_funnier', 'make_savage', 'make_mainstream',
  'make_editorial', 'make_meme_native', 'make_safer', 'shorten_headline',
  'improve_hook', 'make_more_shareable', 'reduce_cringe', 'reduce_repetition',
]

async function getAuthedUser() {
  const supabase = createServiceClient()
  const user = await getSessionUser()
  return { supabase, user }
}

// ---------------------------------------------------------------------------
// POST — run a rewrite
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const { user } = await getAuthedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Partial<RewriteRequest>
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { original_text, tool, org_id, custom_instruction, cluster_id, idea_id, model } = body

  if (!original_text?.trim())   return NextResponse.json({ error: 'original_text is required' }, { status: 400 })
  if (!tool)                     return NextResponse.json({ error: 'tool is required' }, { status: 400 })
  if (!org_id)                   return NextResponse.json({ error: 'org_id is required' }, { status: 400 })
  if (!VALID_TOOLS.includes(tool)) return NextResponse.json({ error: `Invalid tool. Must be one of: ${VALID_TOOLS.join(', ')}` }, { status: 400 })

  if (original_text.length > 4000) return NextResponse.json({ error: 'original_text must be 4000 chars or less' }, { status: 400 })
  if (custom_instruction && custom_instruction.length > 300) return NextResponse.json({ error: 'custom_instruction must be 300 chars or less' }, { status: 400 })

  // Automation gate
  const flags = await getAutomationFlags(org_id)
  if (!flags.ai_enabled) return disabledResponse('AI')

  try {
    const result = await rewriteText({ original_text, tool, org_id, custom_instruction, cluster_id, idea_id, model })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[brand/rewrite] Error:', err)
    return NextResponse.json({ error: 'Rewrite failed. Please try again.' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// GET — fetch history
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const { user } = await getAuthedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const org_id  = searchParams.get('org_id')
  const tool    = searchParams.get('tool') ?? undefined
  const saved   = searchParams.get('saved')
  const search  = searchParams.get('search') ?? undefined
  const limit   = Number(searchParams.get('limit') ?? '50')

  if (!org_id) return NextResponse.json({ error: 'org_id is required' }, { status: 400 })

  try {
    const history = await getRewriteHistory(org_id, {
      tool:     tool as RewriteTool | undefined,
      is_saved: saved === 'true' ? true : undefined,
      search,
      limit,
    })
    return NextResponse.json({ ok: true, history })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// PATCH — save / accept / delete actions
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest) {
  const { user } = await getAuthedUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { id: string; action: 'save' | 'unsave' | 'accept' | 'delete'; value?: boolean }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { id, action } = body
  if (!id || !action) return NextResponse.json({ error: 'id and action are required' }, { status: 400 })

  try {
    if (action === 'save')   await toggleSaveRewrite(id, true)
    if (action === 'unsave') await toggleSaveRewrite(id, false)
    if (action === 'accept') await markRewriteAccepted(id)
    if (action === 'delete') await deleteRewrite(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
