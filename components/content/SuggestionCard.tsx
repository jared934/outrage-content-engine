'use client'

import { Copy, Bookmark, BookmarkCheck, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { platformLabel } from '@/lib/utils/format'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { saveSuggestion, markSuggestionUsed } from '@/lib/services/content.service'
import { toast } from 'sonner'
import type { ContentSuggestion } from '@/types'
import { cn } from '@/lib/utils/cn'

const TYPE_LABELS: Record<string, string> = {
  headline: 'Headline',
  meme_idea: 'Meme Idea',
  caption: 'Caption',
  hook: 'Hook',
  reel_idea: 'Reel Idea',
  poll: 'Poll',
  tweet: 'Tweet',
  post_copy: 'Post Copy',
}

const ANGLE_COLORS: Record<string, string> = {
  outrage:       'text-red-400',
  humor:         'text-amber-400',
  informational: 'text-blue-400',
  reaction:      'text-purple-400',
  hot_take:      'text-orange-400',
}

interface SuggestionCardProps {
  suggestion: ContentSuggestion
  onAddToPipeline?: (suggestion: ContentSuggestion) => void
}

export function SuggestionCard({ suggestion, onAddToPipeline }: SuggestionCardProps) {
  const qc = useQueryClient()

  const { mutate: toggleSave, isPending: saving } = useMutation({
    mutationFn: () => saveSuggestion(suggestion.id, !suggestion.is_saved),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content', 'suggestions'] })
      toast.success(suggestion.is_saved ? 'Unsaved' : 'Saved')
    },
  })

  async function copyToClipboard() {
    await navigator.clipboard.writeText(suggestion.content)
    toast.success('Copied to clipboard')
  }

  return (
    <div className={cn(
      'bg-surface border border-border rounded-lg p-3 space-y-2.5 hover:border-zinc-600 transition-colors',
      suggestion.is_used && 'opacity-60'
    )}>
      {/* Type + platform */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="default" size="sm">
            {TYPE_LABELS[suggestion.type] ?? suggestion.type}
          </Badge>
          {suggestion.platform && suggestion.platform !== 'all' && (
            <Badge variant="info" size="sm">{platformLabel(suggestion.platform)}</Badge>
          )}
          {suggestion.angle && (
            <span className={cn('text-[10px] font-medium', ANGLE_COLORS[suggestion.angle] ?? 'text-zinc-500')}>
              {suggestion.angle}
            </span>
          )}
        </div>
        {suggestion.is_used && (
          <span className="text-[10px] text-zinc-600">used</span>
        )}
      </div>

      {/* Content */}
      <p className="text-sm text-foreground leading-snug">{suggestion.content}</p>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="xs"
          icon={<Copy className="h-3 w-3" />}
          onClick={copyToClipboard}
          title="Copy"
        />
        <Button
          variant="ghost"
          size="xs"
          icon={suggestion.is_saved
            ? <BookmarkCheck className="h-3 w-3 text-accent" />
            : <Bookmark className="h-3 w-3" />}
          onClick={() => toggleSave()}
          loading={saving}
          title={suggestion.is_saved ? 'Unsave' : 'Save'}
        />
        {onAddToPipeline && (
          <Button
            variant="ghost"
            size="xs"
            icon={<ArrowRight className="h-3 w-3" />}
            onClick={() => onAddToPipeline(suggestion)}
            title="Add to Pipeline"
          >
            Pipeline
          </Button>
        )}
      </div>
    </div>
  )
}
