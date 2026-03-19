'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'
import {
  CATEGORY_CONFIG, ASSET_CATEGORIES,
  mimeToAssetType, formatBytes,
} from '@/lib/assets/asset.types'
import type { AssetCategory, AssetUploadProgress } from '@/lib/assets/asset.types'
import { useSaveAssetMetadata } from '@/hooks/useAssets'

const BUCKET = 'org-assets'
const ACCEPTED_MIME = 'image/*,video/*,audio/*,application/pdf,.svg'

interface AssetUploadZoneProps {
  orgId:     string
  onDone?:   () => void
  compact?:  boolean
}

function getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) return resolve(null)
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload  = () => { URL.revokeObjectURL(url); resolve({ width: img.naturalWidth, height: img.naturalHeight }) }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    img.src = url
  })
}

export function AssetUploadZone({ orgId, onDone, compact = false }: AssetUploadZoneProps) {
  const supabase = createClient()
  const { mutateAsync: saveMeta } = useSaveAssetMetadata(orgId)

  const [dragging,  setDragging]  = useState(false)
  const [queue,     setQueue]     = useState<AssetUploadProgress[]>([])
  const [category,  setCategory]  = useState<AssetCategory>('other')
  const [tagInput,  setTagInput]  = useState('')
  const [tags,      setTags]      = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const updateItem = useCallback((name: string, patch: Partial<AssetUploadProgress>) => {
    setQueue((q) => q.map((i) => i.name === name ? { ...i, ...patch } : i))
  }, [])

  async function uploadFile(file: File) {
    const path = `${orgId}/${category}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`

    updateItem(file.name, { status: 'uploading', progress: 10 })

    const { error: storageErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { cacheControl: '31536000', upsert: false })

    if (storageErr) {
      updateItem(file.name, { status: 'error', error: storageErr.message })
      return
    }

    updateItem(file.name, { progress: 70, status: 'saving' })

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
    const dims = await getImageDimensions(file)

    try {
      const asset = await saveMeta({
        name:            file.name,
        type:            mimeToAssetType(file.type),
        category,
        url:             publicUrl,
        storage_path:    path,
        mime_type:       file.type,
        file_size_bytes: file.size,
        width:           dims?.width  ?? null,
        height:          dims?.height ?? null,
        tags,
      })
      updateItem(file.name, { progress: 100, status: 'done', asset })
    } catch (err) {
      // Metadata save failed — clean up storage
      await supabase.storage.from(BUCKET).remove([path])
      updateItem(file.name, { status: 'error', error: String(err) })
    }
  }

  function enqueue(files: FileList | File[]) {
    const arr = Array.from(files)
    const newItems: AssetUploadProgress[] = arr.map((f) => ({
      file: f, name: f.name, progress: 0, status: 'pending',
    }))
    setQueue((q) => [...q, ...newItems])
    arr.forEach(uploadFile)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length) enqueue(e.dataTransfer.files)
  }

  function addTag(e: React.KeyboardEvent) {
    if (e.key !== 'Enter' || !tagInput.trim()) return
    e.preventDefault()
    setTags((t) => Array.from(new Set([...t, tagInput.trim()])))
    setTagInput('')
  }

  const doneCount  = queue.filter((i) => i.status === 'done').length
  const errorCount = queue.filter((i) => i.status === 'error').length
  const activeCount = queue.filter((i) => ['pending','uploading','saving'].includes(i.status)).length

  if (compact) {
    return (
      <label
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border',
          'text-xs text-zinc-500 hover:text-foreground hover:border-zinc-600 cursor-pointer transition-colors',
          dragging && 'border-accent text-accent',
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <Upload className="h-3.5 w-3.5 shrink-0" />
        {activeCount > 0 ? `Uploading ${activeCount}…` : 'Upload files'}
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={ACCEPTED_MIME}
          className="hidden"
          onChange={(e) => e.target.files && enqueue(e.target.files)}
        />
      </label>
    )
  }

  return (
    <div className="space-y-4">
      {/* Options row */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Category */}
        <div>
          <label className="block text-xs text-muted mb-1 font-medium">Category for upload</label>
          <select
            className="bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
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

        {/* Tags */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-muted mb-1 font-medium">Tags (optional)</label>
          <div className="flex items-center gap-2">
            <div className="flex flex-wrap gap-1 flex-1 bg-surface-raised border border-border rounded-lg px-3 py-1.5 min-h-[38px] items-center">
              {tags.map((tag) => (
                <span key={tag} className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-zinc-700 text-xs text-zinc-300">
                  {tag}
                  <button onClick={() => setTags((t) => t.filter((x) => x !== tag))} className="text-zinc-500 hover:text-red-400">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
              <input
                className="bg-transparent text-sm text-foreground placeholder:text-zinc-700 focus:outline-none min-w-[80px] flex-1"
                placeholder={tags.length === 0 ? 'Add tag, press Enter…' : ''}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={addTag}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Drop zone */}
      <div
        className={cn(
          'relative rounded-xl border-2 border-dashed p-10 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer',
          dragging
            ? 'border-accent bg-accent/5 scale-[1.01]'
            : 'border-border hover:border-zinc-600 hover:bg-surface-raised/30',
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <div className={cn(
          'p-4 rounded-full transition-colors',
          dragging ? 'bg-accent/20' : 'bg-surface-raised',
        )}>
          <Upload className={cn('h-8 w-8', dragging ? 'text-accent' : 'text-zinc-600')} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            {dragging ? 'Drop to upload' : 'Drop files or click to browse'}
          </p>
          <p className="text-xs text-zinc-600 mt-1">
            Images, video, audio, PDFs • Max 50 MB per file
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={ACCEPTED_MIME}
          className="hidden"
          onChange={(e) => e.target.files && enqueue(e.target.files)}
        />
      </div>

      {/* Upload queue */}
      {queue.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface-raised">
            <span className="text-xs font-semibold text-foreground">
              Uploads — {doneCount}/{queue.length} done
              {errorCount > 0 && <span className="text-red-500 ml-2">{errorCount} failed</span>}
            </span>
            {activeCount === 0 && (
              <button
                onClick={() => { setQueue([]); onDone?.() }}
                className="text-xs text-zinc-600 hover:text-foreground transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          <div className="divide-y divide-border max-h-64 overflow-y-auto">
            {queue.map((item) => (
              <UploadRow key={item.name} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function UploadRow({ item }: { item: AssetUploadProgress }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      {/* Status icon */}
      <div className="shrink-0">
        {item.status === 'done' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
        {item.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
        {['pending','uploading','saving'].includes(item.status) && (
          <Loader2 className="h-4 w-4 text-accent animate-spin" />
        )}
      </div>

      {/* Name + bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs text-foreground truncate">{item.name}</span>
          {item.status === 'error' && (
            <span className="text-[10px] text-red-500 truncate shrink-0">{item.error}</span>
          )}
          {item.status === 'done' && item.asset && (
            <span className="text-[10px] text-zinc-600 shrink-0">
              {formatBytes(item.asset.file_size_bytes)}
            </span>
          )}
        </div>
        {item.status !== 'done' && item.status !== 'error' && (
          <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300"
              style={{ width: `${item.progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Thumbnail on done */}
      {item.status === 'done' && item.asset?.url && item.asset.type === 'image' && (
        <img
          src={item.asset.url}
          alt=""
          className="h-8 w-8 rounded object-cover shrink-0 border border-border"
        />
      )}
    </div>
  )
}
