'use client'

import { useState } from 'react'
import { Copy, Check, ChevronDown, ChevronUp, Palette, Link2, FileText, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { CanvaExportPayload, LinkedAsset } from '@/lib/canva/canva.types'

interface ExportPayloadCardProps {
  payload: CanvaExportPayload
  compact?: boolean
}

// ---------------------------------------------------------------------------
// Copy button
// ---------------------------------------------------------------------------

function CopyButton({ text, className }: { text: string | null; className?: string }) {
  const [copied, setCopied] = useState(false)

  if (!text) return null

  async function handleCopy() {
    await navigator.clipboard.writeText(text!)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'flex-shrink-0 text-zinc-600 hover:text-accent transition-colors',
        className,
      )}
      title="Copy to clipboard"
    >
      {copied
        ? <Check className="h-3 w-3 text-green-400" />
        : <Copy className="h-3 w-3" />
      }
    </button>
  )
}

// ---------------------------------------------------------------------------
// Field row
// ---------------------------------------------------------------------------

function FieldRow({ label, value, mono = false }: { label: string; value: string | null | undefined; mono?: boolean }) {
  if (!value) return null
  return (
    <div className="group flex items-start gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium mb-0.5">{label}</p>
        <p className={cn(
          'text-xs text-foreground leading-relaxed',
          mono && 'font-mono text-[11px] text-zinc-300'
        )}>
          {value}
        </p>
      </div>
      <CopyButton text={value} className="mt-4 opacity-0 group-hover:opacity-100" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Collapsible section
// ---------------------------------------------------------------------------

function Section({
  icon: Icon, title, children, defaultOpen = true,
}: {
  icon:        React.ComponentType<{ className?: string }>
  title:       string
  children:    React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-surface-raised text-left"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-xs font-semibold text-muted">{title}</span>
        </div>
        {open
          ? <ChevronUp className="h-3.5 w-3.5 text-zinc-600" />
          : <ChevronDown className="h-3.5 w-3.5 text-zinc-600" />
        }
      </button>
      {open && (
        <div className="px-3 py-3 space-y-3 bg-surface">
          {children}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Copy all button
// ---------------------------------------------------------------------------

function CopyAllButton({ payload }: { payload: CanvaExportPayload }) {
  const [copied, setCopied] = useState(false)

  async function handleCopyAll() {
    const parts = [
      `TEMPLATE: ${payload.template_type.toUpperCase().replace(/_/g, ' ')}`,
      `DIMENSIONS: ${payload.dimensions.width}×${payload.dimensions.height}px`,
      '',
      payload.headline     && `HEADLINE:\n${payload.headline}`,
      payload.subheadline  && `SUBHEADLINE:\n${payload.subheadline}`,
      payload.caption      && `CAPTION:\n${payload.caption}`,
      payload.cta          && `CTA:\n${payload.cta}`,
      '',
      payload.visual_direction && `VISUAL DIRECTION:\n${payload.visual_direction}`,
      payload.design_notes     && `DESIGN NOTES:\n${payload.design_notes}`,
      '',
      `BRAND COLORS: ${payload.brand_theme.primary_color} / ${payload.brand_theme.accent_color}`,
      `FONTS: ${payload.brand_theme.font_headline} / ${payload.brand_theme.font_body}`,
      payload.brand_theme.tone_keywords.length > 0
        && `TONE: ${payload.brand_theme.tone_keywords.join(', ')}`,
    ].filter(Boolean).join('\n')

    await navigator.clipboard.writeText(parts)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopyAll}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface text-xs text-muted hover:text-foreground hover:border-zinc-600 transition-all"
    >
      {copied
        ? <><Check className="h-3 w-3 text-green-400" /> Copied all</>
        : <><Copy className="h-3 w-3" /> Copy all</>
      }
    </button>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ExportPayloadCard({ payload, compact = false }: ExportPayloadCardProps) {
  return (
    <div className="space-y-2">
      {/* Header: dimensions + copy all */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Monitor className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-xs text-muted">
            {payload.dimensions.width}×{payload.dimensions.height}px — {payload.dimensions.label}
          </span>
        </div>
        <CopyAllButton payload={payload} />
      </div>

      {/* Copy section */}
      <Section icon={FileText} title="Copy" defaultOpen>
        <FieldRow label="Headline"    value={payload.headline} />
        <FieldRow label="Subheadline" value={payload.subheadline} />
        <FieldRow label="Caption"     value={payload.caption} />
        <FieldRow label="CTA"         value={payload.cta} />
      </Section>

      {/* Direction */}
      {(payload.visual_direction || payload.design_notes) && (
        <Section icon={Palette} title="Direction" defaultOpen>
          <FieldRow label="Visual Direction" value={payload.visual_direction} />
          <FieldRow label="Design Notes"     value={payload.design_notes} />
        </Section>
      )}

      {/* Brand */}
      {!compact && (
        <Section icon={Palette} title="Brand Theme" defaultOpen={false}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium mb-1">Colors</p>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-4 w-4 rounded border border-border flex-shrink-0"
                    style={{ backgroundColor: payload.brand_theme.primary_color }}
                  />
                  <span className="text-[10px] font-mono text-zinc-400">{payload.brand_theme.primary_color}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-4 w-4 rounded border border-border flex-shrink-0"
                    style={{ backgroundColor: payload.brand_theme.accent_color }}
                  />
                  <span className="text-[10px] font-mono text-zinc-400">{payload.brand_theme.accent_color}</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium mb-1">Fonts</p>
              <p className="text-xs text-muted">{payload.brand_theme.font_headline}</p>
              <p className="text-xs text-zinc-600">{payload.brand_theme.font_body}</p>
            </div>
          </div>

          {payload.brand_theme.tone_keywords.length > 0 && (
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium mb-1">Tone</p>
              <div className="flex flex-wrap gap-1">
                {payload.brand_theme.tone_keywords.map((kw) => (
                  <span key={kw} className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-800 border border-border text-zinc-400">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {payload.brand_theme.style_notes && (
            <FieldRow label="Style Notes" value={payload.brand_theme.style_notes} />
          )}
        </Section>
      )}

      {/* Linked assets */}
      {payload.linked_assets.length > 0 && (
        <Section icon={Link2} title="Linked Assets" defaultOpen={false}>
          <div className="space-y-1.5">
            {payload.linked_assets.map((asset, i) => (
              <AssetRow key={i} asset={asset} />
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

function AssetRow({ asset }: { asset: LinkedAsset }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md bg-surface-raised border border-border">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-zinc-500 uppercase font-medium">{asset.type.replace(/_/g, ' ')}</p>
        <p className="text-xs text-muted truncate">{asset.label}</p>
      </div>
      {asset.url && (
        <a
          href={asset.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-600 hover:text-accent transition-colors flex-shrink-0"
        >
          <Link2 className="h-3 w-3" />
        </a>
      )}
    </div>
  )
}
