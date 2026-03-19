// POST /api/content/regenerate
// Regenerates a single format idea with optional style override or custom instruction.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, getSessionUser } from '@/lib/supabase/server'
import { regenFormat } from '@/lib/content/content-pack.service'
import type { RegenerateFormatRequest, ContentFormatSlug, OutputStyle } from '@/lib/content/content.types'

const VALID_FORMATS: ContentFormatSlug[] = [
  'breaking_alert', 'meme_concept', 'carousel_concept', 'reel_concept',
  'story_poll', 'hot_take', 'controversial_take', 'caption_options',
  'comment_bait_cta', 'visual_direction', 'safer_version', 'sharper_version', 'savage_version',
]

const VALID_STYLES: OutputStyle[] = [
  'mainstream', 'savage', 'safer', 'editorial', 'deadpan', 'mock_serious',
]

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Partial<RegenerateFormatRequest>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { idea_id, org_id, format_slug, output_style, custom_instruction } = body

  if (!idea_id || !org_id || !format_slug) {
    return NextResponse.json({ error: 'idea_id, org_id, and format_slug are required' }, { status: 400 })
  }

  if (!VALID_FORMATS.includes(format_slug)) {
    return NextResponse.json({ error: `Invalid format_slug. Must be one of: ${VALID_FORMATS.join(', ')}` }, { status: 400 })
  }

  if (output_style && !VALID_STYLES.includes(output_style)) {
    return NextResponse.json({ error: `Invalid output_style. Must be one of: ${VALID_STYLES.join(', ')}` }, { status: 400 })
  }

  // custom_instruction max length guard
  if (custom_instruction && custom_instruction.length > 500) {
    return NextResponse.json({ error: 'custom_instruction must be 500 chars or less' }, { status: 400 })
  }

  // Verify membership
  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', org_id)
    .eq('user_id', user.id)
    .single()

  if (!membership || (membership as Record<string, string>).role === 'viewer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const result = await regenFormat({
      idea_id,
      org_id,
      format_slug,
      output_style,
      custom_instruction,
      user_id: user.id,
    })

    return NextResponse.json({
      ok:             true,
      idea_id:        result.idea_id,
      format_slug,
      content:        result.content,
      structured_data: result.structured_data,
    })

  } catch (err) {
    const msg = String(err)
    if (msg.includes('not found')) {
      return NextResponse.json({ error: msg }, { status: 404 })
    }
    console.error('[content/regenerate] Error:', err)
    return NextResponse.json({ error: 'Regeneration failed. Please try again.' }, { status: 500 })
  }
}
