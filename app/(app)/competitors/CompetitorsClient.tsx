'use client'

import { Eye, Plus, ExternalLink, Activity } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

// Mock data — wire up to competitor_watchlist table when ready
const MOCK_COMPETITORS = [
  {
    id: '1',
    name: 'TMZ',
    platform: 'instagram',
    handle: '@tmz',
    profile_url: 'https://instagram.com/tmz',
    follower_count: '14.2M',
    avg_engagement: '3.2%',
    posts_today: 12,
    status: 'active' as const,
    last_post: '23 min ago',
    notes: 'Primary competitor. High-volume breaking news.',
  },
  {
    id: '2',
    name: 'The Shade Room',
    platform: 'instagram',
    handle: '@theshaderoom',
    profile_url: 'https://instagram.com/theshaderoom',
    follower_count: '28.1M',
    avg_engagement: '4.8%',
    posts_today: 8,
    status: 'active' as const,
    last_post: '1 hr ago',
    notes: 'Dominant in celeb gossip. Watch closely.',
  },
  {
    id: '3',
    name: 'Complex',
    platform: 'twitter',
    handle: '@Complex',
    profile_url: 'https://twitter.com/complex',
    follower_count: '9.4M',
    avg_engagement: '1.9%',
    posts_today: 21,
    status: 'active' as const,
    last_post: '8 min ago',
    notes: 'Culture & hype focused. Heavy music content.',
  },
  {
    id: '4',
    name: 'Pop Crave',
    platform: 'twitter',
    handle: '@PopCrave',
    profile_url: 'https://twitter.com/popcrave',
    follower_count: '2.1M',
    avg_engagement: '6.1%',
    posts_today: 34,
    status: 'active' as const,
    last_post: '2 min ago',
    notes: 'High-frequency pop culture. Real-time reactions.',
  },
  {
    id: '5',
    name: 'E! News',
    platform: 'instagram',
    handle: '@enews',
    profile_url: 'https://instagram.com/enews',
    follower_count: '7.8M',
    avg_engagement: '1.2%',
    posts_today: 6,
    status: 'watching' as const,
    last_post: '3 hr ago',
    notes: 'Traditional media. Slower cadence.',
  },
]

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  twitter:   'bg-sky-500/10 text-sky-400 border-sky-500/20',
  tiktok:    'bg-purple-500/10 text-purple-400 border-purple-500/20',
  youtube:   'bg-red-500/10 text-red-400 border-red-500/20',
}

export function CompetitorsClient() {
  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-muted" />
            <h1 className="font-display font-bold text-xl text-foreground">Competitors</h1>
          </div>
          <p className="text-sm text-muted mt-0.5">
            Monitor competitor activity and identify content opportunities
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="h-3.5 w-3.5" />}
          disabled
          title="Coming soon — add via Settings"
        >
          Add Competitor
        </Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Tracking', value: String(MOCK_COMPETITORS.length) },
          { label: 'Active Today', value: String(MOCK_COMPETITORS.filter(c => c.status === 'active').length) },
          { label: 'Posts Today', value: String(MOCK_COMPETITORS.reduce((a, c) => a + c.posts_today, 0)) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-surface border border-border rounded-lg p-4">
            <p className="text-2xl font-display font-bold text-foreground tabular-nums">{value}</p>
            <p className="text-xs text-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Mock data notice */}
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <Activity className="h-3.5 w-3.5 text-amber-400 shrink-0" />
        <p className="text-xs text-amber-300">
          <strong>Mock data</strong> — Wire up to <code className="font-mono text-[11px] bg-amber-500/10 px-1 py-0.5 rounded">competitor_watchlist</code> table + n8n scraping workflow for live data.
        </p>
      </div>

      {/* Competitor grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {MOCK_COMPETITORS.map((c) => (
          <div
            key={c.id}
            className="bg-surface border border-border rounded-lg p-4 hover:border-zinc-600 transition-colors"
          >
            {/* Header row */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground text-sm">{c.name}</p>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${PLATFORM_COLORS[c.platform] ?? 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                    {c.platform}
                  </span>
                </div>
                <p className="text-xs text-zinc-600 mt-0.5">{c.handle}</p>
              </div>
              <div className={`shrink-0 h-2 w-2 rounded-full mt-1.5 ${c.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="text-center">
                <p className="text-xs font-medium text-foreground tabular-nums">{c.follower_count}</p>
                <p className="text-[10px] text-zinc-600">Followers</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-medium text-foreground tabular-nums">{c.avg_engagement}</p>
                <p className="text-[10px] text-zinc-600">Eng. Rate</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-medium text-foreground tabular-nums">{c.posts_today}</p>
                <p className="text-[10px] text-zinc-600">Posts Today</p>
              </div>
            </div>

            {/* Notes */}
            {c.notes && (
              <p className="text-[11px] text-zinc-600 mb-3 leading-relaxed">{c.notes}</p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-700">Last post: {c.last_post}</span>
              <a
                href={c.profile_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] text-muted hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                View
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
