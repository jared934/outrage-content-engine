'use client'

import { useState } from 'react'
import {
  Plus, Trash2, Globe, Bell, Mail, ToggleLeft, ToggleRight,
  ChevronDown, ChevronUp, Pencil, Save, X,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  useAlertRules, useCreateAlertRule,
  useUpdateAlertRule, useDeleteAlertRule,
} from '@/hooks/useAlertRules'
import { ALERT_RULE_CONFIGS, SEVERITY_CONFIG } from '@/lib/alerts/alert.types'
import type { AlertRuleV2, AlertRuleType } from '@/lib/alerts/alert.types'

interface AlertRulesPanelProps {
  orgId: string
}

export function AlertRulesPanel({ orgId }: AlertRulesPanelProps) {
  const { data: rules = [], isLoading }        = useAlertRules(orgId)
  const { mutate: createRule, isPending: creating } = useCreateAlertRule(orgId)
  const { mutate: updateRule }                 = useUpdateAlertRule()
  const { mutate: deleteRule }                 = useDeleteAlertRule()

  const [showAdd, setShowAdd]     = useState(false)
  const [editId,  setEditId]      = useState<string | null>(null)

  // New rule form state
  const [newName,       setNewName]       = useState('')
  const [newType,       setNewType]       = useState<AlertRuleType>('post_now')
  const [newThreshold,  setNewThreshold]  = useState('')
  const [newInApp,      setNewInApp]      = useState(true)
  const [newEmail,      setNewEmail]      = useState(false)
  const [newWebhook,    setNewWebhook]    = useState('')
  const [newCooldown,   setNewCooldown]   = useState('1')

  function submitCreate() {
    if (!newName.trim()) return
    const cfg = ALERT_RULE_CONFIGS.find((c) => c.trigger_type === newType)
    createRule({
      name:           newName.trim(),
      trigger_type:   newType,
      threshold:      newThreshold ? Number(newThreshold) : cfg?.defaultThreshold ?? null,
      notify_in_app:  newInApp,
      notify_email:   newEmail,
      webhook_url:    newWebhook.trim() || null,
      cooldown_hours: Number(newCooldown) || 1,
    }, {
      onSuccess: () => {
        setShowAdd(false)
        setNewName(''); setNewThreshold(''); setNewWebhook('')
      },
    })
  }

  function toggle(rule: AlertRuleV2) {
    updateRule({ id: rule.id, updates: { enabled: !rule.enabled } })
  }

  const selectedCfg = ALERT_RULE_CONFIGS.find((c) => c.trigger_type === newType)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Alert Rules</h2>
          <p className="text-xs text-muted mt-0.5">
            Configure triggers, thresholds, and delivery destinations
          </p>
        </div>
        <Button
          variant="primary" size="sm"
          icon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => setShowAdd((v) => !v)}
        >
          Add Rule
        </Button>
      </div>

      {/* Add rule form */}
      {showAdd && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-4">
          <h3 className="text-xs font-bold text-accent uppercase tracking-wider">New Alert Rule</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Name */}
            <div>
              <label className="block text-xs text-muted mb-1">Rule name</label>
              <input
                autoFocus
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                placeholder="e.g. Post-now alerts"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs text-muted mb-1">Trigger type</label>
              <select
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                value={newType}
                onChange={(e) => setNewType(e.target.value as AlertRuleType)}
              >
                {ALERT_RULE_CONFIGS.map((c) => (
                  <option key={c.trigger_type} value={c.trigger_type}>
                    {c.icon} {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Threshold (if applicable) */}
            {selectedCfg?.thresholdLabel && (
              <div>
                <label className="block text-xs text-muted mb-1">
                  {selectedCfg.thresholdLabel}
                </label>
                <input
                  type="number"
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                  placeholder={String(selectedCfg.defaultThreshold ?? '')}
                  value={newThreshold}
                  onChange={(e) => setNewThreshold(e.target.value)}
                />
              </div>
            )}

            {/* Cooldown */}
            <div>
              <label className="block text-xs text-muted mb-1">Cooldown (hours)</label>
              <input
                type="number" min="0"
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                value={newCooldown}
                onChange={(e) => setNewCooldown(e.target.value)}
              />
            </div>
          </div>

          {/* Delivery channels */}
          <div>
            <label className="block text-xs text-muted mb-2">Delivery</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setNewInApp((v) => !v)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors',
                  newInApp
                    ? 'bg-blue-950 border-blue-700 text-blue-400'
                    : 'border-border text-zinc-600 hover:border-zinc-600',
                )}
              >
                <Bell className="h-3 w-3" />
                In-app
              </button>
              <button
                onClick={() => setNewEmail((v) => !v)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors',
                  newEmail
                    ? 'bg-green-950 border-green-700 text-green-400'
                    : 'border-border text-zinc-600 hover:border-zinc-600',
                )}
              >
                <Mail className="h-3 w-3" />
                Email
              </button>
            </div>
            {selectedCfg?.canWebhook && (
              <div className="mt-2">
                <label className="block text-xs text-muted mb-1">
                  Webhook URL (n8n / Slack / Telegram)
                </label>
                <input
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-accent"
                  placeholder="https://your-n8n.cloud/webhook/..."
                  value={newWebhook}
                  onChange={(e) => setNewWebhook(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button variant="primary" size="sm" disabled={!newName.trim() || creating} onClick={submitCreate}>
              {creating ? 'Creating…' : 'Create rule'}
            </Button>
          </div>
        </div>
      )}

      {/* Rules list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted">No alert rules yet</p>
          <p className="text-xs text-zinc-700 mt-1">Add your first rule to start getting notified</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              onToggle={toggle}
              onUpdate={(updates) => updateRule({ id: rule.id, updates })}
              onDelete={() => deleteRule(rule.id)}
              editing={editId === rule.id}
              onEdit={() => setEditId(editId === rule.id ? null : rule.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function RuleRow({
  rule, onToggle, onUpdate, onDelete, editing, onEdit,
}: {
  rule:     AlertRuleV2
  onToggle: (r: AlertRuleV2) => void
  onUpdate: (u: Partial<AlertRuleV2>) => void
  onDelete: () => void
  editing:  boolean
  onEdit:   () => void
}) {
  const cfg = ALERT_RULE_CONFIGS.find((c) => c.trigger_type === rule.trigger_type)
  const sev = SEVERITY_CONFIG[cfg?.severity ?? 'info']

  const [webhookUrl, setWebhookUrl] = useState(rule.webhook_url ?? '')

  function saveWebhook() {
    onUpdate({ webhook_url: webhookUrl || null })
    onEdit()
  }

  return (
    <div className={cn(
      'rounded-xl border transition-all',
      rule.enabled ? 'border-border bg-surface' : 'border-zinc-800/50 bg-zinc-950/30 opacity-60',
    )}>
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Icon */}
        <span className="text-base shrink-0">{cfg?.icon ?? '📋'}</span>

        {/* Name + type */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{rule.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full border',
              sev.bgClass, sev.textClass, sev.borderClass,
            )}>
              {sev.label}
            </span>
            {rule.threshold !== null && (
              <span className="text-[10px] text-zinc-600">≥ {rule.threshold}</span>
            )}
            <span className="text-[10px] text-zinc-700">cooldown {rule.cooldown_hours}h</span>
          </div>
        </div>

        {/* Delivery badges */}
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          {rule.notify_in_app && (
            <span className="p-1 rounded bg-blue-950/50 text-blue-500" title="In-app">
              <Bell className="h-3 w-3" />
            </span>
          )}
          {rule.notify_email && (
            <span className="p-1 rounded bg-green-950/50 text-green-500" title="Email">
              <Mail className="h-3 w-3" />
            </span>
          )}
          {rule.webhook_url && (
            <span className="p-1 rounded bg-purple-950/50 text-purple-400" title="Webhook">
              <Globe className="h-3 w-3" />
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 text-zinc-600 hover:text-foreground transition-colors"
            title="Edit"
          >
            {editing ? <ChevronUp className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => onDelete()}
            className="p-1.5 text-zinc-700 hover:text-red-500 transition-colors"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onToggle(rule)}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors',
              rule.enabled
                ? 'bg-green-950/50 text-green-400 hover:bg-green-900/40'
                : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700',
            )}
          >
            {rule.enabled
              ? <><ToggleRight className="h-3.5 w-3.5" /> On</>
              : <><ToggleLeft  className="h-3.5 w-3.5" /> Off</>
            }
          </button>
        </div>
      </div>

      {/* Expandable webhook editor */}
      {editing && (
        <div className="px-4 pb-4 space-y-3 border-t border-border mt-0 pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Delivery channels</label>
              <div className="flex gap-2">
                <button
                  onClick={() => onUpdate({ notify_in_app: !rule.notify_in_app })}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs transition-colors',
                    rule.notify_in_app
                      ? 'bg-blue-950 border-blue-700 text-blue-400'
                      : 'border-border text-zinc-600',
                  )}
                >
                  <Bell className="h-3 w-3" /> In-app
                </button>
                <button
                  onClick={() => onUpdate({ notify_email: !rule.notify_email })}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs transition-colors',
                    rule.notify_email
                      ? 'bg-green-950 border-green-700 text-green-400'
                      : 'border-border text-zinc-600',
                  )}
                >
                  <Mail className="h-3 w-3" /> Email
                </button>
              </div>
            </div>
            {cfg?.canWebhook && (
              <div>
                <label className="block text-xs text-muted mb-1">Webhook URL</label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
                    placeholder="https://..."
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                  />
                  <button
                    onClick={saveWebhook}
                    className="px-2.5 py-1.5 rounded-lg bg-accent/10 border border-accent/30 text-accent text-xs hover:bg-accent/20 transition-colors"
                  >
                    <Save className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
