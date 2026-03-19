'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type {
  PerformancePost, PerformanceAnalytics, PerformanceWeights,
  CreatePerformancePostInput,
} from '@/lib/performance/performance.types'

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const perfKeys = {
  all:       ['performance'] as const,
  posts:     (orgId: string, days: number) => [...perfKeys.all, 'posts', orgId, days] as const,
  analytics: (orgId: string, days: number) => [...perfKeys.all, 'analytics', orgId, days] as const,
  weights:   (orgId: string)               => [...perfKeys.all, 'weights', orgId]      as const,
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchPosts(orgId: string, days: number): Promise<PerformancePost[]> {
  const res = await fetch(`/api/performance/posts?org_id=${orgId}&days=${days}&limit=300`)
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()).posts
}

async function createPost(orgId: string, input: CreatePerformancePostInput): Promise<PerformancePost> {
  const res = await fetch(`/api/performance/posts?org_id=${orgId}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(input),
  })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()).post
}

async function updatePost(id: string, updates: Partial<PerformancePost>): Promise<PerformancePost> {
  const res = await fetch(`/api/performance/posts/${id}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(updates),
  })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()).post
}

async function deletePost(id: string): Promise<void> {
  const res = await fetch(`/api/performance/posts/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await res.text())
}

async function fetchAnalytics(orgId: string, days: number): Promise<PerformanceAnalytics> {
  const res = await fetch(`/api/performance/analytics?org_id=${orgId}&days=${days}`)
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()).analytics
}

async function fetchWeights(orgId: string): Promise<PerformanceWeights | null> {
  const res = await fetch(`/api/performance/weights?org_id=${orgId}`)
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()).weights
}

async function recalcWeights(orgId: string): Promise<{ weights: PerformanceWeights; posts_analysed: number }> {
  const res = await fetch(`/api/performance/weights?org_id=${orgId}`, { method: 'PUT' })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function usePerformancePosts(orgId: string, days = 90) {
  return useQuery({
    queryKey: perfKeys.posts(orgId, days),
    queryFn:  () => fetchPosts(orgId, days),
    enabled:  !!orgId,
    staleTime: 120_000,
  })
}

export function useCreatePerformancePost(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePerformancePostInput) => createPost(orgId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: perfKeys.all })
      toast.success('Post result logged')
    },
    onError: (err) => toast.error((err as Error).message),
  })
}

export function useUpdatePerformancePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<PerformancePost> }) =>
      updatePost(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: perfKeys.all }),
    onError: (err) => toast.error((err as Error).message),
  })
}

export function useDeletePerformancePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deletePost,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: perfKeys.all })
      toast.success('Post removed')
    },
    onError: (err) => toast.error((err as Error).message),
  })
}

export function usePerformanceAnalytics(orgId: string, days = 90) {
  return useQuery({
    queryKey: perfKeys.analytics(orgId, days),
    queryFn:  () => fetchAnalytics(orgId, days),
    enabled:  !!orgId,
    staleTime: 300_000,
  })
}

export function usePerformanceWeights(orgId: string) {
  return useQuery({
    queryKey: perfKeys.weights(orgId),
    queryFn:  () => fetchWeights(orgId),
    enabled:  !!orgId,
    staleTime: 600_000,
  })
}

export function useRecalcWeights(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => recalcWeights(orgId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: perfKeys.weights(orgId) })
      toast.success(`Weights updated from ${data.posts_analysed} posts`)
    },
    onError: (err) => toast.error((err as Error).message),
  })
}
