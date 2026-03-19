'use client'

import { useState } from 'react'
import { Sunrise, Sunset, Sparkles, Send, Copy, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { useDigests, useGenerateDigest } from '@/hooks/useAlertRules'
import { digestToPlainText } from '@/lib/alerts/digest.service'
import type { Digest, DigestPayload } from '@/lib/alerts/alert.types'

interface DigestPanelProps {
  orgId: string
}

export function DigestPanel({ orgId }: DigestPanelProps) {
  const { data: digests = [], isLoading } = useDigests(orgId)
  const { mutate: generate, isPending }   = useGenerateDigest(orgId)

  const morning = digests.filter((d) => d.type === 'morning')
  const evening = digests.filter((d) => d.type === 'evening')
  const latest  = digests[0] ?? null

  return (
    <div className="space-y-5">
      {/* Generate buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <DigestGenerateCard
          type="morning"
          label="Morning Digest"
          description="Top trends, post-now count, new trend highlights"
          icon={<Sunrise className="h-5 w-5 text-amber-400" />}
          last={morning[0] ?? null}
          onGenerate={(deliver) => generate({ type: 'morning', deliver })}
          loading={isPending}
        />
        <DigestGenerateCard
          type="evening"
          label="Evening Digest"
          description="Day recap, alerts summary, tomorrow's watchlist"
          icon={<Sunset className="h-5 w-5 text-indigo-400" />}
          last={evening[0] ?? null}
          onGenerate={(deliver) => generate({ type: 'evening', deliver })}
          loading={isPending}
        />
      </div>

      {/* Latest digest preview */}
      {isLoading ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : latest ? (
        <DigestPreviewCard digest={latest} />
      ) : (
        <div className="flex flex-col items-center py-12 text-center gap-2">
          <Sparkles className="h-8 w-8 text-zinc-700" />
          <p className="text-sm text-muted">No digests generated yet</p>
          <p className="text-xs text-zinc-700">Click Generate above to create your first digest</p>
        </div>
      )}

      {/* History */}
      {digests.length > 1 && (
        <div>
          <p className="text-xs font-semibold text-muted mb-2 uppercase tracking-wide">Recent digests</p>
          <div className="space-y-1.5">
            {digests.slice(1, 8).map((d) => (
              <DigestHistoryRow key={d.id} digest={d} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DigestGenerateCard({
  type, label, description, icon, last, onGenerate, loading,
}: {
  type:       'morning' | 'evening'
  label:      string
  description: string
  icon:       React.ReactNode
  last:       Digest | null
  onGenerate: (deliver: boolean) => void
  loading:    boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-xs text-muted">{description}</p>
        </div>
      </div>

      {last && (
        <p className="text-[10px] text-zinc-600">
          Last: {format(new Date(last.created_at), 'MMM d, h:mm a')}
          {last.delivered_at && ' · Delivered'}
        </p>
      )}

      <div className="flex gap-2">
        <Button
          variant="secondary" size="sm"
          icon={<Sparkles className="h-3 w-3" />}
          disabled={loading}
          onClick={() => onGenerate(false)}
          className="flex-1"
        >
          Preview
        </Button>
        <Button
          variant="ghost" size="sm"
          icon={<Send className="h-3 w-3" />}
          disabled={loading}
          onClick={() => onGenerate(true)}
          title="Generate + deliver via webhooks"
        >
          Deliver
        </Button>
      </div>
    </div>
  )
}

function DigestPreviewCard({ digest }: { digest: Digest }) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const p = digest.payload
  const isMorning = digest.type === 'morning'

  function copyPlainText() {
    navigator.clipboard.writeText(digestToPlainText(p))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-border cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{isMorning ? '🌅' : '🌆'}</span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {isMorning ? 'Morning' : 'Evening'} Digest
            </p>
            <p className="text-[10px] text-muted">
              {format(new Date(p.generated_at), 'EEEE, MMMM d · h:mm a')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); copyPlainText() }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border text-xs text-zinc-500 hover:text-foreground transition-colors"
          >
            {copied ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          {expanded ? <ChevronUp className="h-4 w-4 text-zinc-600" /> : <ChevronDown className="h-4 w-4 text-zinc-600" />}
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Summary */}
          <p className="text-sm text-foreground leading-relaxed">{p.summary}</p>

          {isMorning && p.top_trends && (
            <>
              {/* Stat pills */}
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: 'Post Now',   value: p.post_now_count   ?? 0, color: 'text-red-400'    },
                  { label: 'Meme Ready', value: p.meme_ready_count ?? 0, color: 'text-amber-400'  },
                  { label: 'New 24h',    value: p.new_trends_24h   ?? 0, color: 'text-blue-400'   },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-raised border border-border">
                    <span className={cn('text-sm font-bold tabular-nums', color)}>{value}</span>
                    <span className="text-xs text-muted">{label}</span>
                  </div>
                ))}
              </div>

              {/* Top trends */}
              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Top Trends</p>
                <div className="space-y-1.5">
                  {p.top_trends.slice(0, 5).map((t, i) => (
                    <div key={t.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-raised">
                      <span className="text-[10px] text-zinc-700 tabular-nums w-4 shrink-0">{i + 1}</span>
                      <span className="text-xs text-foreground flex-1 truncate">{t.title}</span>
                      {t.recommended_action === 'post_now' && (
                        <span className="text-[10px] text-red-400 font-bold shrink-0">⚡ Post Now</span>
                      )}
                      <span className="text-[10px] text-zinc-600 tabular-nums shrink-0">
                        {Math.round(t.total_priority_score ?? t.overall_score)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {!isMorning && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Posted',      value: p.posted_today      ?? 0 },
                { label: 'Ideas Made',  value: p.ideas_generated   ?? 0 },
                { label: 'Reviewed',    value: p.trends_reviewed   ?? 0 },
                { label: 'Top Alerts',  value: p.top_alert_count   ?? 0 },
              ].map(({ label, value }) => (
                <div key={label} className="px-3 py-3 rounded-xl bg-surface-raised border border-border text-center">
                  <p className="text-xl font-bold text-foreground tabular-nums">{value}</p>
                  <p className="text-[10px] text-muted mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}

          {!isMorning && (p.highlights ?? []).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Watch Tomorrow</p>
              <div className="space-y-1">
                {(p.highlights ?? []).map((t) => (
                  <div key={t.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-raised">
                    <span className="text-xs text-foreground flex-1 truncate">{t.title}</span>
                    {t.urgency_score && (
                      <span className="text-[10px] text-amber-500 tabular-nums">⚡ {Math.round(t.urgency_score)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DigestHistoryRow({ digest }: { digest: Digest }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-surface border border-border hover:border-zinc-600 transition-colors">
      <span className="text-sm shrink-0">{digest.type === 'morning' ? '🌅' : '🌆'}</span>
      <span className="text-xs text-foreground flex-1 capitalize">{digest.type} digest</span>
      <span className="text-[10px] text-zinc-600">
        {format(new Date(digest.created_at), 'MMM d, h:mm a')}
      </span>
      {digest.delivered_at && (
        <span className="flex items-center gap-1 text-[10px] text-green-500">
          <CheckCircle2 className="h-3 w-3" /> Delivered
        </span>
      )}
    </div>
  )
}
