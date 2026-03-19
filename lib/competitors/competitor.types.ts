// ─── Competitor Watchlist Types ───────────────────────────────────────────────

export type CompetitorCategory =
  | 'media_brand'
  | 'meme_account'
  | 'news_outlet'
  | 'influencer'
  | 'competitor_brand'
  | 'platform'
  | 'other'

export type CompetitorSourceType =
  | 'rss'
  | 'atom'
  | 'twitter'
  | 'instagram'
  | 'youtube'
  | 'tiktok'
  | 'facebook'
  | 'reddit'
  | 'website'
  | 'other'

export interface Competitor {
  id:            string
  org_id:        string
  name:          string
  description:   string | null
  category:      CompetitorCategory
  avatar_url:    string | null
  website_url:   string | null
  notes:         string | null
  is_active:     boolean
  post_count:    number
  last_active_at: string | null
  created_at:    string
  updated_at:    string
  // enriched
  sources?:      CompetitorSource[]
  recent_posts?: CompetitorPost[]
}

export interface CompetitorSource {
  id:              string
  competitor_id:   string
  org_id:          string
  source_type:     CompetitorSourceType
  url:             string
  handle:          string | null
  label:           string | null
  is_active:       boolean
  last_fetched_at: string | null
  last_post_at:    string | null
  fetch_error:     string | null
  post_count:      number
  created_at:      string
}

export interface CompetitorPost {
  id:                  string
  source_id:           string
  competitor_id:       string
  org_id:              string
  external_id:         string | null
  title:               string | null
  content:             string | null
  url:                 string | null
  thumbnail_url:       string | null
  published_at:        string
  topic_tags:          string[]
  matched_cluster_ids: string[]
  engagement_score:    number | null
  created_at:          string
  // enriched
  competitor_name?:    string
  competitor_category?: CompetitorCategory
}

// ── Gap analysis ─────────────────────────────────────────────────────────────

export interface GapEntry {
  cluster_id:          string
  cluster_title:       string
  cluster_category:    string
  urgency_score:       number
  priority_score:      number
  coverage_count:      number   // # distinct competitors that covered this topic
  gap_score:           number   // 0-100: high = big opportunity
  gap_type:            'uncovered' | 'underserved' | 'saturated'
  covered_by:          Array<{ competitor_id: string; competitor_name: string; post_count: number }>
  missing_from:        Array<{ competitor_id: string; competitor_name: string }>
  sample_posts:        Array<{ post_id: string; title: string | null; url: string | null; competitor_name: string }>
}

// ── Configs ───────────────────────────────────────────────────────────────────

export const CATEGORY_CONFIG: Record<CompetitorCategory, {
  label: string
  icon:  string
  color: string
}> = {
  media_brand:      { label: 'Media Brand',     icon: '📰', color: 'text-blue-400'   },
  meme_account:     { label: 'Meme Account',    icon: '😂', color: 'text-amber-400'  },
  news_outlet:      { label: 'News Outlet',     icon: '📡', color: 'text-cyan-400'   },
  influencer:       { label: 'Influencer',      icon: '⭐', color: 'text-purple-400' },
  competitor_brand: { label: 'Competitor',      icon: '⚔️', color: 'text-red-400'    },
  platform:         { label: 'Platform',        icon: '🌐', color: 'text-zinc-400'   },
  other:            { label: 'Other',           icon: '📌', color: 'text-zinc-500'   },
}

export const SOURCE_CONFIG: Record<CompetitorSourceType, {
  label: string
  icon:  string
  canAutoFetch: boolean   // RSS/Atom can be fetched server-side
}> = {
  rss:       { label: 'RSS Feed',   icon: '📡', canAutoFetch: true  },
  atom:      { label: 'Atom Feed',  icon: '⚛️', canAutoFetch: true  },
  twitter:   { label: 'Twitter/X',  icon: '𝕏',  canAutoFetch: false },
  instagram: { label: 'Instagram',  icon: '📸', canAutoFetch: false },
  youtube:   { label: 'YouTube',    icon: '▶️', canAutoFetch: false },
  tiktok:    { label: 'TikTok',     icon: '🎵', canAutoFetch: false },
  facebook:  { label: 'Facebook',   icon: '📘', canAutoFetch: false },
  reddit:    { label: 'Reddit',     icon: '👽', canAutoFetch: true  },
  website:   { label: 'Website',    icon: '🌐', canAutoFetch: false },
  other:     { label: 'Other',      icon: '🔗', canAutoFetch: false },
}

// ── Input types ───────────────────────────────────────────────────────────────

export interface CreateCompetitorInput {
  name:        string
  description: string | null
  category:    CompetitorCategory
  avatar_url:  string | null
  website_url: string | null
  notes:       string | null
}

export interface UpdateCompetitorInput extends Partial<CreateCompetitorInput> {
  is_active?: boolean
}

export interface CreateSourceInput {
  source_type: CompetitorSourceType
  url:         string
  handle:      string | null
  label:       string | null
}

export interface IngestPostInput {
  source_id:    string
  external_id:  string | null
  title:        string | null
  content:      string | null
  url:          string | null
  thumbnail_url: string | null
  published_at: string
  topic_tags?:  string[]
}
