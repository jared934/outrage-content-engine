'use client'

import { RefreshCw, Brain, Info } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/Button'
import { usePerformanceWeights, useRecalcWeights } from '@/hooks/usePerformance'
import {
  PLATFORM_CONFIG, POST_TYPE_CONFIG, HOOK_TYPE_CONFIG, CAPTION_STYLE_CONFIG,
} from '@/lib/performance/performance.types'
import type { PerfPlatform, PerfPostType, PerfHookType, PerfCaptionStyle } from '@/lib/performance/performance.types'

interface WeightsPanelProps {
  orgId: string
}

export function WeightsPanel({ orgId }: WeightsPanelProps) {
  const { data: weights, isLoading } = usePerformanceWeights(orgId)
  const { mutate: recalc, isPending } = useRecalcWeights(orgId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Brain className="h-5 w-5 text-accent shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Learned Recommendation Weights</p>
          <p className="text-xs text-muted mt-0.5">
            Derived from your performance data. Used to rank content ideas, boost relevant trend clusters,
            and prioritise alerts. Recalculate after logging more results.
          </p>
          {weights?.recalculated_at && (
            <p className="text-[10px] text-zinc-600 mt-1">
              Last updated {formatDistanceToNow(new Date(weights.recalculated_at), { addSuffix: true })}
            </p>
          )}
        </div>
        <Button
          variant="secondary" size="sm"
          icon={<RefreshCw className={cn('h-3.5 w-3.5', isPending && 'animate-spin')} />}
          loading={isPending}
          onClick={() => recalc()}
        >
          Recalculate
        </Button>
      </div>

      {!weights && !isLoading && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-950/30 border border-amber-800/40 rounded-lg">
          <Info className="h-4 w-4 text-amber-400 shrink-0" />
          <p className="text-xs text-amber-400">
            No weights yet. Log some post results and click Recalculate.
          </p>
        </div>
      )}

      {weights && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Platform weights */}
          <WeightGroup
            title="Platform"
            weights={weights.platform_weights}
            labelFn={(k) => PLATFORM_CONFIG[k as PerfPlatform]?.label ?? k}
            iconFn={(k)  => PLATFORM_CONFIG[k as PerfPlatform]?.icon}
          />

          {/* Hook type weights */}
          <WeightGroup
            title="Hook Structure"
            weights={weights.hook_type_weights}
            labelFn={(k) => HOOK_TYPE_CONFIG[k as PerfHookType]?.label ?? k}
            iconFn={(k)  => HOOK_TYPE_CONFIG[k as PerfHookType]?.icon}
          />

          {/* Post type weights */}
          <WeightGroup
            title="Content Format"
            weights={weights.post_type_weights}
            labelFn={(k) => POST_TYPE_CONFIG[k as PerfPostType]?.label ?? k}
            iconFn={(k)  => POST_TYPE_CONFIG[k as PerfPostType]?.icon}
          />

          {/* Caption style weights */}
          <WeightGroup
            title="Caption Style"
            weights={weights.caption_style_weights}
            labelFn={(k) => CAPTION_STYLE_CONFIG[k as PerfCaptionStyle]?.label ?? k}
          />

          {/* Topic weights */}
          {Object.keys(weights.topic_weights).length > 0 && (
            <WeightGroup
              title="Topic"
              weights={weights.topic_weights}
              labelFn={(k) => k}
            />
          )}

          {/* Category weights */}
          {Object.keys(weights.category_weights).length > 0 && (
            <WeightGroup
              title="Category"
              weights={weights.category_weights}
              labelFn={(k) => k}
            />
          )}
        </div>
      )}

      {/* How weights are used */}
      <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
        <p className="text-xs font-semibold text-foreground">How These Weights Are Applied</p>
        <ul className="space-y-1.5 text-xs text-muted list-none">
          <li>
            <span className="text-accent font-semibold">Trend scoring</span> — categories and topics
            matching your top weights get a priority boost in the trend dashboard
          </li>
          <li>
            <span className="text-accent font-semibold">Content ideas</span> — AI-generated ideas
            favour hook types and formats with high weight
          </li>
          <li>
            <span className="text-accent font-semibold">Alert rules</span> — trigger thresholds adjust
            based on what has historically performed for your audience
          </li>
          <li>
            <span className="text-accent font-semibold">Best time suggestions</span> — pipeline items
            get optimal posting time hints from hour weights
          </li>
        </ul>
        <p className="text-[10px] text-zinc-600 border-t border-border pt-2 mt-2">
          Weights are stored in <code>performance_weights</code> and readable via{' '}
          <code>GET /api/performance/weights</code> — pipe them into any n8n workflow or AI prompt.
        </p>
      </div>
    </div>
  )
}

function WeightGroup({
  title, weights, labelFn, iconFn,
}: {
  title:    string
  weights:  Record<string, number>
  labelFn:  (k: string) => string
  iconFn?:  (k: string) => string | undefined
}) {
  const sorted = Object.entries(weights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  if (!sorted.length) return null

  const max = sorted[0]?.[1] ?? 1

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">{title}</p>
      <div className="space-y-1.5">
        {sorted.map(([key, weight]) => {
          const pct   = max > 0 ? (weight / max) * 100 : 0
          const label = labelFn(key)
          const icon  = iconFn?.(key)
          return (
            <div key={key} className="flex items-center gap-2">
              {icon && <span className="text-sm shrink-0">{icon}</span>}
              <span className="text-xs text-foreground capitalize w-24 truncate">{label}</span>
              <div className="flex-1 h-1.5 bg-surface-raised rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    pct >= 80 ? 'bg-green-500'  :
                    pct >= 60 ? 'bg-amber-500'  :
                    pct >= 40 ? 'bg-accent'     :
                                'bg-zinc-600',
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-zinc-500 tabular-nums w-8 text-right">
                {(weight * 100).toFixed(0)}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
