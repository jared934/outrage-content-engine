'use client'

import { useState } from 'react'
import {
  Globe, Bell, Mail, Slack, MessageCircle, Send,
  ExternalLink, Info, CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/Button'
import { useAlertRules, useCreateAlertRule } from '@/hooks/useAlertRules'

// n8n webhook integration guide
const N8N_GUIDE = [
  {
    platform: 'Telegram',
    icon: '✈️',
    steps: [
      'Create a Telegram Bot via @BotFather',
      'Create an n8n workflow: Webhook → Telegram node',
      'Set the webhook node to receive POST requests',
      'Paste the n8n webhook URL in your alert rule',
    ],
  },
  {
    platform: 'Slack',
    icon: '#️⃣',
    steps: [
      'Create a Slack App and enable Incoming Webhooks',
      'OR: Create an n8n workflow: Webhook → Slack node',
      'Copy the webhook URL from Slack app settings',
      'Paste directly as webhook URL — we send Slack Block Kit format',
    ],
  },
  {
    platform: 'Discord',
    icon: '🎮',
    steps: [
      'Go to Server Settings → Integrations → Webhooks',
      'Create a webhook and copy the URL',
      'OR route through n8n for conditional logic',
      'Paste the webhook URL in your alert rule',
    ],
  },
]

interface AlertPreferencesPanelProps {
  orgId: string
}

export function AlertPreferencesPanel({ orgId }: AlertPreferencesPanelProps) {
  const { data: rules = [] }                       = useAlertRules(orgId)
  const { mutate: createRule, isPending: creating } = useCreateAlertRule(orgId)

  const [testUrl,     setTestUrl]     = useState('')
  const [testSent,    setTestSent]    = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [openGuide,   setOpenGuide]   = useState<string | null>(null)

  // Digest rule (for global webhook config)
  const digestRule = rules.find((r) => r.trigger_type === 'digest')

  async function sendTestWebhook() {
    if (!testUrl.trim()) return
    setTestLoading(true)
    try {
      await fetch(testUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event:     'test',
          type:      'system',
          severity:  'info',
          title:     '✅ OUTRAGE webhook connected',
          message:   'Your webhook is configured correctly. Alerts will arrive here.',
          timestamp: new Date().toISOString(),
        }),
      })
      setTestSent(true)
      setTimeout(() => setTestSent(false), 3000)
    } finally {
      setTestLoading(false)
    }
  }

  function createDigestRule() {
    createRule({
      name:          'Daily Digest Delivery',
      trigger_type:  'digest',
      notify_in_app: true,
      notify_email:  false,
      webhook_url:   testUrl.trim() || null,
    })
  }

  return (
    <div className="space-y-6">

      {/* In-app notifications */}
      <Section
        icon={<Bell className="h-4 w-4 text-blue-400" />}
        title="In-App Notifications"
        description="Alerts appear in the notification bell and Alerts inbox. Always enabled."
      >
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-blue-950/30 border border-blue-800/40">
          <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0" />
          <span className="text-xs text-blue-400">In-app notifications are always active</span>
        </div>
      </Section>

      {/* Webhook / n8n integration */}
      <Section
        icon={<Globe className="h-4 w-4 text-purple-400" />}
        title="Webhook Delivery"
        description="Send alerts to Telegram, Slack, Discord, or any n8n workflow via webhooks."
      >
        <div className="space-y-3">
          <p className="text-xs text-muted">
            Test your webhook endpoint before configuring it on individual alert rules.
            Webhooks are set per-rule — this just tests connectivity.
          </p>

          <div className="flex gap-2">
            <input
              className="flex-1 bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
              placeholder="https://your-n8n.cloud/webhook/..."
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
            />
            <Button
              variant="secondary" size="sm"
              disabled={!testUrl.trim() || testLoading}
              onClick={sendTestWebhook}
            >
              {testLoading ? 'Sending…' : testSent ? '✅ Sent!' : 'Test'}
            </Button>
          </div>

          {!digestRule && testUrl.trim() && (
            <Button
              variant="ghost" size="sm"
              disabled={creating}
              onClick={createDigestRule}
              className="w-full"
            >
              + Also create digest delivery rule with this URL
            </Button>
          )}
        </div>
      </Section>

      {/* Platform guides */}
      <Section
        icon={<Send className="h-4 w-4 text-zinc-500" />}
        title="Platform Setup Guides"
        description="How to connect OUTRAGE alerts to your preferred messaging platform."
      >
        <div className="space-y-2">
          {N8N_GUIDE.map((guide) => (
            <div key={guide.platform} className="rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => setOpenGuide(openGuide === guide.platform ? null : guide.platform)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-raised transition-colors text-left"
              >
                <span className="text-base shrink-0">{guide.icon}</span>
                <span className="text-sm font-medium text-foreground flex-1">{guide.platform}</span>
                <span className="text-xs text-zinc-600">
                  {openGuide === guide.platform ? 'Hide' : 'Show setup'}
                </span>
              </button>

              {openGuide === guide.platform && (
                <div className="px-4 pb-4 border-t border-border">
                  <ol className="mt-3 space-y-2">
                    {guide.steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[10px] text-zinc-600 tabular-nums shrink-0 mt-0.5 w-4">
                          {i + 1}.
                        </span>
                        <span className="text-xs text-muted">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Webhook payload format */}
      <Section
        icon={<Info className="h-4 w-4 text-zinc-500" />}
        title="Webhook Payload Format"
        description="Standard JSON payload sent to all webhook destinations."
      >
        <div className="bg-zinc-950 rounded-lg border border-zinc-800 p-4 overflow-x-auto">
          <pre className="text-xs text-zinc-400 font-mono leading-relaxed">{`{
  "event":       "alert" | "digest",
  "type":        "post_now" | "trend_dying" | ...,
  "severity":    "critical" | "high" | "medium" | "info",
  "title":       "Post Now: Viral Cat Meme Wave",
  "message":     "Urgency 87 · Priority 92. Window open...",
  "cluster_id":  "uuid",
  "cluster_url": "https://yourapp.com/trends/uuid",
  "timestamp":   "2026-03-19T09:00:00.000Z",
  "org_id":      "uuid",
  "data":        { ...scoring data }
}`}</pre>
        </div>
        <p className="text-xs text-zinc-600 mt-2">
          n8n workflows can inspect <code className="text-zinc-500">event</code> and <code className="text-zinc-500">type</code> to
          route to different channels or format the message differently per platform.
        </p>
      </Section>
    </div>
  )
}

function Section({
  icon, title, description, children,
}: {
  icon:        React.ReactNode
  title:       string
  description: string
  children:    React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted">{description}</p>
        </div>
      </div>
      <div className="pl-6">{children}</div>
    </div>
  )
}
