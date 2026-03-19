// =============================================================================
// OUTRAGE Content Engine — TypeScript Types
// Auto-derived from supabase/schema.sql v1.0.0
// =============================================================================

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type SourceType = 'rss' | 'reddit' | 'youtube' | 'twitter' | 'instagram' | 'tiktok' | 'manual' | 'api'
export type SourceStatus = 'active' | 'paused' | 'error' | 'pending'
export type SourceItemStatus = 'new' | 'processed' | 'clustered' | 'ignored' | 'error'
export type SyncStatus = 'running' | 'success' | 'partial' | 'failed'
export type ClusterStatus = 'new' | 'active' | 'hot' | 'declining' | 'archived' | 'acted_on'
export type ContentCategory = 'celebrity' | 'music' | 'sports' | 'politics' | 'entertainment' | 'meme' | 'viral' | 'fashion' | 'tech' | 'culture' | 'crime' | 'drama' | 'other'
export type EntityType = 'person' | 'brand' | 'place' | 'event' | 'show' | 'song' | 'movie' | 'topic' | 'hashtag' | 'other'
export type ContentType = 'headline' | 'hook' | 'caption' | 'meme_idea' | 'reel_idea' | 'tweet' | 'poll' | 'post_copy' | 'thread' | 'short_form_video' | 'long_form' | 'newsletter'
export type ContentAngle = 'outrage' | 'humor' | 'informational' | 'reaction' | 'hot_take' | 'educational' | 'inspirational' | 'controversial' | 'nostalgic'
export type ContentPlatform = 'instagram' | 'tiktok' | 'twitter' | 'youtube' | 'threads' | 'facebook' | 'linkedin' | 'newsletter' | 'all'
export type VariantStatus = 'draft' | 'review' | 'approved' | 'rejected' | 'published' | 'archived'
export type MemeStatus = 'draft' | 'generated' | 'approved' | 'rejected' | 'published'
export type AssetType = 'image' | 'video' | 'gif' | 'audio' | 'document' | 'template' | 'other'
export type PipelineStage = 'idea' | 'drafting' | 'review' | 'approved' | 'scheduling' | 'published' | 'archived'
export type NotificationType = 'trend_alert' | 'score_threshold' | 'trend_spike' | 'content_approved' | 'content_rejected' | 'mention' | 'system' | 'competitor_alert'
export type NotificationSeverity = 'info' | 'medium' | 'high' | 'critical'
export type AlertTriggerType = 'score_threshold' | 'trend_spike' | 'keyword_match' | 'competitor_mention' | 'source_error' | 'new_trend'
export type WorkflowStatus = 'active' | 'inactive' | 'error' | 'running'
export type OrgPlan = 'free' | 'pro' | 'enterprise'
export type MemberRole = 'owner' | 'admin' | 'editor' | 'viewer'
export type PromptType = 'scoring' | 'content' | 'meme' | 'clustering' | 'brand'

// ---------------------------------------------------------------------------
// Auth / Org Domain
// ---------------------------------------------------------------------------

export interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  plan: OrgPlan
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: MemberRole
  timezone: string
  preferences: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface OrgMember {
  id: string
  org_id: string
  user_id: string
  role: MemberRole
  invited_by: string | null
  joined_at: string
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Ingestion Domain
// ---------------------------------------------------------------------------

export interface Source {
  id: string
  org_id: string
  name: string
  type: SourceType
  url: string | null
  config: Record<string, unknown>
  status: SourceStatus
  category: ContentCategory | null
  tags: string[]
  fetch_interval_minutes: number
  last_fetched_at: string | null
  error_count: number
  last_error: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface SourceItem {
  id: string
  source_id: string
  external_id: string | null
  title: string | null
  body: string | null
  url: string | null
  author: string | null
  thumbnail_url: string | null
  media_urls: string[]
  published_at: string | null
  fetched_at: string
  status: SourceItemStatus
  keywords: string[]
  entities: Record<string, unknown>
  sentiment_score: number | null
  engagement_data: Record<string, unknown>
  raw_data: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface SourceSyncLog {
  id: string
  source_id: string
  status: SyncStatus
  items_fetched: number
  items_new: number
  items_duplicate: number
  items_error: number
  error_message: string | null
  started_at: string
  completed_at: string | null
  metadata: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Trend Domain
// ---------------------------------------------------------------------------

export interface TrendCluster {
  id: string
  org_id: string
  title: string
  summary: string | null
  category: ContentCategory | null
  status: ClusterStatus
  overall_score: number
  source_count: number
  keywords: string[]
  thumbnail_url: string | null
  first_seen_at: string
  last_seen_at: string
  peaked_at: string | null
  acted_on: boolean
  acted_on_at: string | null
  acted_on_by: string | null
  is_manual: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface TrendClusterItem {
  id: string
  cluster_id: string
  source_item_id: string
  relevance_score: number | null
  created_at: string
}

export interface TrendEntity {
  id: string
  name: string
  type: EntityType
  aliases: string[]
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface TrendClusterEntity {
  cluster_id: string
  entity_id: string
  mention_count: number
  created_at: string
}

export interface TrendScore {
  id: string
  cluster_id: string
  viral_potential: number
  brand_fit: number
  urgency: number
  controversy_level: number
  audience_relevance: number
  overall_score: number
  scoring_model: string | null
  scoring_prompt_version: string | null
  reasoning: string | null
  raw_response: Record<string, unknown>
  scored_at: string
  scored_by: string | null
}

// ---------------------------------------------------------------------------
// Brand / AI Domain
// ---------------------------------------------------------------------------

export interface PromptTemplate {
  id: string
  org_id: string
  name: string
  description: string | null
  prompt_type: PromptType
  system_prompt: string
  user_prompt: string
  variables: string[]
  model: string
  temperature: number
  max_tokens: number
  version: number
  is_active: boolean
  is_default: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface BrandSettings {
  id: string
  org_id: string
  name: string
  voice_description: string | null
  system_prompt: string | null
  tone_keywords: string[]
  avoid_keywords: string[]
  target_audience: string | null
  content_pillars: string[]
  hashtag_sets: Record<string, string[]>
  posting_guidelines: string | null
  color_palette: string[]
  font_preferences: string[]
  logo_url: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Content Domain
// ---------------------------------------------------------------------------

export interface ContentIdea {
  id: string
  cluster_id: string | null
  org_id: string
  type: ContentType
  angle: ContentAngle
  platform: ContentPlatform
  content: string
  hook: string | null
  cta: string | null
  tags: string[]
  is_saved: boolean
  is_used: boolean
  used_at: string | null
  generated_by: string | null
  prompt_template_id: string | null
  model_used: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ContentVariant {
  id: string
  idea_id: string | null
  cluster_id: string | null
  org_id: string
  title: string | null
  body: string
  platform: ContentPlatform
  type: ContentType
  status: VariantStatus
  version: number
  parent_variant_id: string | null
  metadata: Record<string, unknown>
  scheduled_for: string | null
  published_at: string | null
  created_by: string | null
  assigned_to: string | null
  approved_by: string | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Meme Domain
// ---------------------------------------------------------------------------

export interface MemeTemplate {
  id: string
  name: string
  external_id: string | null
  source: string
  image_url: string
  thumbnail_url: string | null
  box_count: number
  tags: string[]
  usage_count: number
  is_active: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Meme {
  id: string
  cluster_id: string | null
  variant_id: string | null
  template_id: string | null
  org_id: string
  captions: string[]
  generated_url: string | null
  asset_id: string | null
  status: MemeStatus
  generation_params: Record<string, unknown>
  created_by: string | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Asset Domain
// ---------------------------------------------------------------------------

export interface Asset {
  id: string
  org_id: string
  name: string
  type: AssetType
  url: string
  storage_path: string | null
  mime_type: string | null
  file_size_bytes: number | null
  width: number | null
  height: number | null
  duration_seconds: number | null
  alt_text: string | null
  tags: string[]
  metadata: Record<string, unknown>
  is_archived: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Pipeline / Calendar Domain
// ---------------------------------------------------------------------------

export interface PipelineStageConfig {
  id: string
  org_id: string
  name: string
  stage: PipelineStage
  color: string
  position: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ContentPipelineItem {
  id: string
  org_id: string
  variant_id: string | null
  cluster_id: string | null
  stage: PipelineStage
  stage_config_id: string | null
  position: number
  due_date: string | null
  assigned_to: string | null
  notes: string | null
  metadata: Record<string, unknown>
  moved_at: string | null
  moved_by: string | null
  created_at: string
  updated_at: string
}

export interface ContentCalendarItem {
  id: string
  org_id: string
  pipeline_item_id: string | null
  variant_id: string | null
  cluster_id: string | null
  platform: ContentPlatform
  scheduled_at: string
  posted_at: string | null
  title: string | null
  status: VariantStatus
  recurring_rule: string | null
  color: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Publishing Domain
// ---------------------------------------------------------------------------

export interface PostResult {
  id: string
  org_id: string
  variant_id: string | null
  calendar_item_id: string | null
  platform: ContentPlatform
  external_post_id: string | null
  post_url: string | null
  published_at: string
  content_snapshot: string | null
  created_at: string
  updated_at: string
}

export interface PerformanceMetric {
  id: string
  post_result_id: string
  measured_at: string
  likes: number
  comments: number
  shares: number
  saves: number
  views: number
  reach: number
  impressions: number
  clicks: number
  engagement_rate: number
  follower_change: number
  extra_metrics: Record<string, unknown>
  created_at: string
}

// ---------------------------------------------------------------------------
// Notifications Domain
// ---------------------------------------------------------------------------

export interface AlertRule {
  id: string
  org_id: string
  name: string
  trigger_type: AlertTriggerType
  threshold: number | null
  keywords: string[]
  categories: string[]
  platforms: string[]
  channels: string[]
  cooldown_hours: number
  enabled: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  org_id: string
  user_id: string
  type: NotificationType
  severity: NotificationSeverity
  title: string
  message: string
  cluster_id: string | null
  rule_id: string | null
  metadata: Record<string, unknown>
  is_read: boolean
  read_at: string | null
  is_dismissed: boolean
  dismissed_at: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Integration Domain
// ---------------------------------------------------------------------------

export interface Workflow {
  id: string
  org_id: string
  name: string
  n8n_workflow_id: string | null
  status: WorkflowStatus
  description: string | null
  trigger_type: string | null
  schedule: string | null
  last_run_at: string | null
  last_run_status: string | null
  run_count: number
  error_count: number
  last_error: string | null
  config: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CanvaExport {
  id: string
  org_id: string
  cluster_id: string | null
  variant_id: string | null
  design_url: string | null
  edit_url: string | null
  preview_url: string | null
  platform: ContentPlatform | null
  design_name: string | null
  exported_at: string
  created_by: string | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Competitor Domain
// ---------------------------------------------------------------------------

export interface CompetitorWatchlist {
  id: string
  org_id: string
  name: string
  platform: string
  handle: string
  profile_url: string | null
  notes: string | null
  is_active: boolean
  last_checked_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Tags Domain
// ---------------------------------------------------------------------------

export interface Tag {
  id: string
  org_id: string
  name: string
  color: string
  created_at: string
  updated_at: string
}

export interface ClusterTag { cluster_id: string; tag_id: string; created_at: string }
export interface ContentIdeaTag { idea_id: string; tag_id: string; created_at: string }
export interface AssetTag { asset_id: string; tag_id: string; created_at: string }

// ---------------------------------------------------------------------------
// Audit Domain
// ---------------------------------------------------------------------------

export interface AuditLog {
  id: string
  org_id: string | null
  user_id: string | null
  action: string
  resource_type: string
  resource_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Composite / Joined Types
// ---------------------------------------------------------------------------

export interface TrendClusterWithScore extends TrendCluster {
  latest_score?: TrendScore | null
}

export interface TrendClusterWithItems extends TrendCluster {
  trend_cluster_items?: TrendClusterItem[]
}

export interface ContentIdeaWithTags extends ContentIdea {
  content_idea_tags?: Array<{ tag: Tag }>
}

export interface ContentVariantWithIdea extends ContentVariant {
  content_idea?: ContentIdea | null
}

export interface PipelineItemWithVariant extends ContentPipelineItem {
  content_variant?: ContentVariant | null
  trend_cluster?: TrendCluster | null
}

export interface CalendarItemWithVariant extends ContentCalendarItem {
  content_variant?: ContentVariant | null
  trend_cluster?: TrendCluster | null
}

export interface PostResultWithMetrics extends PostResult {
  performance_metrics?: PerformanceMetric[]
  latest_metrics?: PerformanceMetric | null
}

// ---------------------------------------------------------------------------
// Webhook Payloads
// ---------------------------------------------------------------------------

export interface IngestWebhookPayload {
  source_id: string
  items: Array<{
    external_id?: string
    title: string
    body?: string
    url?: string
    author?: string
    thumbnail_url?: string
    media_urls?: string[]
    published_at?: string
    keywords?: string[]
    entities?: Record<string, unknown>
    engagement_data?: Record<string, unknown>
    sentiment_score?: number
    raw_data?: Record<string, unknown>
  }>
}

export interface ScoringWebhookPayload {
  /** New schema field — preferred */
  cluster_id?: string
  /** Legacy n8n field — still accepted */
  trend_id?: string
  scores: {
    virality_score?: number
    relevance_score?: number
    longevity_score?: number
    brand_fit_score?: number
    overall_score: number
    /** New schema field */
    reasoning?: string
    /** Legacy field — still accepted */
    scoring_reasoning?: string
  }
}

export interface SuggestionsWebhookPayload {
  /** New schema field — preferred */
  cluster_id?: string
  /** Legacy n8n field — still accepted */
  trend_id?: string
  suggestions: Array<{
    type: ContentType
    content: string
    angle?: ContentAngle
    platform?: ContentPlatform
    hook?: string
    cta?: string
    ai_model?: string
    confidence?: number
  }>
}

export interface AlertWebhookPayload {
  trend_id?: string
  rule_id?: string
  title: string
  message: string
  severity?: NotificationSeverity
}

// ---------------------------------------------------------------------------
// Filter / Query Types
// ---------------------------------------------------------------------------

export interface TrendFilters {
  category?: ContentCategory | ''
  status?: ClusterStatus | ''
  minScore?: number
  timeRange?: '1h' | '6h' | '24h' | '7d' | '30d' | 'all'
  search?: string
  tags?: string[]
}

export interface ContentFilters {
  platform?: ContentPlatform | ''
  type?: ContentType | ''
  savedOnly?: boolean
  usedOnly?: boolean
  cluster_id?: string
}

export interface PipelineFilters {
  stage?: PipelineStage | ''
  assigned_to?: string
  platform?: ContentPlatform | ''
}

// ---------------------------------------------------------------------------
// API Response Types
// ---------------------------------------------------------------------------

export interface ApiResponse<T> {
  data: T | null
  error: string | null
  count?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  hasMore: boolean
}

// ---------------------------------------------------------------------------
// UI Types
// ---------------------------------------------------------------------------

export interface NavItem {
  label: string
  href: string
  icon?: React.ComponentType<{ className?: string }>
  badge?: number | string
}

export interface StatsCard {
  label: string
  value: string | number
  delta?: number
  deltaLabel?: string
}

export interface ScoreBreakdown {
  viral_potential: number
  brand_fit: number
  urgency: number
  controversy_level: number
  audience_relevance: number
  overall: number
}

// ---------------------------------------------------------------------------
// Backward-Compatibility Aliases
// (existing components reference old names — these keep them compiling
//  while the codebase migrates to the new naming convention)
// ---------------------------------------------------------------------------

/** @deprecated Use TrendCluster */
export type Trend = TrendCluster
/** @deprecated Use ContentCategory */
export type TrendCategory = ContentCategory
/** @deprecated Use Notification */
export type Alert = Notification
/** @deprecated Use ContentIdea */
export type ContentSuggestion = ContentIdea
/** @deprecated Use ContentVariant */
export type ContentPiece = ContentVariant
/** @deprecated Use VariantStatus */
export type ContentStatus = VariantStatus

// Webhook payload aliases (old naming convention)
/** @deprecated Use IngestWebhookPayload */
export type WebhookIngestPayload = IngestWebhookPayload
/** @deprecated Use ScoringWebhookPayload */
export type WebhookScoringPayload = ScoringWebhookPayload
/** @deprecated Use SuggestionsWebhookPayload */
export type WebhookSuggestionsPayload = SuggestionsWebhookPayload
/** @deprecated Use AlertWebhookPayload */
export type WebhookAlertPayload = AlertWebhookPayload

/** @deprecated Use ClusterStatus */
export type TrendStatus = ClusterStatus
/** @deprecated Use NotificationSeverity */
export type AlertSeverity = NotificationSeverity
/** @deprecated Use NotificationType */
export type AlertType = NotificationType
/** @deprecated Use ContentType */
export type SuggestionType = ContentType
/** @deprecated Use ContentPlatform */
export type Platform = ContentPlatform

// ---------------------------------------------------------------------------
// Scoring Engine Types
// ---------------------------------------------------------------------------

export type RecommendedAction = 'post_now' | 'post_soon' | 'save_for_later' | 'ignore' | 'too_risky'

export interface TrendScoreDimension {
  score: number
  label: string
  factors: string[]
}

export interface TrendScoreExplanations {
  virality: TrendScoreDimension
  outrage_fit: TrendScoreDimension
  meme_potential: TrendScoreDimension
  debate_potential: TrendScoreDimension
  urgency: TrendScoreDimension
  shelf_life: TrendScoreDimension
  visual_potential: TrendScoreDimension
  reel_potential: TrendScoreDimension
  instagram_shareability: TrendScoreDimension
  brand_safety: TrendScoreDimension
  summary: string
}

/** Extended trend score row including all v2 engine dimensions */
export interface TrendScoreV2 extends TrendScore {
  outrage_fit_score: number | null
  meme_potential_score: number | null
  debate_potential_score: number | null
  shelf_life_score: number | null
  visual_potential_score: number | null
  reel_potential_score: number | null
  instagram_shareability_score: number | null
  brand_safety_score: number | null
  total_priority_score: number | null
  recommended_action: RecommendedAction | null
  score_explanations: TrendScoreExplanations
  recommended_formats: ContentType[]
  scoring_engine_version: string | null
}

/** Org-level scoring weight configuration row */
export interface ScoringWeights {
  id: string
  org_id: string
  name: string
  description: string | null
  is_active: boolean
  preset: 'default' | 'conservative' | 'viral_maximiser' | 'custom' | null
  w_virality: number
  w_outrage_fit: number
  w_urgency: number
  w_debate_potential: number
  w_meme_potential: number
  w_reel_potential: number
  w_instagram_shareability: number
  w_visual_potential: number
  w_shelf_life: number
  t_post_now_priority: number
  t_post_now_urgency: number
  t_post_now_safety: number
  t_post_soon_priority: number
  t_post_soon_safety: number
  t_save_for_later_priority: number
  t_save_for_later_shelf_life: number
  t_too_risky_safety: number
  engagement_viral_floor: number
  saturation_penalty_after: number
  saturation_penalty_per_source: number
  created_by: string | null
  created_at: string
  updated_at: string
}

/** Cluster with its latest full v2 score attached */
export interface TrendClusterWithFullScore extends TrendCluster {
  latest_score?: TrendScoreV2 | null
}
