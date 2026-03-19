'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Zap, TrendingUp, Lightbulb, Image,
  KanbanSquare, Calendar, Mic2, FolderOpen, BarChart2,
  Bell, Settings, Flame, Eye, X,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useUIStore } from '@/stores/ui.store'
import { useUnreadAlertCount } from '@/hooks/useAlerts'
import { Badge } from '@/components/ui/Badge'

const NAV_ITEMS = [
  { label: 'Dashboard',     href: '/',            icon: LayoutDashboard },
  { label: 'Viral Radar',   href: '/radar',       icon: Zap },
  { label: 'Trends',        href: '/trends',      icon: TrendingUp },
  { label: 'Content Ideas', href: '/content',     icon: Lightbulb },
  { label: 'Meme Studio',   href: '/memes',       icon: Image },
  { label: 'Pipeline',      href: '/pipeline',    icon: KanbanSquare },
  { label: 'Calendar',      href: '/calendar',    icon: Calendar },
]

const SECONDARY_NAV = [
  { label: 'Competitors',   href: '/competitors', icon: Eye },
  { label: 'Brand Voice',   href: '/brand',       icon: Mic2 },
  { label: 'Assets',        href: '/assets',      icon: FolderOpen },
  { label: 'Performance',   href: '/performance', icon: BarChart2 },
  { label: 'Alerts',        href: '/alerts',      icon: Bell, badge: true },
  { label: 'Settings',      href: '/settings',    icon: Settings },
]

export function MobileSidebar() {
  const pathname = usePathname()
  const { mobileSidebarOpen, setMobileSidebarOpen } = useUIStore()
  const { data: unreadCount = 0 } = useUnreadAlertCount()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const close = () => setMobileSidebarOpen(false)

  if (!mobileSidebarOpen) return null

  return (
    <div className="fixed inset-0 z-[200] md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={close}
      />

      {/* Drawer */}
      <aside className="absolute left-0 top-0 bottom-0 w-72 bg-surface border-r border-border flex flex-col animate-slide-in-right shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-accent shrink-0" />
            <span className="font-display font-bold text-sm tracking-wide text-foreground uppercase">Outrage</span>
            <span className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider">Engine</span>
          </div>
          <button
            onClick={close}
            className="text-zinc-600 hover:text-muted transition-colors p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 no-scrollbar">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
                  active
                    ? 'text-foreground bg-accent/10 border-l-2 border-accent'
                    : 'text-muted hover:text-foreground hover:bg-surface-raised border-l-2 border-transparent'
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', active && 'text-accent')} />
                <span>{item.label}</span>
              </Link>
            )
          })}

          <div className="my-2 border-t border-border" />

          {SECONDARY_NAV.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            const showBadge = item.badge && unreadCount > 0
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
                  active
                    ? 'text-foreground bg-accent/10 border-l-2 border-accent'
                    : 'text-muted hover:text-foreground hover:bg-surface-raised border-l-2 border-transparent'
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', active && 'text-accent')} />
                <span className="flex-1">{item.label}</span>
                {showBadge && (
                  <Badge variant="accent" size="sm">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-3">
          <p className="text-[10px] text-zinc-700 text-center uppercase tracking-wider">Internal Tool</p>
        </div>
      </aside>
    </div>
  )
}
