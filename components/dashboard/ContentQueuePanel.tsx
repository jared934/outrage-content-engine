'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bookmark, ArrowRight, Send, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import type { RecentIdea } from '@/lib/dashboard/dashboard.types'
import { Skeleton } from '@/components/ui/Skeleton'

interface ContentQueuePanelProps {
  ideas:    RecentIdea[]
  loading?: boolean
  title?:   string
  showSaved?: boolean
}

const TYPE_COLORS: Record<string, string> = {
  headline:  'text-red-400 bg-red-500/10 border-red-500/20',
  hook:      'text-amber-400 bg-amber-500/10 border-amber-500/20',
  caption:   'text-blue-400 bg-blue-500/10 border-blue-500/20',
  meme_idea: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  reel_idea: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
  post_copy: 'text-zinc-400 bg-zinc-800 border-zinc-700',
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  async function handle(e: React.MouseEvent) {
    e.stopPropagation()
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handle}
      className="flex-shrink-0 text-zinc-700 hover:text-muted transition-colors opacity-0 group-hover:opacity-100"
    >
      {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
    </button>
  )
}

export function ContentQueuePanel({
  ideas, loading, title = 'Content Queue', showSaved = false,
}: ContentQueuePanelProps) {
  const router = useRouter()

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-raised">
        <div className="flex items-center gap-2">
          <Bookmark className="h-4 w-4 text-blue-400" />
          <span className="font-display font-semibold text-sm text-foreground">{title}</span>
          {ideas.length > 0 && (
            <span className="text-[10px] bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full px-1.5 font-bold">
              {ideas.length}
            </span>
          )}
        </div>
        <Link href="/content">
          <button className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-muted transition-colors">
            All <ArrowRight className="h-3 w-3" />
          </button>
        </Link>
      </div>

      <div className="divide-y divide-border max-h-72 overflow-y-auto no-scrollbar">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-3 py-2.5">
              <Skeleton className="h-4 w-full mb-1.5" />
              <Skeleton className="h-2.5 w-32" />
            </div>
          ))
        ) : ideas.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center px-4">
            <Bookmark className="h-6 w-6 text-zinc-700 mb-2" />
            <p className="text-xs text-muted">
              {showSaved ? 'No saved ideas waiting' : 'No recent ideas'}
            </p>
            <p className="text-[10px] text-zinc-600 mt-0.5">
              Generate ideas from a trend to fill this queue
            </p>
          </div>
        ) : (
          ideas.map((idea) => {
            const typeColor = TYPE_COLORS[idea.type] ?? TYPE_COLORS['post_copy']
            const text      = idea.hook ?? idea.content

            return (
              <div
                key={idea.id}
                className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-surface-raised transition-colors group cursor-pointer"
              >
                <span className={cn(
                  'flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded border capitalize mt-0.5',
                  typeColor,
                )}>
                  {idea.format_slug?.replace(/_/g, ' ') ?? idea.type}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground line-clamp-2 leading-snug">
                    {text}
                  </p>
                  {idea.cluster_title && (
                    <p className="text-[9px] text-zinc-600 mt-0.5 truncate">
                      ↳ {idea.cluster_title}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                  <CopyBtn text={idea.content} />
                  <button
                    onClick={() => router.push(`/brand/exports?idea_id=${idea.id}`)}
                    className="text-zinc-700 hover:text-accent transition-colors opacity-0 group-hover:opacity-100"
                    title="Export to Canva"
                  >
                    <Send className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
