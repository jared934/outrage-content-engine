import type { NotificationSeverity, NotificationType } from '@/types'

// ─── Extended alert types ────────────────────────────────────────────────────

export type AlertRuleType =
  | 'score_threshold'
  | 'trend_spike'
  | 'keyword_match'
  | 'competitor_mention'
  | 'source_error'
  | 'new_trend'
  | 'post_now'
  | 'trend_dying'
  | 'meme_worthy'
  | 'saturated'
  | 'risky'
  | 'digest'

export type ExtendedNotificationType = NotificationType
  | 'post_now'
  | 'trend_dying'
  | 'meme_worthy'
  | 'saturated_trend'
  | 'risky_trend'
  | 'urgent_trend'
  | 'morning_digest'
  | 'evening_digest'

// ─── Alert rule (extended) ───────────────────────────────────────────────────

export interface AlertRuleV2 {
  id:             string
  org_id:         string
  name:           string
  description:    string | null
  trigger_type:   AlertRuleType
  threshold:      number | null
  keywords:       string[]
  categories:     string[]
  platforms:      string[]
  channels:       string[]
  cooldown_hours: number
  enabled:        boolean
  notify_in_app:  boolean
  notify_email:   boolean
  webhook_url:    string | null
  created_by:     string | null
  created_at:     string
  updated_at:     string
}

export type CreateAlertRuleInput = Pick<AlertRuleV2,
  'name' | 'trigger_type' | 'notify_in_app' | 'notify_email'
> & {
  org_id:          string
  description?:    string | null
  threshold?:      number | null
  keywords?:       string[]
  categories?:     string[]
  cooldown_hours?: number
  webhook_url?:    string | null
}

export type UpdateAlertRuleInput = Partial<Omit<AlertRuleV2,
  'id' | 'org_id' | 'created_by' | 'created_at' | 'updated_at'
>>

// ─── Digest ──────────────────────────────────────────────────────────────────

export type DigestType = 'morning' | 'evening'

export interface DigestTrendItem {
  id:                   string
  title:                string
  overall_score:        number
  total_priority_score: number | null
  recommended_action:   string | null
  urgency_score:        number | null
  meme_potential_score: number | null
  category:             string | null
  source_count:         number
}

export interface DigestPayload {
  type:            DigestType
  generated_at:    string
  org_id:          string
  // Morning
  top_trends?:     DigestTrendItem[]
  post_now_count?: number
  meme_ready_count?: number
  new_trends_24h?: number
  summary?:        string
  // Evening
  posted_today?:   number
  ideas_generated?: number
  trends_reviewed?: number
  top_alert_count?: number
  highlights?:     DigestTrendItem[]
}

export interface Digest {
  id:           string
  org_id:       string
  type:         DigestType
  payload:      DigestPayload
  delivered_at: string | null
  created_at:   string
}

// ─── Delivery webhook payload ─────────────────────────────────────────────────

export interface WebhookAlertPayload {
  event:       'alert' | 'digest'
  type:        string
  severity:    NotificationSeverity
  title:       string
  message:     string
  cluster_id:  string | null
  cluster_url: string | null
  timestamp:   string
  org_id:      string
  // Platform-specific shaping happens in n8n
  data:        Record<string, unknown>
}

// ─── Alert rule configs (used in UI) ─────────────────────────────────────────

export interface AlertRuleConfig {
  trigger_type:   AlertRuleType
  label:          string
  description:    string
  icon:           string
  defaultThreshold?: number
  thresholdLabel?:   string
  severity:          NotificationSeverity
  canWebhook:        boolean
}

export const ALERT_RULE_CONFIGS: AlertRuleConfig[] = [
  {
    trigger_type:     'post_now',
    label:            'Post Now Alert',
    description:      'Fire when a trend reaches post-worthy urgency',
    icon:             '⚡',
    severity:         'critical',
    canWebhook:       true,
  },
  {
    trigger_type:     'trend_dying',
    label:            'Trend Dying Warning',
    description:      'Warn when a trend\'s shelf life is expiring',
    icon:             '⏳',
    severity:         'high',
    canWebhook:       true,
  },
  {
    trigger_type:     'meme_worthy',
    label:            'Meme-Worthy Alert',
    description:      'Alert when meme potential spikes on a trend',
    icon:             '😂',
    severity:         'medium',
    defaultThreshold: 76,
    thresholdLabel:   'Meme score minimum',
    canWebhook:       true,
  },
  {
    trigger_type:     'score_threshold',
    label:            'Score Threshold Alert',
    description:      'Fire when a trend\'s priority score crosses a threshold',
    icon:             '📊',
    severity:         'high',
    defaultThreshold: 75,
    thresholdLabel:   'Minimum priority score',
    canWebhook:       true,
  },
  {
    trigger_type:     'saturated',
    label:            'Saturated Trend Warning',
    description:      'Warn when a trend is oversaturated',
    icon:             '🌊',
    severity:         'medium',
    canWebhook:       false,
  },
  {
    trigger_type:     'risky',
    label:            'Risky Trend Warning',
    description:      'Flag trends with low brand safety score',
    icon:             '⚠️',
    severity:         'high',
    defaultThreshold: 38,
    thresholdLabel:   'Brand safety floor',
    canWebhook:       true,
  },
  {
    trigger_type:     'trend_spike',
    label:            'Trend Spike Alert',
    description:      'Detect sudden spikes in trend activity',
    icon:             '📈',
    severity:         'high',
    canWebhook:       true,
  },
  {
    trigger_type:     'new_trend',
    label:            'New Trend Detected',
    description:      'Notify when a new trend cluster is created',
    icon:             '🆕',
    severity:         'info',
    canWebhook:       false,
  },
  {
    trigger_type:     'digest',
    label:            'Daily Digest',
    description:      'Morning and evening digest summaries',
    icon:             '📋',
    severity:         'info',
    canWebhook:       true,
  },
]

// ─── Severity display config ──────────────────────────────────────────────────

export const SEVERITY_CONFIG: Record<NotificationSeverity, {
  label: string; bgClass: string; textClass: string; borderClass: string; dotClass: string
}> = {
  critical: {
    label: 'Critical', bgClass: 'bg-red-950/60', textClass: 'text-red-400',
    borderClass: 'border-red-800/50', dotClass: 'bg-red-500',
  },
  high: {
    label: 'High', bgClass: 'bg-orange-950/50', textClass: 'text-orange-400',
    borderClass: 'border-orange-800/40', dotClass: 'bg-orange-500',
  },
  medium: {
    label: 'Medium', bgClass: 'bg-amber-950/50', textClass: 'text-amber-400',
    borderClass: 'border-amber-800/40', dotClass: 'bg-amber-500',
  },
  info: {
    label: 'Info', bgClass: 'bg-blue-950/40', textClass: 'text-blue-400',
    borderClass: 'border-blue-800/30', dotClass: 'bg-blue-500',
  },
}

export const TYPE_ICONS: Record<string, string> = {
  post_now:        '⚡',
  trend_dying:     '⏳',
  meme_worthy:     '😂',
  saturated_trend: '🌊',
  risky_trend:     '⚠️',
  urgent_trend:    '🔥',
  trend_alert:     '📈',
  trend_spike:     '📈',
  score_threshold: '📊',
  new_trend:       '🆕',
  morning_digest:  '🌅',
  evening_digest:  '🌆',
  competitor_alert:'👁️',
  system:          'ℹ️',
  mention:         '💬',
  content_approved:'✅',
  content_rejected:'❌',
}
