import { Metadata } from 'next'
import { Mic2, Sparkles, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export const metadata: Metadata = { title: 'Brand Voice' }

const TONE_TAGS = ['Bold', 'Sarcastic', 'Outraged', 'Unapologetic', 'Chronically Online', 'Gen Z']

const SAMPLE_CAPTIONS = [
  'The internet will never forgive this. And neither will we. 🔥',
  'We said what we said and we stand on it.',
  'The audacity. The NERVE. The absolute disrespect. 😤',
  'Not us being the only ones covering this with the energy it deserves.',
]

const AVOID_WORDS = ['allegedly', 'reportedly', 'sources say', 'it seems']

export default function BrandPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="text-zinc-600 hover:text-muted transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2">
          <Mic2 className="h-5 w-5 text-muted" />
          <h1 className="font-display font-bold text-xl text-foreground">Brand Voice</h1>
        </div>
        <Badge variant="warning">Read Only</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle>OUTRAGE Default Voice</CardTitle></CardHeader>
        <CardBody>
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Tone Keywords</p>
              <div className="flex gap-2 flex-wrap">
                {TONE_TAGS.map((t) => (
                  <span key={t} className="text-xs bg-accent/10 text-accent border border-accent/20 px-2.5 py-1 rounded-full">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Avoid</p>
              <div className="flex gap-2 flex-wrap">
                {AVOID_WORDS.map((w) => (
                  <span key={w} className="text-xs bg-zinc-800 text-zinc-500 border border-zinc-700 px-2.5 py-1 rounded-full line-through">
                    {w}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Sample Voice</p>
              <div className="space-y-2">
                {SAMPLE_CAPTIONS.map((c, i) => (
                  <p key={i} className="text-sm text-foreground bg-surface-raised rounded-lg p-3 leading-relaxed">
                    {c}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="bg-surface border border-border rounded-lg p-4 flex items-start gap-3">
        <Sparkles className="h-4 w-4 text-accent shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">Full Editor Coming in Phase 6</p>
          <p className="text-xs text-muted mt-1">
            Configure your AI system prompt, add/remove tone keywords, create multiple voice profiles for different content types.
            Brand settings are stored in <code className="font-mono text-[11px] bg-surface-raised px-1 py-0.5 rounded">brand_settings</code>.
          </p>
        </div>
      </div>
    </div>
  )
}
