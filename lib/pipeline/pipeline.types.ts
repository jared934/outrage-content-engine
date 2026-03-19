export type PipelineStatus =
  | 'detected'
  | 'worth_exploring'
  | 'drafting'
  | 'designed'
  | 'approved'
  | 'scheduled'
  | 'posted'
  | 'archived'
  | 'rejected'

export interface PipelineItem {
  id:          string
  org_id:      string
  cluster_id:  string | null
  idea_id:     string | null
  title:       string
  headline:    string | null
  caption:     string | null
  format:      string | null
  platform:    string | null
  status:      PipelineStatus
  urgency:     number
  position:    number
  design_link: string | null
  asset_refs:  string[]
  tags:        string[]
  notes:       string | null
  owner_id:    string | null
  due_at:      string | null
  publish_at:  string | null
  approved_at: string | null
  approved_by: string | null
  metadata:    Record<string, unknown>
  created_at:  string
  updated_at:  string
  // enriched client-side
  cluster_title?: string | null
}

export type CreatePipelineItemInput = Pick<
  PipelineItem,
  'title' | 'format' | 'platform' | 'status' | 'urgency'
> & {
  org_id:     string
  cluster_id?: string | null
  idea_id?:    string | null
  headline?:   string | null
  caption?:    string | null
  notes?:      string | null
  tags?:       string[]
  due_at?:     string | null
  publish_at?: string | null
}

export type UpdatePipelineItemInput = Partial<Omit<PipelineItem, 'id' | 'org_id' | 'created_at' | 'updated_at' | 'cluster_title'>>

export interface PipelineStatusConfig {
  label:       string
  color:       string      // hex for inline styles
  bgClass:     string      // tailwind bg
  borderClass: string      // tailwind border
  textClass:   string      // tailwind text
  dotClass:    string      // tailwind bg for dot
  description: string
}

export const PIPELINE_STATUSES: PipelineStatus[] = [
  'detected',
  'worth_exploring',
  'drafting',
  'designed',
  'approved',
  'scheduled',
  'posted',
  'archived',
  'rejected',
]

export const STATUS_CONFIG: Record<PipelineStatus, PipelineStatusConfig> = {
  detected: {
    label: 'Detected',
    color: '#71717a',
    bgClass: 'bg-zinc-900/60',
    borderClass: 'border-zinc-700',
    textClass: 'text-zinc-400',
    dotClass: 'bg-zinc-500',
    description: 'Trend spotted, not yet evaluated',
  },
  worth_exploring: {
    label: 'Worth Exploring',
    color: '#3b82f6',
    bgClass: 'bg-blue-950/60',
    borderClass: 'border-blue-700/50',
    textClass: 'text-blue-400',
    dotClass: 'bg-blue-500',
    description: 'Has potential, ideas being formed',
  },
  drafting: {
    label: 'Drafting',
    color: '#a855f7',
    bgClass: 'bg-purple-950/60',
    borderClass: 'border-purple-700/50',
    textClass: 'text-purple-400',
    dotClass: 'bg-purple-500',
    description: 'Copy and creative being written',
  },
  designed: {
    label: 'Designed',
    color: '#6366f1',
    bgClass: 'bg-indigo-950/60',
    borderClass: 'border-indigo-700/50',
    textClass: 'text-indigo-400',
    dotClass: 'bg-indigo-500',
    description: 'Visual design complete',
  },
  approved: {
    label: 'Approved',
    color: '#22c55e',
    bgClass: 'bg-green-950/60',
    borderClass: 'border-green-700/50',
    textClass: 'text-green-400',
    dotClass: 'bg-green-500',
    description: 'Ready to go, awaiting schedule',
  },
  scheduled: {
    label: 'Scheduled',
    color: '#f59e0b',
    bgClass: 'bg-amber-950/60',
    borderClass: 'border-amber-700/50',
    textClass: 'text-amber-400',
    dotClass: 'bg-amber-500',
    description: 'Queued for a specific publish time',
  },
  posted: {
    label: 'Posted',
    color: '#10b981',
    bgClass: 'bg-emerald-950/60',
    borderClass: 'border-emerald-700/50',
    textClass: 'text-emerald-400',
    dotClass: 'bg-emerald-500',
    description: 'Live on platform',
  },
  archived: {
    label: 'Archived',
    color: '#78716c',
    bgClass: 'bg-stone-900/60',
    borderClass: 'border-stone-700/50',
    textClass: 'text-stone-500',
    dotClass: 'bg-stone-600',
    description: 'Completed or no longer relevant',
  },
  rejected: {
    label: 'Rejected',
    color: '#ef4444',
    bgClass: 'bg-red-950/60',
    borderClass: 'border-red-800/40',
    textClass: 'text-red-500',
    dotClass: 'bg-red-600',
    description: 'Not moving forward',
  },
}

export const FORMAT_OPTIONS = [
  { value: 'post',      label: 'Post',      icon: '📝' },
  { value: 'reel',      label: 'Reel',      icon: '🎬' },
  { value: 'story',     label: 'Story',     icon: '⭕' },
  { value: 'meme',      label: 'Meme',      icon: '😂' },
  { value: 'carousel',  label: 'Carousel',  icon: '🎠' },
  { value: 'tweet',     label: 'Tweet',     icon: '𝕏' },
  { value: 'article',   label: 'Article',   icon: '📰' },
  { value: 'poll',      label: 'Poll',      icon: '📊' },
]

export const FORMAT_ICONS: Record<string, string> = Object.fromEntries(
  FORMAT_OPTIONS.map((f) => [f.value, f.icon])
)

export const PLATFORM_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok',    label: 'TikTok' },
  { value: 'twitter',   label: 'Twitter/X' },
  { value: 'facebook',  label: 'Facebook' },
  { value: 'youtube',   label: 'YouTube' },
  { value: 'linkedin',  label: 'LinkedIn' },
]
