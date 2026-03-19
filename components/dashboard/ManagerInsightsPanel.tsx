'use client'

import Link from 'next/link'
import {
  Zap, Clock, Laugh, MessageCircle, Play,
  ShieldAlert, TrendingDown, Users, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { ManagerAlert, ManagerAlertType } from '@/lib/dashboard/dashboard.types'

// ---------------------------------------------------------------------------
// Per-type visual config
// ---------------------------------------------------------------------------

const TYPE_CONFIG: Record<ManagerAlertType, {
  icon:        React.ComponentType<{ className?: string }>
  iconColor:   string
  borderColor: string
  bgColor:     string
  labelColor:  string
}> = {
  POST_NOW:       { icon: Zap,           iconColor: 'text-red-400',    borderColor: 'border-l-red-500',   bgColor: 'bg-red-500/5',    labelColor: 'text-red-400' },
  TREND_DYING:    { icon: TrendingDown,  iconColor: 'text-amber-400',  borderColor: 'border-l-amber-500', bgColor: 'bg-amber-500/5',  labelColor: 'text-amber-400' },
  MEME_OPPORTUNITY:{ icon: Laugh,        iconColor: 'text-purple-400', borderColor: 'border-l-purple-500',bgColor: 'bg-purple-500/5', labelColor: 'text-purple-400' },
  HIGH_DEBATE:    { icon: MessageCircle, iconColor: 'text-blue-400',   borderColor: 'border-l-blue-500',  bgColor: 'bg-blue-500/5',   labelColor: 'text-blue-400' },
  REEL_OVER_STATIC:{ icon: Play,         iconColor: 'text-teal-400',   borderColor: 'border-l-teal-500',  bgColor: 'bg-teal-500/5',   labelColor: 'text-teal-400' },
  TOO_RISKY:      { icon: ShieldAlert,   iconColor: 'text-orange-400', borderColor: 'border-l-orange-500',bgColor: 'bg-orange-500/5', labelColor: 'text-orange-400' },
  TOO_SATURATED:  { icon: TrendingDown,  iconColor: 'text-zinc-400',   borderColor: 'border-l-zinc-600',  bgColor: 'bg-zinc-800/60',  labelColor: 'text-zinc-400' },
  COMPETITOR_GAP: { icon: Users,         iconColor: 'text-emerald-400',borderColor: 'border-l-emerald-500',bgColor: 'bg-emerald-500/5',labelColor: 'text-emerald-400' },
}

const URGENCY_LABEL: Record<ManagerAlert['urgency'], string> = {
  critical: 'Critical',
  high:     'High',
  medium:   'Medium',
  low:      'Low',
}

// ---------------------------------------------------------------------------
// Single insight card
// ---------------------------------------------------------------------------

function InsightCard({ alert }: { alert: ManagerAlert }) {
  const cfg  = TYPE_CONFIG[alert.type]
  const Icon = cfg.icon

  return (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-xl border border-border border-l-[3px] transition-all hover:bg-surface-raised',
      cfg.borderColor,
      cfg.bgColor,
    )}>
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        <Icon className={cn('h-4 w-4', cfg.iconColor)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <p className={cn('text-xs font-bold', cfg.labelColor)}>{alert.title}</p>
          <span className={cn(
            'text-[9px] font-medium px-1.5 py-0.5 rounded-full border',
            alert.urgency === 'critical' && 'bg-red-500/10 border-red-500/30 text-red-400',
            alert.urgency === 'high'     && 'bg-amber-500/10 border-amber-500/30 text-amber-400',
            alert.urgency === 'medium'   && 'bg-blue-500/10 border-blue-500/30 text-blue-400',
            alert.urgency === 'low'      && 'bg-zinc-800 border-zinc-700 text-zinc-500',
          )}>
            {URGENCY_LABEL[alert.urgency]}
          </span>
        </div>

        <p className="text-[11px] text-muted leading-relaxed">{alert.message}</p>

        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/trends/${alert.trend.id}`}
            className="text-[10px] text-zinc-600 hover:text-muted transition-colors truncate max-w-[200px]"
          >
            → {alert.trend.title}
          </Link>
          <Link
            href={alert.primaryAction.href}
            className={cn(
              'flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md border transition-all flex-shrink-0',
              'bg-surface border-border text-muted hover:text-foreground hover:border-zinc-600',
            )}
          >
            {alert.primaryAction.label}
            <ChevronRight className="h-2.5 w-2.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

interface ManagerInsightsPanelProps {
  alerts: ManagerAlert[]
}

export function ManagerInsightsPanel({ alerts }: ManagerInsightsPanelProps) {
  if (alerts.length === 0) return null

  const critical = alerts.filter((a) => a.urgency === 'critical' || a.urgency === 'high')
  const rest      = alerts.filter((a) => a.urgency === 'medium' || a.urgency === 'low')

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-surface-raised">
        <div className="relative">
          <Zap className="h-4 w-4 text-accent" />
        </div>
        <span className="font-display font-semibold text-sm text-foreground">Manager Mode</span>
        <span className="text-[10px] text-zinc-600 ml-0.5">— AI content insights</span>
        <div className="ml-auto flex items-center gap-1.5">
          {critical.length > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-accent/15 border border-accent/30 text-red-400">
              {critical.length} urgent
            </span>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="p-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
        {alerts.map((alert) => (
          <InsightCard key={alert.id} alert={alert} />
        ))}
      </div>
    </div>
  )
}
