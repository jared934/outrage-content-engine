'use client'

import Link from 'next/link'
import { TrendingUp, Zap, Laugh, Bookmark, BarChart2, Radio } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Skeleton } from '@/components/ui/Skeleton'
import type { DashboardStats } from '@/lib/dashboard/dashboard.types'

interface StatsRowProps {
  stats?:   DashboardStats
  loading?: boolean
}

interface StatCardProps {
  icon:    React.ComponentType<{ className?: string }>
  label:   string
  value:   number | string
  sub?:    string
  href?:   string
  color:   string
  bg:      string
  pulse?:  boolean
}

function StatCard({ icon: Icon, label, value, sub, href, color, bg, pulse }: StatCardProps) {
  const content = (
    <div className={cn(
      'relative rounded-xl border border-border bg-surface p-4 transition-all',
      href && 'hover:border-zinc-600 cursor-pointer',
    )}>
      <div className={cn('inline-flex p-2 rounded-lg mb-3', bg)}>
        <Icon className={cn('h-4 w-4', color)} />
        {pulse && (
          <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-accent">
            <span className="absolute inset-0 h-2 w-2 rounded-full bg-accent animate-ping opacity-75" />
          </span>
        )}
      </div>
      <div className="font-display font-bold text-2xl text-foreground tabular-nums leading-none">
        {value}
      </div>
      <div className="text-xs text-muted mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-zinc-600 mt-0.5">{sub}</div>}
    </div>
  )

  if (href) return <Link href={href}>{content}</Link>
  return content
}

export function StatsRow({ stats, loading }: StatsRowProps) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-4">
            <Skeleton className="h-8 w-8 rounded-lg mb-3" />
            <Skeleton className="h-7 w-12 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    )
  }

  const sourceLabel = stats.sources_total > 0
    ? `${stats.sources_healthy}/${stats.sources_total} healthy`
    : 'No sources'

  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
      <StatCard
        icon={TrendingUp}
        label="Active Trends"
        value={stats.active_count}
        href="/trends"
        color="text-blue-400"
        bg="bg-blue-500/10"
      />
      <StatCard
        icon={Zap}
        label="Post Now"
        value={stats.post_now_count}
        sub={stats.post_now_count > 0 ? 'Needs action' : undefined}
        href="/trends?action=post_now"
        color="text-accent"
        bg="bg-accent/10"
        pulse={stats.post_now_count > 0}
      />
      <StatCard
        icon={Laugh}
        label="Meme Ready"
        value={stats.meme_ready_count}
        href="/memes/studio"
        color="text-purple-400"
        bg="bg-purple-500/10"
      />
      <StatCard
        icon={Bookmark}
        label="Saved Ideas"
        value={stats.saved_ideas_count}
        sub="Waiting to use"
        href="/content?saved=true"
        color="text-amber-400"
        bg="bg-amber-500/10"
      />
      <StatCard
        icon={BarChart2}
        label="Avg Priority"
        value={stats.avg_priority_score}
        sub="out of 100"
        color="text-emerald-400"
        bg="bg-emerald-500/10"
      />
      <StatCard
        icon={Radio}
        label="Source Health"
        value={sourceLabel}
        href="/settings/sources"
        color={stats.sources_healthy === stats.sources_total && stats.sources_total > 0 ? 'text-emerald-400' : 'text-amber-400'}
        bg={stats.sources_healthy === stats.sources_total && stats.sources_total > 0 ? 'bg-emerald-500/10' : 'bg-amber-500/10'}
      />
    </div>
  )
}
