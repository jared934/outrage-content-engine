'use client'

import {
  Zap, Smile, Flame, Shield, Globe, Newspaper,
  Hash, Share2, AlignLeft, Anchor, EyeOff, Layers,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { REWRITE_TOOLS, type RewriteTool, type RewriteGroup } from '@/lib/brand/rewrite.types'

const ICONS: Record<string, LucideIcon> = {
  Zap, Smile, Flame, Shield, Globe, Newspaper,
  Hash, Share2, AlignLeft, Anchor, EyeOff, Layers,
}

const GROUP_ORDER: RewriteGroup[] = ['tone', 'audience', 'format', 'clean']
const GROUP_LABELS: Record<RewriteGroup, string> = {
  tone:     'Tone',
  audience: 'Audience',
  format:   'Format',
  clean:    'Clean Up',
}

interface RewriteToolbarProps {
  activeTool: RewriteTool | null
  loadingTool: RewriteTool | null
  disabled?: boolean
  onSelect: (tool: RewriteTool) => void
}

export function RewriteToolbar({
  activeTool,
  loadingTool,
  disabled,
  onSelect,
}: RewriteToolbarProps) {
  const grouped = GROUP_ORDER.map((group) => ({
    group,
    label: GROUP_LABELS[group],
    tools: REWRITE_TOOLS.filter((t) => t.group === group),
  }))

  return (
    <div className="space-y-4">
      {grouped.map(({ group, label, tools }) => (
        <div key={group}>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 px-1">
            {label}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {tools.map((meta) => {
              const Icon  = ICONS[meta.icon]
              const isActive  = activeTool  === meta.tool
              const isLoading = loadingTool === meta.tool

              return (
                <button
                  key={meta.tool}
                  onClick={() => onSelect(meta.tool)}
                  disabled={disabled || isLoading}
                  title={meta.description}
                  className={cn(
                    'group relative flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left',
                    'text-sm font-medium transition-all duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                    'disabled:opacity-40 disabled:cursor-not-allowed',
                    isActive
                      ? `${meta.bgColor} ${meta.color} border-current`
                      : 'bg-surface border-border text-muted hover:text-foreground hover:border-zinc-600',
                  )}
                >
                  {isLoading ? (
                    <span className={cn('h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin flex-shrink-0', meta.color)} />
                  ) : (
                    Icon && (
                      <Icon className={cn(
                        'h-3.5 w-3.5 flex-shrink-0 transition-colors',
                        isActive ? meta.color : 'text-zinc-500 group-hover:text-zinc-300',
                      )} />
                    )
                  )}
                  <span className="truncate">{meta.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
