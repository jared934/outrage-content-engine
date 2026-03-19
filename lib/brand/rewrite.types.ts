// =============================================================================
// OUTRAGE Brand Voice — Rewrite Engine Types
// =============================================================================

// ---------------------------------------------------------------------------
// The 12 rewrite tools
// ---------------------------------------------------------------------------

export type RewriteTool =
  | 'make_sharper'
  | 'make_funnier'
  | 'make_savage'
  | 'make_mainstream'
  | 'make_editorial'
  | 'make_meme_native'
  | 'make_safer'
  | 'shorten_headline'
  | 'improve_hook'
  | 'make_more_shareable'
  | 'reduce_cringe'
  | 'reduce_repetition'

// ---------------------------------------------------------------------------
// Tool metadata — label, description, icon name, group
// ---------------------------------------------------------------------------

export type RewriteGroup = 'tone' | 'audience' | 'format' | 'clean'

export interface RewriteToolMeta {
  tool: RewriteTool
  label: string
  description: string
  icon: string          // lucide-react icon name
  group: RewriteGroup
  groupLabel: string
  color: string         // Tailwind text color class
  bgColor: string       // Tailwind bg class for active state
}

export const REWRITE_TOOLS: RewriteToolMeta[] = [
  // Tone
  {
    tool: 'make_sharper',
    label: 'Make Sharper',
    description: 'Cut filler, punch harder. Every word earns its place.',
    icon: 'Zap',
    group: 'tone',
    groupLabel: 'Tone',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10 border-yellow-400/30',
  },
  {
    tool: 'make_funnier',
    label: 'Make Funnier',
    description: 'Add wit without sacrificing the point.',
    icon: 'Smile',
    group: 'tone',
    groupLabel: 'Tone',
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/10 border-orange-400/30',
  },
  {
    tool: 'make_savage',
    label: 'Make Savage',
    description: 'No filter. Maximum edge. Say the quiet part loud.',
    icon: 'Flame',
    group: 'tone',
    groupLabel: 'Tone',
    color: 'text-red-400',
    bgColor: 'bg-red-400/10 border-red-400/30',
  },
  {
    tool: 'make_safer',
    label: 'Make Safer',
    description: 'Reduce controversy while keeping the punch.',
    icon: 'Shield',
    group: 'tone',
    groupLabel: 'Tone',
    color: 'text-green-400',
    bgColor: 'bg-green-400/10 border-green-400/30',
  },
  // Audience
  {
    tool: 'make_mainstream',
    label: 'More Mainstream',
    description: 'Broaden appeal. More universally relatable.',
    icon: 'Globe',
    group: 'audience',
    groupLabel: 'Audience',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10 border-blue-400/30',
  },
  {
    tool: 'make_editorial',
    label: 'More Editorial',
    description: 'Journalistic framing. Punchy but credible.',
    icon: 'Newspaper',
    group: 'audience',
    groupLabel: 'Audience',
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10 border-purple-400/30',
  },
  {
    tool: 'make_meme_native',
    label: 'Meme-Native',
    description: 'Internet grammar. Chronically online energy.',
    icon: 'Hash',
    group: 'audience',
    groupLabel: 'Audience',
    color: 'text-pink-400',
    bgColor: 'bg-pink-400/10 border-pink-400/30',
  },
  {
    tool: 'make_more_shareable',
    label: 'More Shareable',
    description: 'Optimise for saves and forwards.',
    icon: 'Share2',
    group: 'audience',
    groupLabel: 'Audience',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-400/10 border-cyan-400/30',
  },
  // Format
  {
    tool: 'shorten_headline',
    label: 'Shorten Headline',
    description: 'Maximum impact. Minimum words.',
    icon: 'AlignLeft',
    group: 'format',
    groupLabel: 'Format',
    color: 'text-amber-400',
    bgColor: 'bg-amber-400/10 border-amber-400/30',
  },
  {
    tool: 'improve_hook',
    label: 'Improve Hook',
    description: 'Rewrite the opening so it stops the scroll.',
    icon: 'Anchor',
    group: 'format',
    groupLabel: 'Format',
    color: 'text-teal-400',
    bgColor: 'bg-teal-400/10 border-teal-400/30',
  },
  // Clean
  {
    tool: 'reduce_cringe',
    label: 'Reduce Cringe',
    description: 'Strip try-hard language and over-explanation.',
    icon: 'EyeOff',
    group: 'clean',
    groupLabel: 'Clean Up',
    color: 'text-rose-400',
    bgColor: 'bg-rose-400/10 border-rose-400/30',
  },
  {
    tool: 'reduce_repetition',
    label: 'Reduce Repetition',
    description: 'Remove redundancy. Say it once, say it better.',
    icon: 'Layers',
    group: 'clean',
    groupLabel: 'Clean Up',
    color: 'text-violet-400',
    bgColor: 'bg-violet-400/10 border-violet-400/30',
  },
]

export const TOOL_META_MAP = Object.fromEntries(
  REWRITE_TOOLS.map((t) => [t.tool, t]),
) as Record<RewriteTool, RewriteToolMeta>

// ---------------------------------------------------------------------------
// DB row shape
// ---------------------------------------------------------------------------

export interface BrandRewrite {
  id: string
  org_id: string
  cluster_id: string | null
  idea_id: string | null
  original_text: string
  rewritten_text: string
  tool: RewriteTool
  custom_instruction: string | null
  model_used: string | null
  tokens_used: number | null
  estimated_cost_usd: number | null
  prompt_version: string | null
  brand_settings_snapshot: Record<string, unknown>
  is_saved: boolean
  is_accepted: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Request / Response
// ---------------------------------------------------------------------------

export interface RewriteRequest {
  original_text: string
  tool: RewriteTool
  org_id: string
  custom_instruction?: string
  cluster_id?: string
  idea_id?: string
  model?: string
}

export interface RewriteResult {
  id: string
  original_text: string
  rewritten_text: string
  tool: RewriteTool
  tokens_used: number
  estimated_cost_usd: number
  model_used: string
  prompt_version: string
}

// ---------------------------------------------------------------------------
// History filter
// ---------------------------------------------------------------------------

export interface RewriteHistoryFilters {
  tool?: RewriteTool | ''
  is_saved?: boolean
  search?: string
  limit?: number
}
