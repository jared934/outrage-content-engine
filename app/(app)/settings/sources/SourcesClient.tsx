'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Database, Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { getSources, toggleSource, deleteSource, createSource } from '@/lib/services/sources.service'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { timeAgo } from '@/lib/utils/format'
import { toast } from 'sonner'
import type { SourceType } from '@/types'

const SOURCE_TYPE_OPTIONS = [
  { value: 'rss', label: 'RSS Feed' },
  { value: 'reddit', label: 'Reddit' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'google_trends', label: 'Google Trends' },
  { value: 'competitor', label: 'Competitor URL' },
  { value: 'manual', label: 'Manual' },
]

const TYPE_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning'> = {
  rss: 'default',
  reddit: 'warning',
  youtube: 'danger' as 'default',
  google_trends: 'info',
  competitor: 'success',
}

export function SourcesClient() {
  const qc = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [newSource, setNewSource] = useState({ name: '', type: 'rss' as SourceType, url: '' })

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ['sources'],
    queryFn: () => getSources(),
  })

  const { mutate: toggle } = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'paused' }) =>
      toggleSource(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sources'] }),
  })

  const { mutate: remove } = useMutation({
    mutationFn: deleteSource,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sources'] })
      toast.success('Source removed')
    },
  })

  const { mutate: addSource, isPending: adding } = useMutation({
    mutationFn: () => createSource(newSource),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sources'] })
      setAddOpen(false)
      setNewSource({ name: '', type: 'rss', url: '' })
      toast.success('Source added')
    },
    onError: (err) => toast.error((err as Error).message),
  })

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-muted" />
          <h1 className="font-display font-bold text-xl text-foreground">Sources</h1>
          <span className="text-sm text-muted">({sources.length})</span>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => setAddOpen(true)}
        >
          Add Source
        </Button>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden divide-y divide-border">
        {isLoading ? (
          <div className="p-4 text-sm text-muted">Loading sources...</div>
        ) : sources.length === 0 ? (
          <EmptyState
            icon={<Database className="h-10 w-10" />}
            title="No sources yet"
            description="Add RSS feeds, Reddit subreddits, or YouTube channels to start ingesting content."
          />
        ) : (
          sources.map((source) => (
            <div key={source.id} className="flex items-center gap-4 p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">
                    {source.name}
                  </span>
                  <Badge
                    variant={TYPE_VARIANT[source.type] ?? 'default'}
                    size="sm"
                  >
                    {source.type}
                  </Badge>
                  {source.error_count > 0 && (
                    <Badge variant="danger" size="sm" dot>
                      {source.error_count} errors
                    </Badge>
                  )}
                </div>
                {source.url && (
                  <p className="text-xs text-zinc-600 truncate mt-0.5">{source.url}</p>
                )}
                <p className="text-[10px] text-zinc-700 mt-1">
                  Last fetched: {source.last_fetched_at ? timeAgo(source.last_fetched_at) : 'Never'}
                  {' · '}Every {source.fetch_interval_minutes}min
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {source.status === 'active' ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 text-zinc-600" />
                )}
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => toggle({ id: source.id, status: source.status === 'active' ? 'paused' : 'active' })}
                >
                  {source.status === 'active' ? 'Disable' : 'Enable'}
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  icon={<Trash2 className="h-3 w-3 text-red-500" />}
                  onClick={() => remove(source.id)}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Source Modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Source"
        description="Add a new content source to monitor"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            placeholder="TMZ RSS"
            value={newSource.name}
            onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
            fullWidth
          />
          <Select
            label="Type"
            options={SOURCE_TYPE_OPTIONS}
            value={newSource.type}
            onChange={(e) => setNewSource({ ...newSource, type: e.target.value as SourceType })}
            fullWidth
          />
          <Input
            label="URL"
            placeholder="https://..."
            value={newSource.url}
            onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
            fullWidth
          />
        </div>
        <ModalFooter>
          <Button variant="ghost" size="sm" onClick={() => setAddOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={adding}
            onClick={() => addSource()}
            disabled={!newSource.name || !newSource.url}
          >
            Add Source
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
