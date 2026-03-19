// ─── Command Bar Types ────────────────────────────────────────────────────────

export type CommandCategory = 'navigate' | 'query' | 'action' | 'generate'

export type QueryIntent =
  | 'post_now'
  | 'meme_ready'
  | 'hottest'
  | 'urgent'
  | 'risky'
  | 'search'
  | 'competitor_gaps'

export interface ParsedQuery {
  intent:   QueryIntent
  keyword?: string
  label:    string
}

// ── Result types returned by the query API ────────────────────────────────────

export type ResultType = 'trends' | 'gaps' | 'text' | 'success' | 'error'

export interface TrendItem {
  id:                    string
  title:                 string
  category:              string
  overall_score:         number
  urgency_score:         number
  meme_potential_score:  number
  total_priority_score:  number
  recommended_action:    string
}

export interface GapItem {
  cluster_id:    string
  cluster_title: string
  gap_score:     number
  gap_type:      string
  coverage_count: number
}

export interface CommandResult {
  type:       ResultType
  title:      string
  message:    string
  href?:      string
  items?:     TrendItem[]
  gaps?:      GapItem[]
}

// ── Static command definition ─────────────────────────────────────────────────

export interface StaticCommand {
  id:          string
  label:       string
  description: string
  icon:        string
  category:    CommandCategory
  keywords:    string[]    // extra cmdk search terms
  shortcut?:   string
  // Navigation: just go to href
  href?:       string
  // Query: resolve to a queryIntent
  queryIntent?: QueryIntent
  queryKeyword?: string
  // Action: call this
  actionId?:   string
}
