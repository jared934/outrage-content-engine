'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Zap,
  TrendingUp,
  Lightbulb,
  Image,
  KanbanSquare,
  Calendar,
  Mic2,
  FolderOpen,
  BarChart2,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  Flame,
  Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useUIStore } from '@/stores/ui.store'
import { useUnreadAlertCount } from '@/hooks/useAlerts'
import { Badge } from '@/components/ui/Badge'

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Viral Radar', href: '/radar', icon: Zap },
  { label: 'Trends', href: '/trends', icon: TrendingUp },
  { label: 'Content Ideas', href: '/content', icon: Lightbulb },
  { label: 'Meme Generator', href: '/memes', icon: Image },
  { label: 'Pipeline', href: '/pipeline', icon: KanbanSquare },
  { label: 'Calendar', href: '/calendar', icon: Calendar },
]

const SECONDARY_NAV = [
  { label: 'Competitors',  href: '/competitors', icon: Eye },
  { label: 'Brand Voice',  href: '/brand',       icon: Mic2 },
  { label: 'Assets',       href: '/assets',      icon: FolderOpen },
  { label: 'Performance',  href: '/performance', icon: BarChart2 },
  { label: 'Alerts',       href: '/alerts',      icon: Bell, badge: true },
  { label: 'Settings',     href: '/settings',    icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const { data: unreadCount = 0 } = useUnreadAlertCount()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col bg-surface border-r border-border transition-all duration-200 shrink-0',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center h-14 px-4 border-b border-border shrink-0', sidebarCollapsed && 'justify-center px-0')}>
        {sidebarCollapsed ? (
          <Flame className="h-6 w-6 text-accent" />
        ) : (
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-accent shrink-0" />
            <span className="font-display font-bold text-sm tracking-wide text-foreground uppercase">
              Outrage
            </span>
            <span className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider">Engine</span>
          </div>
        )}
      </div>

      {/* Primary nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 no-scrollbar">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              title={sidebarCollapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 px-2.5 py-2 rounded-md text-sm transition-colors',
                active
                  ? 'text-foreground bg-accent/10 border-l-2 border-accent'
                  : 'text-muted hover:text-foreground hover:bg-surface-raised border-l-2 border-transparent',
                sidebarCollapsed && 'justify-center px-0 border-l-0'
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', active && 'text-accent')} />
              {!sidebarCollapsed && <span>{item.label}</span>}
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
              title={sidebarCollapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 px-2.5 py-2 rounded-md text-sm transition-colors relative',
                active
                  ? 'text-foreground bg-accent/10 border-l-2 border-accent'
                  : 'text-muted hover:text-foreground hover:bg-surface-raised border-l-2 border-transparent',
                sidebarCollapsed && 'justify-center px-0 border-l-0'
              )}
            >
              <div className="relative shrink-0">
                <Icon className={cn('h-4 w-4', active && 'text-accent')} />
                {showBadge && sidebarCollapsed && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-accent" />
                )}
              </div>
              {!sidebarCollapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {showBadge && (
                    <Badge variant="accent" size="sm">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                  )}
                </>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-border p-2">
        <button
          onClick={toggleSidebar}
          className={cn(
            'w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-xs text-zinc-600 hover:text-muted hover:bg-surface-raised transition-colors',
            sidebarCollapsed && 'justify-center px-0'
          )}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <>
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
