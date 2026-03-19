'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'
import {
  PLATFORM_CONFIG, POST_TYPE_CONFIG, HOOK_TYPE_CONFIG, CAPTION_STYLE_CONFIG,
} from '@/lib/performance/performance.types'
import { useCreatePerformancePost } from '@/hooks/usePerformance'
import type {
  PerfPlatform, PerfPostType, PerfHookType, PerfCaptionStyle,
} from '@/lib/performance/performance.types'

interface AddPostModalProps {
  orgId:   string
  onClose: () => void
}

export function AddPostModal({ orgId, onClose }: AddPostModalProps) {
  const [title,        setTitle]        = useState('')
  const [platform,     setPlatform]     = useState<PerfPlatform>('instagram')
  const [postType,     setPostType]     = useState<PerfPostType>('reel')
  const [topic,        setTopic]        = useState('')
  const [category,     setCategory]     = useState('')
  const [hookType,     setHookType]     = useState<PerfHookType>('none')
  const [hookText,     setHookText]     = useState('')
  const [captionStyle, setCaptionStyle] = useState<PerfCaptionStyle>('short')
  const [postedAt,     setPostedAt]     = useState(() => {
    const d = new Date()
    d.setMinutes(0, 0, 0)
    return d.toISOString().slice(0, 16)
  })

  // Metrics
  const [views,          setViews]         = useState('')
  const [likes,          setLikes]         = useState('')
  const [shares,         setShares]        = useState('')
  const [saves,          setSaves]         = useState('')
  const [comments,       setComments]      = useState('')
  const [engagementRate, setEngagementRate]= useState('')
  const [followerGain,   setFollowerGain]  = useState('')
  const [postUrl,        setPostUrl]       = useState('')
  const [notes,          setNotes]         = useState('')

  const { mutate: create, isPending } = useCreatePerformancePost(orgId)

  function submit() {
    if (!title.trim()) return
    create(
      {
        title:           title.trim(),
        platform,
        post_type:       postType,
        topic:           topic.trim() || null,
        category:        category.trim() || null,
        hook_type:       hookType,
        hook_text:       hookText.trim() || null,
        caption_style:   captionStyle,
        posted_at:       new Date(postedAt).toISOString(),
        views:           numOrNull(views),
        likes:           numOrNull(likes),
        shares:          numOrNull(shares),
        saves:           numOrNull(saves),
        comments:        numOrNull(comments),
        engagement_rate: numOrNull(engagementRate),
        follower_gain:   numOrNull(followerGain),
        post_url:        postUrl.trim() || null,
        notes:           notes.trim() || null,
      },
      { onSuccess: onClose }
    )
  }

  const platforms = Object.entries(PLATFORM_CONFIG) as Array<[PerfPlatform, typeof PLATFORM_CONFIG[PerfPlatform]]>

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-surface shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-surface z-10">
          <h2 className="text-sm font-semibold text-foreground">Log Post Performance</h2>
          <button onClick={onClose} className="text-zinc-600 hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Title + URL */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-muted mb-1">Post title / description *</label>
              <input
                autoFocus
                className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                placeholder="e.g. POV: The main character energy is off the charts 🔥"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Post URL</label>
              <input
                className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                placeholder="https://..."
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
              />
            </div>
          </div>

          {/* Platform */}
          <div>
            <label className="block text-xs text-muted mb-1.5">Platform</label>
            <div className="flex flex-wrap gap-1.5">
              {platforms.map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setPlatform(key)}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs transition-all',
                    platform === key
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border text-zinc-600 hover:border-zinc-600',
                  )}
                >
                  <span>{cfg.icon}</span>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Post type */}
          <div>
            <label className="block text-xs text-muted mb-1.5">Format</label>
            <div className="flex flex-wrap gap-1.5">
              {(Object.entries(POST_TYPE_CONFIG) as Array<[PerfPostType, typeof POST_TYPE_CONFIG[PerfPostType]]>).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setPostType(key)}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs transition-all',
                    postType === key
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border text-zinc-600 hover:border-zinc-600',
                  )}
                >
                  <span>{cfg.icon}</span>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Topic + Category + Posted at */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1">Topic</label>
              <input
                className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                placeholder="e.g. meme, outrage"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Category</label>
              <input
                className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                placeholder="e.g. entertainment"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Posted at</label>
              <input
                type="datetime-local"
                className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                value={postedAt}
                onChange={(e) => setPostedAt(e.target.value)}
              />
            </div>
          </div>

          {/* Hook */}
          <div className="space-y-2">
            <label className="block text-xs text-muted">Hook structure</label>
            <div className="flex flex-wrap gap-1.5">
              {(Object.entries(HOOK_TYPE_CONFIG) as Array<[PerfHookType, typeof HOOK_TYPE_CONFIG[PerfHookType]]>).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setHookType(key)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg border text-xs transition-all',
                    hookType === key
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border text-zinc-600 hover:border-zinc-600',
                  )}
                  title={cfg.description}
                >
                  {cfg.icon} {cfg.label}
                </button>
              ))}
            </div>
            {hookType !== 'none' && (
              <input
                className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                placeholder="Opening line / hook text…"
                value={hookText}
                onChange={(e) => setHookText(e.target.value)}
              />
            )}
          </div>

          {/* Caption style */}
          <div>
            <label className="block text-xs text-muted mb-1.5">Caption style</label>
            <div className="flex flex-wrap gap-1.5">
              {(Object.entries(CAPTION_STYLE_CONFIG) as Array<[PerfCaptionStyle, typeof CAPTION_STYLE_CONFIG[PerfCaptionStyle]]>).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setCaptionStyle(key)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg border text-xs transition-all',
                    captionStyle === key
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border text-zinc-600 hover:border-zinc-600',
                  )}
                  title={cfg.description}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Metrics */}
          <div>
            <label className="block text-xs font-semibold text-muted mb-2">Metrics (enter what you have)</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {[
                { label: 'Views',           value: views,          set: setViews },
                { label: 'Likes',           value: likes,          set: setLikes },
                { label: 'Shares',          value: shares,         set: setShares },
                { label: 'Saves',           value: saves,          set: setSaves },
                { label: 'Comments',        value: comments,       set: setComments },
                { label: 'Follower Gain',   value: followerGain,   set: setFollowerGain },
                { label: 'Eng. Rate %',     value: engagementRate, set: setEngagementRate },
              ].map(({ label, value, set }) => (
                <div key={label}>
                  <label className="block text-[10px] text-muted mb-0.5">{label}</label>
                  <input
                    type="number"
                    min="0"
                    step={label.includes('%') ? '0.01' : '1'}
                    className="w-full bg-surface-raised border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
                    placeholder="—"
                    value={value}
                    onChange={(e) => set(e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-muted mb-1">Notes</label>
            <textarea
              rows={2}
              className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent resize-none"
              placeholder="Anything notable about this post…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end px-5 py-4 border-t border-border sticky bottom-0 bg-surface">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary" size="sm"
            disabled={!title.trim() || isPending}
            onClick={submit}
          >
            {isPending ? 'Logging…' : 'Log result'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function numOrNull(s: string): number | null {
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}
