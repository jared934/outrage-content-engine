'use client'

import { useState } from 'react'
import { Copy, Download, Trash2, Pencil, Link2, FileText, Music, Video } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { CATEGORY_CONFIG, formatBytes, isImageType } from '@/lib/assets/asset.types'
import type { Asset } from '@/lib/assets/asset.types'

interface AssetCardProps {
  asset:    Asset
  onSelect: (asset: Asset) => void
  selected: boolean
}

function AssetPreview({ asset }: { asset: Asset }) {
  const [err, setErr] = useState(false)

  if (isImageType(asset.type) && asset.url && !err) {
    return (
      <img
        src={asset.url}
        alt={asset.alt_text ?? asset.name}
        className="w-full h-full object-cover"
        onError={() => setErr(true)}
        loading="lazy"
      />
    )
  }

  // Fallback icon
  const icons: Record<string, React.ReactNode> = {
    video:    <Video    className="h-8 w-8 text-purple-400" />,
    audio:    <Music    className="h-8 w-8 text-green-400"  />,
    document: <FileText className="h-8 w-8 text-amber-400" />,
  }
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-surface-raised">
      {icons[asset.type] ?? <FileText className="h-8 w-8 text-zinc-600" />}
      <span className="text-[10px] text-zinc-600 uppercase">{asset.type}</span>
    </div>
  )
}

export function AssetCard({ asset, onSelect, selected }: AssetCardProps) {
  const [hovered, setHovered] = useState(false)
  const catCfg = CATEGORY_CONFIG[asset.category]

  function copyUrl(e: React.MouseEvent) {
    e.stopPropagation()
    navigator.clipboard.writeText(asset.url)
  }

  function download(e: React.MouseEvent) {
    e.stopPropagation()
    const a = document.createElement('a')
    a.href = asset.url; a.download = asset.name; a.click()
  }

  return (
    <div
      className={cn(
        'group relative rounded-xl border overflow-hidden cursor-pointer transition-all',
        'bg-surface hover:border-zinc-600',
        selected
          ? 'border-accent ring-1 ring-accent/50'
          : 'border-border',
      )}
      onClick={() => onSelect(asset)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Preview */}
      <div className="aspect-square relative overflow-hidden bg-zinc-950">
        <AssetPreview asset={asset} />

        {/* Hover overlay */}
        <div className={cn(
          'absolute inset-0 bg-black/60 flex items-center justify-center gap-2 transition-opacity',
          hovered ? 'opacity-100' : 'opacity-0',
        )}>
          <button
            onClick={copyUrl}
            className="p-2 rounded-lg bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
            title="Copy URL"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={download}
            className="p-2 rounded-lg bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
            title="Download"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(asset) }}
            className="p-2 rounded-lg bg-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="px-2.5 py-2">
        <p className="text-xs font-medium text-foreground truncate" title={asset.name}>
          {asset.name}
        </p>
        <div className="flex items-center justify-between mt-0.5 gap-1">
          <span className={cn('text-[10px]', catCfg.color)}>
            {catCfg.icon} {catCfg.label}
          </span>
          <span className="text-[10px] text-zinc-700 tabular-nums">
            {formatBytes(asset.file_size_bytes)}
          </span>
        </div>
        {/* Tags */}
        {asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-0.5 mt-1.5">
            {asset.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-500">
                {tag}
              </span>
            ))}
            {asset.tags.length > 3 && (
              <span className="text-[9px] text-zinc-700">+{asset.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
