'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Laugh, ArrowRight, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { TrendWithScore } from '@/lib/dashboard/dashboard.types'
import { Skeleton } from '@/components/ui/Skeleton'

interface MemeReadyPanelProps {
  trends:  TrendWithScore[]
  loading?: boolean
}

export function MemeReadyPanel({ trends, loading }: MemeReadyPanelProps) {
  const router = useRouter()

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-raised">
        <div className="flex items-center gap-2">
          <Laugh className="h-4 w-4 text-purple-400" />
          <span className="font-display font-semibold text-sm text-foreground">Meme-Ready</span>
        </div>
        <Link href="/memes/studio">
          <button className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-muted transition-colors">
            Studio <ArrowRight className="h-3 w-3" />
          </button>
        </Link>
      </div>

      <div className="divide-y divide-border">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-3 py-2.5">
              <Skeleton className="h-4 w-full mb-1.5" />
              <Skeleton className="h-2.5 w-20" />
            </div>
          ))
        ) : trends.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center px-4">
            <ImageIcon className="h-6 w-6 text-zinc-700 mb-2" />
            <p className="text-xs text-muted">No meme-ready stories right now</p>
          </div>
        ) : (
          trends.map((trend) => {
            const memeScore = trend.meme_potential_score ?? 0

            return (
              <div
                key={trend.id}
                className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-surface-raised transition-colors group"
              >
                {/* Meme score */}
                <div className={cn(
                  'flex-shrink-0 text-[10px] font-bold w-7 text-center tabular-nums',
                  memeScore >= 85 ? 'text-purple-400' : 'text-zinc-500',
                )}>
                  {Math.round(memeScore)}
                </div>

                <Link
                  href={`/trends/${trend.id}`}
                  className="flex-1 min-w-0"
                >
                  <p className="text-xs text-foreground group-hover:text-accent transition-colors line-clamp-2 leading-snug">
                    {trend.title}
                  </p>
                </Link>

                <button
                  onClick={() => router.push(`/memes/studio?cluster_id=${trend.id}`)}
                  className="flex-shrink-0 text-[10px] px-2 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-all opacity-0 group-hover:opacity-100"
                >
                  Make
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
