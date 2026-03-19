'use client'

import { Download, Eye } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { EXPORT_SIZES } from '@/lib/meme/meme.types'
import type { ExportSize, MemeCanvasState } from '@/lib/meme/meme.types'

interface ExportControlsProps {
  exportSize:       ExportSize
  onSizeChange:     (size: ExportSize) => void
  showWatermark:    boolean
  onWatermarkChange:(show: boolean) => void
  watermarkPosition: MemeCanvasState['watermarkPosition']
  onWatermarkPos:   (pos: MemeCanvasState['watermarkPosition']) => void
  onExport:         () => void
  isExporting?:     boolean
}

const WATERMARK_POSITIONS: { value: MemeCanvasState['watermarkPosition']; label: string }[] = [
  { value: 'top_left',     label: 'Top Left' },
  { value: 'top_right',    label: 'Top Right' },
  { value: 'bottom_left',  label: 'Bottom Left' },
  { value: 'bottom_right', label: 'Bottom Right' },
]

export function ExportControls({
  exportSize, onSizeChange,
  showWatermark, onWatermarkChange,
  watermarkPosition, onWatermarkPos,
  onExport, isExporting,
}: ExportControlsProps) {
  return (
    <div className="space-y-4">
      {/* Export size */}
      <div>
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold mb-2">
          Export Size
        </p>
        <div className="space-y-1">
          {(Object.entries(EXPORT_SIZES) as [ExportSize, typeof EXPORT_SIZES[ExportSize]][]).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => onSizeChange(key)}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs transition-all',
                exportSize === key
                  ? 'border-accent/50 bg-accent/5 text-foreground'
                  : 'border-border bg-surface text-muted hover:border-zinc-600',
              )}
            >
              <span className="font-medium">{meta.label}</span>
              <span className="text-zinc-600">{meta.width}×{meta.height}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Watermark */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
            OUTRAGE Watermark
          </p>
          <button
            onClick={() => onWatermarkChange(!showWatermark)}
            className={cn(
              'relative h-5 w-9 rounded-full border transition-all',
              showWatermark
                ? 'bg-accent border-accent'
                : 'bg-zinc-800 border-zinc-700',
            )}
          >
            <span className={cn(
              'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all',
              showWatermark ? 'left-4' : 'left-0.5',
            )} />
          </button>
        </div>

        {showWatermark && (
          <div className="grid grid-cols-2 gap-1">
            {WATERMARK_POSITIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => onWatermarkPos(value)}
                className={cn(
                  'text-[10px] py-1 rounded-md border transition-all',
                  watermarkPosition === value
                    ? 'bg-accent/10 border-accent/30 text-accent'
                    : 'bg-surface border-border text-zinc-500 hover:text-muted',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Export button */}
      <button
        onClick={onExport}
        disabled={isExporting}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 active:scale-[0.98] transition-all disabled:opacity-50"
      >
        {isExporting
          ? <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
          : <Download className="h-4 w-4" />
        }
        {isExporting ? 'Exporting…' : 'Export PNG'}
      </button>
    </div>
  )
}
