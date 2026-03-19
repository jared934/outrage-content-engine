import { Metadata } from 'next'
import Link from 'next/link'
import { Settings, Database, Workflow, Mic2, Bell, Eye, Zap, ChevronRight } from 'lucide-react'

export const metadata: Metadata = { title: 'Settings' }

const SETTINGS_SECTIONS = [
  {
    href: '/settings/automation',
    icon: Zap,
    title: 'Automation',
    description: 'Toggle AI token usage and n8n workflow triggers on or off',
    badge: null,
  },
  {
    href: '/settings/sources',
    icon: Database,
    title: 'Sources & Ingestion',
    description: 'RSS feeds, Reddit, YouTube, and other content sources',
    badge: null,
  },
  {
    href: '/settings/workflows',
    icon: Workflow,
    title: 'n8n Workflows',
    description: 'View and configure automation workflow status',
    badge: 'Setup Required',
  },
  {
    href: '/brand',
    icon: Mic2,
    title: 'Brand Voice',
    description: 'Configure the AI brand voice and content generation prompts',
    badge: null,
  },
  {
    href: '/competitors',
    icon: Eye,
    title: 'Competitor Tracking',
    description: 'Monitor competitor accounts and identify content gaps',
    badge: null,
  },
  {
    href: '/alerts',
    icon: Bell,
    title: 'Alert Rules',
    description: 'Score thresholds, keyword triggers, and notification routing',
    badge: null,
  },
]

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-muted" />
        <h1 className="font-display font-bold text-xl text-foreground">Settings</h1>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden divide-y divide-border">
        {SETTINGS_SECTIONS.map(({ href, icon: Icon, title, description, badge }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 p-4 hover:bg-surface-raised transition-colors group"
          >
            <div className="p-2.5 bg-background rounded-lg border border-border shrink-0">
              <Icon className="h-4 w-4 text-muted" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">{title}</p>
                {badge && (
                  <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">
                    {badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted mt-0.5">{description}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-zinc-700 group-hover:text-muted transition-colors shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  )
}
