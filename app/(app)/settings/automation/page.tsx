'use client'

import { useEffect, useState } from 'react'
import { Zap, Bot, Save, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'

interface Flags {
  ai_enabled:  boolean
  n8n_enabled: boolean
}

function Toggle({
  enabled,
  onChange,
  disabled,
}: {
  enabled:  boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-40',
        enabled ? 'bg-accent' : 'bg-zinc-700',
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
          enabled ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  )
}

export default function AutomationSettingsPage() {
  const [flags, setFlags]     = useState<Flags | null>(null)
  const [saving, setSaving]   = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/settings/automation')
      .then((r) => r.json())
      .then((d) => setFlags({ ai_enabled: d.ai_enabled, n8n_enabled: d.n8n_enabled }))
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    if (!flags) return
    setSaving(true)
    try {
      const res = await fetch('/api/settings/automation', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(flags),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Automation settings saved')
    } catch (err) {
      toast.error(String(err))
    } finally {
      setSaving(false)
    }
  }

  const bothOff = flags && !flags.ai_enabled && !flags.n8n_enabled

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-xl text-foreground">Automation</h1>
        <p className="text-sm text-muted mt-1">
          Control AI token usage and n8n workflow triggers. Turn off to pause all costs.
        </p>
      </div>

      {bothOff && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-amber-500/30 bg-amber-500/5">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
          <p className="text-sm text-amber-300">
            All automation is off — no tokens or n8n calls will be made.
          </p>
        </div>
      )}

      <div className="bg-surface border border-border rounded-xl divide-y divide-border overflow-hidden">

        {/* AI */}
        <div className="flex items-center gap-4 p-5">
          <div className="p-2.5 bg-background rounded-lg border border-border shrink-0">
            <Bot className="h-4 w-4 text-muted" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">AI Token Usage</p>
            <p className="text-xs text-muted mt-0.5">
              Content generation, brand rewrites, meme punchlines. Uses OpenAI — costs per call.
            </p>
          </div>
          {loading ? (
            <Loader2 className="h-4 w-4 text-muted animate-spin" />
          ) : (
            <div className="flex items-center gap-3 shrink-0">
              <span className={cn('text-xs font-medium', flags?.ai_enabled ? 'text-emerald-400' : 'text-zinc-500')}>
                {flags?.ai_enabled ? 'On' : 'Off'}
              </span>
              <Toggle
                enabled={flags?.ai_enabled ?? false}
                onChange={(v) => setFlags((f) => f ? { ...f, ai_enabled: v } : f)}
              />
            </div>
          )}
        </div>

        {/* n8n */}
        <div className="flex items-center gap-4 p-5">
          <div className="p-2.5 bg-background rounded-lg border border-border shrink-0">
            <Zap className="h-4 w-4 text-muted" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">n8n Workflow Triggers</p>
            <p className="text-xs text-muted mt-0.5">
              RSS ingestion, trend polling, digests, alerts. Triggers your n8n cloud instance.
            </p>
          </div>
          {loading ? (
            <Loader2 className="h-4 w-4 text-muted animate-spin" />
          ) : (
            <div className="flex items-center gap-3 shrink-0">
              <span className={cn('text-xs font-medium', flags?.n8n_enabled ? 'text-emerald-400' : 'text-zinc-500')}>
                {flags?.n8n_enabled ? 'On' : 'Off'}
              </span>
              <Toggle
                enabled={flags?.n8n_enabled ?? false}
                onChange={(v) => setFlags((f) => f ? { ...f, n8n_enabled: v } : f)}
              />
            </div>
          )}
        </div>

      </div>

      <button
        onClick={save}
        disabled={saving || loading}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-all disabled:opacity-40"
      >
        {saving
          ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
          : <><Save className="h-3.5 w-3.5" /> Save</>
        }
      </button>
    </div>
  )
}
