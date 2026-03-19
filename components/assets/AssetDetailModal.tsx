'use client'

import { useState, useEffect } from 'react'
import {
  X, Copy, Download, Trash2, ExternalLink,
  FileText, Music, Video, CheckCircle2,
} from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'
import { useUpdateAsset, useArchiveAsset } from '@/hooks/useAssets'
import {
  CATEGORY_CONFIG, ASSET_CATEGORIES,
  formatBytes, isImageType,
} from '@/lib/assets/asset.types'
import type { Asset, AssetCategory, UpdateAssetInput } from '@/lib/assets/asset.types'

interface AssetDetailModalProps {
  asset:   Asset
  onClose: () => void
}

export function AssetDetailModal({ asset, onClose }: AssetDetailModalProps) {
  const { mutate: update, isPending: saving } = useUpdateAsset()
  const { mutate: archive }                   = useArchiveAsset()

  const [name,     setName]     = useState(asset.name)
  const [category, setCategory] = useState<AssetCategory>(asset.category)
  const [altText,  setAltText]  = useState(asset.alt_text ?? '')
  const [desc,     setDesc]     = useState(asset.description ?? '')
  const [tagInput, setTagInput] = useState('')
  const [tags,     setTags]     = useState<string[]>([...asset.tags])
  const [copied,   setCopied]   = useState(false)

  useEffect(() => {
    setName(asset.name)
    setCategory(asset.category)
    setAltText(asset.alt_text ?? '')
    setDesc(asset.description ?? '')
    setTags([...asset.tags])
  }, [asset.id])

  function copyUrl() {
    navigator.clipboard.writeText(asset.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function download() {
    const a = document.createElement('a')
    a.href = asset.url; a.download = asset.name; a.click()
  }

  function addTag(e: React.KeyboardEvent) {
    if (e.key !== 'Enter' || !tagInput.trim()) return
    e.preventDefault()
    setTags((t) => Array.from(new Set([...t, tagInput.trim()])))
    setTagInput('')
  }

  function save() {
    const updates: UpdateAssetInput = {
      name,
      category,
      alt_text:    altText || null,
      description: desc    || null,
      tags,
    }
    update({ id: asset.id, updates }, { onSuccess: onClose })
  }

  function del(hard: boolean) {
    archive({ id: asset.id, hard }, { onSuccess: onClose })
  }

  const catCfg = CATEGORY_CONFIG[category]

  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-50" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-3xl max-h-[90vh] bg-surface border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <span className={cn('text-sm', catCfg.color)}>{catCfg.icon}</span>
              <span className="text-sm font-semibold text-foreground truncate max-w-xs">{asset.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copyUrl}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs text-zinc-500 hover:text-foreground hover:border-zinc-600 transition-colors"
              >
                {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied!' : 'Copy URL'}
              </button>
              <button
                onClick={download}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs text-zinc-500 hover:text-foreground hover:border-zinc-600 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </button>
              <button onClick={onClose} className="text-zinc-600 hover:text-foreground transition-colors ml-1">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">

            {/* Preview pane */}
            <div className="md:w-1/2 bg-zinc-950 flex items-center justify-center p-4 border-b md:border-b-0 md:border-r border-border min-h-[200px] md:min-h-0">
              {isImageType(asset.type) ? (
                <img
                  src={asset.url}
                  alt={asset.alt_text ?? asset.name}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              ) : asset.type === 'video' ? (
                <video
                  src={asset.url}
                  controls
                  className="max-w-full max-h-full rounded-lg"
                />
              ) : asset.type === 'audio' ? (
                <div className="flex flex-col items-center gap-3">
                  <Music className="h-12 w-12 text-zinc-600" />
                  <audio src={asset.url} controls className="w-full max-w-xs" />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <FileText className="h-12 w-12 text-zinc-600" />
                  <a
                    href={asset.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-accent hover:underline"
                  >
                    Open file <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Edit pane */}
            <div className="md:w-1/2 overflow-y-auto p-5 space-y-4">

              {/* File info */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Type',     value: asset.mime_type ?? asset.type },
                  { label: 'Size',     value: formatBytes(asset.file_size_bytes) },
                  { label: 'Dimensions',value: asset.width && asset.height ? `${asset.width}×${asset.height}` : '—' },
                  { label: 'Uploaded', value: format(new Date(asset.created_at), 'MMM d, yyyy') },
                ].map(({ label, value }) => (
                  <div key={label} className="px-3 py-2 bg-surface-raised rounded-lg">
                    <p className="text-[10px] text-muted mb-0.5">{label}</p>
                    <p className="text-xs text-foreground truncate">{value}</p>
                  </div>
                ))}
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs text-muted mb-1 font-medium">Name</label>
                <input
                  className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs text-muted mb-1 font-medium">Category</label>
                <select
                  className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as AssetCategory)}
                >
                  {ASSET_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_CONFIG[c].icon} {CATEGORY_CONFIG[c].label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Alt text */}
              <div>
                <label className="block text-xs text-muted mb-1 font-medium">Alt text</label>
                <input
                  className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                  placeholder="Describe this image for accessibility…"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs text-muted mb-1 font-medium">Description</label>
                <textarea
                  rows={2}
                  className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent resize-none"
                  placeholder="Notes about this asset…"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs text-muted mb-1.5 font-medium">Tags</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map((tag) => (
                    <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 text-xs text-zinc-300">
                      {tag}
                      <button onClick={() => setTags((t) => t.filter((x) => x !== tag))} className="text-zinc-500 hover:text-red-400">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                  placeholder="Add tag, press Enter…"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={addTag}
                />
              </div>

              {/* Storage path */}
              {asset.storage_path && (
                <div className="flex items-center gap-2 px-3 py-2 bg-surface-raised rounded-lg border border-border">
                  <ExternalLink className="h-3 w-3 text-muted shrink-0" />
                  <span className="text-[10px] text-zinc-600 truncate">{asset.storage_path}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-border shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => del(false)}
                className="text-xs text-zinc-600 hover:text-amber-500 transition-colors"
              >
                Archive
              </button>
              <span className="text-zinc-800">·</span>
              <button
                onClick={() => { if (confirm('Permanently delete this asset and remove from storage?')) del(true) }}
                className="text-xs text-zinc-600 hover:text-red-500 transition-colors"
              >
                Delete permanently
              </button>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
