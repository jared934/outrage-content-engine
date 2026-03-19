'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Bell, CheckCheck, RefreshCw,
  ChevronRight, Zap as ZapIcon,
} from 'lucide-react'
import { Button }                 from '@/components/ui/Button'
import { Skeleton }               from '@/components/ui/Skeleton'
import { EmptyState }             from '@/components/ui/EmptyState'
import { cn }                     from '@/lib/utils/cn'
import { timeAgo }                from '@/lib/utils/format'

import { AlertRulesPanel }        from '@/components/alerts/AlertRulesPanel'
import { DigestPanel }            from '@/components/alerts/DigestPanel'
import { AlertPreferencesPanel }  from '@/components/alerts/AlertPreferencesPanel'

import {
  useAlerts, useMarkAllRead,
  useDismissAlert, useMarkAlertRead,
} from '@/hooks/useAlerts'
import { useFireAlerts }          from '@/hooks/useAlertRules'
import { SEVERITY_CONFIG, TYPE_ICONS } from '@/lib/alerts/alert.types'
import type { Notification, NotificationSeverity } from '@/types'

type Tab = 'inbox' | 'rules' | 'digest' | 'preferences'

interface AlertsClientProps {
  orgId: string
}

// ─── Alert row ───────────────────────────────────────────────────────────────

function AlertRow({ alert }: { alert: Notification }) {
  const { mutate: markRead } = useMarkAlertRead()
  const { mutate: dismiss }  = useDismissAlert()

  const sev  = SEVERITY_CONFIG[alert.severity as NotificationSeverity] ?? SEVERITY_CONFIG.info
  const icon = TYPE_ICONS[alert.type] ?? 'ℹ️'

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3.5 border-b border-border transition-colors',
        'hover:bg-surface-raised/60 group cursor-pointer',
        !alert.is_read && 'border-l-2 border-l-accent bg-accent/[0.02]',
      )}
      onClick={() => !alert.is_read && markRead(alert.id)}
    >
      <span className="text-base leading-none shrink-0 mt-0.5">{icon}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 mb-0.5">
          <p className={cn(
            'text-sm font-medium leading-snug flex-1',
            alert.is_read ? 'text-muted' : 'text-foreground',
          )}>
            {alert.title}
          </p>
          <span className={cn(
            'shrink-0 text-[9px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wide',
            sev.bgClass, sev.textClass, sev.borderClass,
          )}>
            {sev.label}
          </span>
        </div>
        <p className="text-xs text-muted leading-relaxed">{alert.message}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[10px] text-zinc-600">{timeAgo(alert.created_at)}</span>
          <span className="text-zinc-800">·</span>
          <span className="text-[10px] text-zinc-700 uppercase tracking-wide">
            {alert.type.replace(/_/g, ' ')}
          </span>
          {alert.cluster_id && (
            <Link
              href={`/trends/${alert.cluster_id}`}
              className="ml-auto flex items-center gap-0.5 text-[10px] text-zinc-600 hover:text-accent transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              View trend <ChevronRight className="h-2.5 w-2.5" />
            </Link>
          )}
        </div>
      </div>

      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {!alert.is_read && (
          <button
            onClick={(e) => { e.stopPropagation(); markRead(alert.id) }}
            className="text-[10px] px-2 py-1 rounded border border-border text-zinc-600 hover:text-foreground transition-colors"
          >
            Read
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); dismiss(alert.id) }}
          className="text-[10px] px-2 py-1 rounded border border-border text-zinc-600 hover:text-foreground transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}

// ─── Inbox tab ───────────────────────────────────────────────────────────────

function InboxTab({ orgId }: { orgId: string }) {
  const [filterSeverity, setFilterSeverity] = useState<NotificationSeverity | ''>('')
  const [showRead,       setShowRead]       = useState(false)

  const { data: alerts = [], isLoading, isError, refetch } = useAlerts({
    is_dismissed: false,
    ...(filterSeverity ? { severity: filterSeverity } : {}),
  })

  const { mutate: markAllRead, isPending: marking } = useMarkAllRead()
  const { mutate: fire,        isPending: firing  } = useFireAlerts(orgId)

  const displayed = showRead ? alerts : alerts.filter((a) => !a.is_read)
  const unread    = alerts.filter((a) => !a.is_read).length

  const severities: NotificationSeverity[] = ['critical', 'high', 'medium', 'info']

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {severities.map((s) => {
          const cfg    = SEVERITY_CONFIG[s]
          const active = filterSeverity === s
          return (
            <button
              key={s}
              onClick={() => setFilterSeverity(active ? '' : s)}
              className={cn(
                'px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide border transition-all',
                active
                  ? cn(cfg.bgClass, cfg.textClass, cfg.borderClass)
                  : 'border-border text-zinc-600 hover:border-zinc-600',
              )}
            >
              {cfg.label}
            </button>
          )
        })}
        <button
          onClick={() => setShowRead((v) => !v)}
          className={cn(
            'text-xs px-2.5 py-1 rounded-full border transition-colors',
            showRead
              ? 'border-zinc-600 text-zinc-400'
              : 'border-border text-zinc-600 hover:border-zinc-600',
          )}
        >
          {showRead ? 'Hide read' : 'Show read'}
        </button>

        <div className="flex-1" />

        <button
          onClick={() => fire()}
          disabled={firing}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border text-zinc-500 hover:border-zinc-600 hover:text-foreground transition-colors"
          title="Evaluate alert rules against current trends"
        >
          <ZapIcon className="h-3 w-3" />
          {firing ? 'Checking…' : 'Check now'}
        </button>

        {unread > 0 && (
          <Button
            variant="secondary" size="sm"
            icon={<CheckCheck className="h-3.5 w-3.5" />}
            loading={marking}
            onClick={() => markAllRead()}
          >
            Mark all read
          </Button>
        )}

        <button onClick={() => refetch()} className="text-zinc-600 hover:text-foreground transition-colors">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* List */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {isError ? (
          <div className="py-10 text-center space-y-2">
            <p className="text-sm text-red-400">Failed to load alerts.</p>
            <button
              onClick={() => refetch()}
              className="text-xs text-zinc-500 hover:text-foreground underline"
            >
              Try again
            </button>
          </div>
        ) : isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-4 py-4 flex gap-3">
                <Skeleton className="h-5 w-5 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={<Bell className="h-10 w-10" />}
              title={showRead ? 'No alerts' : 'All caught up'}
              description={
                showRead
                  ? 'No alerts match your filters.'
                  : 'No unread alerts. Hit "Check now" to evaluate your rules.'
              }
              compact
            />
          </div>
        ) : (
          displayed.map((alert) => <AlertRow key={alert.id} alert={alert} />)
        )}
      </div>

      {!isLoading && alerts.length > 0 && (
        <p className="text-xs text-zinc-600 text-right">
          {unread} unread · {alerts.length} total
        </p>
      )}
    </div>
  )
}

// ─── Main client ─────────────────────────────────────────────────────────────

export function AlertsClient({ orgId }: AlertsClientProps) {
  const [tab, setTab] = useState<Tab>('inbox')
  const { data: unreadAlerts = [] } = useAlerts({ is_dismissed: false })
  const unread = unreadAlerts.filter((a) => !a.is_read).length

  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: 'inbox',       label: 'Inbox',       badge: unread || undefined },
    { id: 'rules',       label: 'Rules' },
    { id: 'digest',      label: 'Digest' },
    { id: 'preferences', label: 'Preferences' },
  ]

  return (
    <div className="p-5 max-w-screen-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Bell className="h-4 w-4 text-muted shrink-0" />
        <h1 className="font-display font-bold text-xl text-foreground">Alerts & Digests</h1>
        {unread > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent text-white text-[10px] font-bold px-1.5">
            {unread}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0.5 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
              tab === t.id
                ? 'border-accent text-foreground'
                : 'border-transparent text-muted hover:text-foreground',
            )}
          >
            {t.label}
            {t.badge ? (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent text-white text-[9px] font-bold px-1">
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === 'inbox'       && <InboxTab orgId={orgId} />}
      {tab === 'rules'       && <AlertRulesPanel orgId={orgId} />}
      {tab === 'digest'      && <DigestPanel orgId={orgId} />}
      {tab === 'preferences' && <AlertPreferencesPanel orgId={orgId} />}
    </div>
  )
}
