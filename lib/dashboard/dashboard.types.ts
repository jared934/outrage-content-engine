// =============================================================================
// Dashboard — types shared between server and client
// =============================================================================

import type { RecommendedAction } from '@/lib/scoring/scoring.types'

// ---------------------------------------------------------------------------
// Trend with its latest scoring data joined
// ---------------------------------------------------------------------------

export interface TrendWithScore {
  // From trend_clusters
  id:           string
  title:        string
  summary:      string | null
  category:     string | null
  status:       string
  keywords:     string[]
  source_count: number
  overall_score: number
  created_at:   string
  updated_at:   string
  first_seen_at: string | null

  // From latest trend_scores (may be null if never scored)
  virality_score?:               number
  outrage_fit_score?:            number
  meme_potential_score?:         number
  debate_potential_score?:       number
  urgency_score?:                number
  shelf_life_score?:             number
  visual_potential_score?:       number
  reel_potential_score?:         number
  instagram_shareability_score?: number
  brand_safety_score?:           number
  total_priority_score?:         number
  recommended_action?:           RecommendedAction
  recommended_formats?:          string[]
  score_explanations?:           Record<string, unknown>
  scored_at?:                    string
}

// ---------------------------------------------------------------------------
// Manager alert — AI content manager insight card
// ---------------------------------------------------------------------------

export type ManagerAlertType =
  | 'POST_NOW'
  | 'TREND_DYING'
  | 'MEME_OPPORTUNITY'
  | 'HIGH_DEBATE'
  | 'REEL_OVER_STATIC'
  | 'TOO_RISKY'
  | 'TOO_SATURATED'
  | 'COMPETITOR_GAP'

export interface ManagerAlert {
  id:            string
  type:          ManagerAlertType
  title:         string
  message:       string
  urgency:       'critical' | 'high' | 'medium' | 'low'
  trend:         TrendWithScore
  primaryAction: { label: string; href: string }
}

// ---------------------------------------------------------------------------
// Dashboard data payload from API
// ---------------------------------------------------------------------------

export interface DashboardStats {
  active_count:        number
  post_now_count:      number
  meme_ready_count:    number
  saved_ideas_count:   number
  avg_priority_score:  number
  sources_healthy:     number
  sources_total:       number
}

export interface RecentIdea {
  id:         string
  content:    string
  hook:       string | null
  type:       string
  platform:   string
  format_slug: string | null
  is_saved:   boolean
  is_used:    boolean
  cluster_id: string | null
  created_at: string
  cluster_title?: string | null
}

export interface SourceHealth {
  source_id:     string
  source_name:   string
  source_type:   string
  last_synced:   string | null
  items_fetched: number
  status:        'healthy' | 'stale' | 'error' | 'never'
}

export interface DashboardPayload {
  stats:           DashboardStats
  post_now:        TrendWithScore[]
  top_opportunities: TrendWithScore[]
  meme_ready:      TrendWithScore[]
  recent_ideas:    RecentIdea[]
  saved_ideas:     RecentIdea[]
  source_health:   SourceHealth[]
}
