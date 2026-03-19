'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getPipelineStages,
  getContentPieces,
  createContentPiece,
  updateContentPiece,
  moveContentPiece,
  deleteContentPiece,
  type CreateContentPieceInput,
} from '@/lib/services/pipeline.service'
import type { ContentStatus, ContentPiece } from '@/types'
import { toast } from 'sonner'

export const pipelineKeys = {
  all: ['pipeline'] as const,
  stages: () => [...pipelineKeys.all, 'stages'] as const,
  pieces: (filters?: object) => [...pipelineKeys.all, 'pieces', filters ?? {}] as const,
}

export function usePipelineStages() {
  return useQuery({
    queryKey: pipelineKeys.stages(),
    queryFn: getPipelineStages,
    staleTime: Infinity,
  })
}

export function useContentPieces(filters: Parameters<typeof getContentPieces>[0] = {}) {
  return useQuery({
    queryKey: pipelineKeys.pieces(filters),
    queryFn: () => getContentPieces(filters),
    staleTime: 30_000,
  })
}

export function useCreateContentPiece() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateContentPieceInput) => createContentPiece(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pipelineKeys.all })
      toast.success('Content piece created')
    },
    onError: (err) => toast.error((err as Error).message),
  })
}

export function useMoveContentPiece() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, stage_config_id, status }: { id: string; stage_config_id: string; status: ContentStatus }) =>
      moveContentPiece(id, stage_config_id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: pipelineKeys.pieces() }),
  })
}

export function useUpdateContentPiece() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ContentPiece> }) =>
      updateContentPiece(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pipelineKeys.all })
      toast.success('Updated')
    },
    onError: (err) => toast.error((err as Error).message),
  })
}

export function useDeleteContentPiece() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteContentPiece,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pipelineKeys.all })
      toast.success('Deleted')
    },
    onError: (err) => toast.error((err as Error).message),
  })
}
