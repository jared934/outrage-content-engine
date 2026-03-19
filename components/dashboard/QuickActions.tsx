'use client'

import { useRouter } from 'next/navigation'
import { Zap, Lightbulb, Image, Send, Plus, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface QuickActionsProps {
  onRefresh?: () => void
  refreshing?: boolean
}

const ACTIONS = [
  {
    label:   'Viral Radar',
    href:    '/radar',
    icon:    Zap,
    variant: 'primary' as const,
    desc:    'See what\'s trending',
  },
  {
    label:   'Generate Ideas',
    href:    '/content',
    icon:    Lightbulb,
    variant: 'secondary' as const,
    desc:    'AI content pack',
  },
  {
    label:   'Meme Studio',
    href:    '/memes/studio',
    icon:    Image,
    variant: 'secondary' as const,
    desc:    'Create a meme',
  },
  {
    label:   'Canva Export',
    href:    '/brand/exports',
    icon:    Send,
    variant: 'secondary' as const,
    desc:    'Production handoff',
  },
  {
    label:   'Pipeline',
    href:    '/pipeline',
    icon:    Plus,
    variant: 'secondary' as const,
    desc:    'Add to queue',
  },
]

export function QuickActions({ onRefresh, refreshing }: QuickActionsProps) {
  const router = useRouter()

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {ACTIONS.map((action) => {
        const Icon = action.icon
        return (
          <button
            key={action.href}
            onClick={() => router.push(action.href)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
              action.variant === 'primary'
                ? 'bg-accent text-white border-transparent hover:bg-accent/90'
                : 'bg-surface border-border text-muted hover:text-foreground hover:border-zinc-600',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {action.label}
          </button>
        )
      })}

      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-border bg-surface text-zinc-600 hover:text-muted hover:border-zinc-600 transition-all disabled:opacity-40"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      )}
    </div>
  )
}
