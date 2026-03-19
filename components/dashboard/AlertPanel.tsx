'use client'

import Link from 'next/link'
import { Bell, ArrowRight, AlertTriangle, Info, Zap } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { timeAgo } from '@/lib/utils/format'
import { useMarkAlertRead } from '@/hooks/useAlerts'
import type { Alert } from '@/types'
import { cn } from '@/lib/utils/cn'

interface AlertPanelProps {
  alerts: Alert[]
}

function AlertIcon({ severity }: { severity: Alert['severity'] }) {
  if (severity === 'critical' || severity === 'high') return <Zap className="h-3.5 w-3.5 text-accent" />
  if (severity === 'medium') return <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
  return <Info className="h-3.5 w-3.5 text-blue-400" />
}

const severityVariant: Record<Alert['severity'], 'danger' | 'warning' | 'info'> = {
  critical: 'danger',
  high: 'danger',
  medium: 'warning',
  info: 'info',
}

export function AlertPanel({ alerts }: AlertPanelProps) {
  const { mutate: markRead } = useMarkAlertRead()

  return (
    <Card padding="none">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted" />
          <span className="font-display font-semibold text-sm text-foreground">Alerts</span>
          {alerts.length > 0 && (
            <Badge variant="accent" size="sm">{alerts.length}</Badge>
          )}
        </div>
        <Link href="/alerts">
          <Button variant="ghost" size="xs" icon={<ArrowRight className="h-3.5 w-3.5" />} iconPosition="right">
            All
          </Button>
        </Link>
      </div>

      <div className="divide-y divide-border max-h-80 overflow-y-auto no-scrollbar">
        {alerts.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<Bell className="h-6 w-6" />}
              title="No new alerts"
              compact
            />
          </div>
        ) : (
          alerts.slice(0, 8).map((alert) => (
            <div
              key={alert.id}
              className={cn(
                'flex gap-3 p-3 hover:bg-surface-raised transition-colors cursor-pointer',
                !alert.is_read && 'border-l-2 border-accent'
              )}
              onClick={() => !alert.is_read && markRead(alert.id)}
            >
              <div className="shrink-0 mt-0.5">
                <AlertIcon severity={alert.severity} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{alert.title}</p>
                {alert.message && (
                  <p className="text-[11px] text-muted truncate mt-0.5">{alert.message}</p>
                )}
                <p className="text-[10px] text-zinc-600 mt-1">{timeAgo(alert.created_at)}</p>
              </div>
              <Badge variant={severityVariant[alert.severity]} size="sm" className="shrink-0 self-start">
                {alert.severity}
              </Badge>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}
