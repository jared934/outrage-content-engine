'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Search, Bell, ChevronRight, LogOut, Menu } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { useCommandBar } from '@/hooks/useCommandBar'
import { useUnreadAlertCount } from '@/hooks/useAlerts'
import { useUIStore } from '@/stores/ui.store'
import { cn } from '@/lib/utils/cn'
import { toast } from 'sonner'

const BREADCRUMB_MAP: Record<string, string> = {
  '': 'Dashboard',
  radar: 'Viral Radar',
  trends: 'Trends',
  content: 'Content Ideas',
  memes: 'Meme Generator',
  pipeline: 'Pipeline',
  calendar: 'Calendar',
  brand: 'Brand Voice',
  assets: 'Asset Library',
  performance: 'Performance',
  alerts: 'Alerts',
  settings: 'Settings',
  competitors: 'Competitors',
}

function useBreadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) return [{ label: 'Dashboard', href: '/' }]

  const crumbs = [{ label: 'Dashboard', href: '/' }]
  let path = ''
  for (const seg of segments) {
    path += `/${seg}`
    crumbs.push({
      label: BREADCRUMB_MAP[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1),
      href: path,
    })
  }
  return crumbs
}

export function Header() {
  const router = useRouter()
  const { open } = useCommandBar()
  const { data: unreadCount = 0 } = useUnreadAlertCount()
  const { toggleMobileSidebar } = useUIStore()
  const breadcrumbs = useBreadcrumbs()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.push('/login')
  }

  return (
    <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 shrink-0 gap-4">
      {/* Left: mobile menu + breadcrumbs */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          className="md:hidden text-muted hover:text-foreground p-1"
          onClick={toggleMobileSidebar}
        >
          <Menu className="h-5 w-5" />
        </button>

        <nav className="flex items-center gap-1 text-xs text-muted min-w-0 overflow-hidden">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-1 min-w-0">
              {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" />}
              <span
                className={cn(
                  'truncate',
                  i === breadcrumbs.length - 1 ? 'text-foreground font-medium' : 'hover:text-foreground cursor-pointer'
                )}
                onClick={() => i < breadcrumbs.length - 1 && router.push(crumb.href)}
              >
                {crumb.label}
              </span>
            </span>
          ))}
        </nav>
      </div>

      {/* Right: search + alerts + user */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Search / command bar trigger */}
        <button
          onClick={open}
          className={cn(
            'hidden sm:flex items-center gap-2 h-8 px-3 rounded-md text-xs text-zinc-500',
            'bg-surface border border-border hover:border-zinc-600 hover:text-muted transition-colors',
            'min-w-[160px]'
          )}
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span>Search...</span>
          <span className="ml-auto text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded font-mono">⌘K</span>
        </button>

        {/* Mobile search */}
        <button
          onClick={open}
          className="sm:hidden text-muted hover:text-foreground"
        >
          <Search className="h-5 w-5" />
        </button>

        {/* Alerts */}
        <button
          onClick={() => router.push('/alerts')}
          className="relative text-muted hover:text-foreground transition-colors p-1.5"
          title="Alerts"
        >
          <Bell className="h-4.5 w-4.5" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 h-4 min-w-4 rounded-full bg-accent text-[9px] font-bold text-white flex items-center justify-center px-0.5">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Sign out */}
        <Button
          variant="ghost"
          size="xs"
          icon={<LogOut className="h-3.5 w-3.5" />}
          onClick={handleSignOut}
          title="Sign out"
        />
      </div>
    </header>
  )
}
