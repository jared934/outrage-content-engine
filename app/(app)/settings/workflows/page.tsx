import { Metadata } from 'next'
import { Workflow, CheckCircle2, XCircle, Clock, ArrowLeft, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'

export const metadata: Metadata = { title: 'n8n Workflows' }

const WORKFLOWS = [
  {
    name: 'RSS Ingestion',
    description: 'Fetches all active RSS sources every 30 minutes and inserts new items into source_items',
    status: 'pending' as const,
    trigger: 'Schedule — every 30min',
    webhook: null,
    table: 'source_items',
  },
  {
    name: 'Trend Clustering',
    description: 'Groups recent source_items into trend_clusters using keyword similarity and entity matching',
    status: 'pending' as const,
    trigger: 'Schedule — every 1hr',
    webhook: null,
    table: 'trend_clusters',
  },
  {
    name: 'AI Scoring',
    description: 'Scores new trend_clusters with OpenAI. POSTs scores back via /api/webhooks/scoring',
    status: 'pending' as const,
    trigger: 'Webhook — on new cluster',
    webhook: '/api/webhooks/scoring',
    table: 'trend_scores',
  },
  {
    name: 'Content Generation',
    description: 'Generates content_ideas for high-score clusters. POSTs via /api/webhooks/suggestions',
    status: 'pending' as const,
    trigger: 'Webhook — on score update',
    webhook: '/api/webhooks/suggestions',
    table: 'content_ideas',
  },
  {
    name: 'Alert Engine',
    description: 'Monitors score thresholds and keyword rules, fires notifications via /api/webhooks/alert',
    status: 'pending' as const,
    trigger: 'Schedule — every 15min',
    webhook: '/api/webhooks/alert',
    table: 'notifications',
  },
]

const STATUS_CONFIG = {
  active:  { label: 'Active',   icon: CheckCircle2, color: 'text-emerald-400' },
  error:   { label: 'Error',    icon: XCircle,      color: 'text-red-400' },
  pending: { label: 'Pending',  icon: Clock,        color: 'text-zinc-500' },
  paused:  { label: 'Paused',   icon: Clock,        color: 'text-amber-400' },
}

export default function WorkflowsPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="text-zinc-600 hover:text-muted transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2">
          <Workflow className="h-5 w-5 text-muted" />
          <h1 className="font-display font-bold text-xl text-foreground">n8n Workflows</h1>
        </div>
      </div>

      {/* Setup notice */}
      <div className="bg-surface border border-border rounded-lg p-4 space-y-2">
        <p className="text-sm font-medium text-foreground">Setup Required</p>
        <p className="text-xs text-muted leading-relaxed">
          Import these workflows into your n8n instance. Configure <code className="font-mono text-[11px] bg-surface-raised px-1 py-0.5 rounded">N8N_WEBHOOK_SECRET</code> in <code className="font-mono text-[11px] bg-surface-raised px-1 py-0.5 rounded">.env.local</code> to authenticate webhook calls. See <code className="font-mono text-[11px] bg-surface-raised px-1 py-0.5 rounded">n8n/README.md</code> for workflow JSON files.
        </p>
        <div className="flex gap-2 pt-1">
          <Link
            href="https://n8n.io"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            n8n.io
          </Link>
        </div>
      </div>

      {/* Workflow list */}
      <div className="space-y-3">
        {WORKFLOWS.map((wf) => {
          const cfg = STATUS_CONFIG[wf.status]
          const StatusIcon = cfg.icon
          return (
            <div key={wf.name} className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{wf.name}</p>
                    <div className={`flex items-center gap-1 text-[11px] font-medium ${cfg.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      <span>{cfg.label}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted mt-1 leading-relaxed">{wf.description}</p>
                  <div className="flex flex-wrap gap-3 mt-2">
                    <div>
                      <span className="text-[10px] text-zinc-700 uppercase tracking-wider">Trigger</span>
                      <p className="text-[11px] text-zinc-500">{wf.trigger}</p>
                    </div>
                    {wf.webhook && (
                      <div>
                        <span className="text-[10px] text-zinc-700 uppercase tracking-wider">Webhook</span>
                        <p className="text-[11px] font-mono text-zinc-500">{wf.webhook}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-[10px] text-zinc-700 uppercase tracking-wider">Writes To</span>
                      <p className="text-[11px] font-mono text-zinc-500">{wf.table}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
