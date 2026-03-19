'use client'

// QuickCaptureModal — ⌘Shift+I anywhere in the app
// Captures a raw idea directly into the pipeline (status=idea_bank)
// without navigating away from the current page.

import { useState, useEffect, useRef } from 'react'
import { X, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'

const PLATFORMS = ['instagram', 'twitter', 'tiktok', 'youtube', 'all'] as const
type Platform = typeof PLATFORMS[number]

interface QuickCaptureModalProps {
  isOpen: boolean
  onClose: () => void
}

export function QuickCaptureModal({ isOpen, onClose }: QuickCaptureModalProps) {
  const [title,    setTitle]    = useState('')
  const [notes,    setNotes]    = useState('')
  const [platform, setPlatform] = useState<Platform>('instagram')
  const [saving,   setSaving]   = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus on open, reset on close
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setTimeout(() => { setTitle(''); setNotes(''); setPlatform('instagram') }, 200)
    }
  }, [isOpen])

  // Dismiss on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/pipeline/items', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          title:    title.trim(),
          notes:    notes.trim() || null,
          platform: platform === 'all' ? null : platform,
          status:   'idea_bank',
          urgency:  50,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to save')
      }
      toast.success('Idea captured', {
        description: title.trim(),
        action: { label: 'View Pipeline', onClick: () => window.location.href = '/pipeline' },
      })
      onClose()
    } catch (err) {
      toast.error('Could not save idea', { description: String(err) })
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md bg-[#0c0c0d] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-foreground">Quick Capture</span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-600 hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 space-y-3">
          {/* Title */}
          <input
            ref={inputRef}
            type="text"
            placeholder="What's the idea? (required)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) handleSave()
            }}
            className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
          />

          {/* Notes (optional) */}
          <textarea
            placeholder="Notes or hook (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors resize-none"
          />

          {/* Platform picker */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[11px] font-medium border capitalize transition-colors',
                  platform === p
                    ? 'bg-accent/20 border-accent/50 text-accent'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-600',
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 pb-4 gap-3">
          <p className="text-[10px] text-zinc-700">Saved to Pipeline → Idea Bank</p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-zinc-500 hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim() || saving}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-accent text-black hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {saving ? 'Saving…' : 'Capture'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
