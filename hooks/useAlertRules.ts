'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { AlertRuleV2, CreateAlertRuleInput, UpdateAlertRuleInput, Digest } from '@/lib/alerts/alert.types'

// ─── Keys ────────────────────────────────────────────────────────────────────

export const alertRuleKeys = {
  all:     ['alert-rules'] as const,
  list:    (orgId: string) => [...alertRuleKeys.all, orgId] as const,
  digests: (orgId: string) => ['digests', orgId] as const,
}

// ─── Fetchers ────────────────────────────────────────────────────────────────

async function fetchRules(orgId: string): Promise<AlertRuleV2[]> {
  const res = await fetch(`/api/alerts/rules?org_id=${orgId}`)
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()).rules
}

async function createRule(orgId: string, input: Omit<CreateAlertRuleInput, 'org_id'>): Promise<AlertRuleV2> {
  const res = await fetch(`/api/alerts/rules?org_id=${orgId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()).rule
}

async function updateRule(id: string, updates: UpdateAlertRuleInput): Promise<AlertRuleV2> {
  const res = await fetch(`/api/alerts/rules/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()).rule
}

async function deleteRule(id: string): Promise<void> {
  const res = await fetch(`/api/alerts/rules/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await res.text())
}

async function fireAlerts(orgId: string): Promise<{ fired: number; evaluated: number }> {
  const res = await fetch('/api/alerts/fire', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ org_id: orgId }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function generateDigest(orgId: string, type: 'morning' | 'evening', deliver = false) {
  const res = await fetch(`/api/alerts/digest?org_id=${orgId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, deliver }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function fetchDigests(orgId: string): Promise<Digest[]> {
  const res = await fetch(`/api/alerts/digest?org_id=${orgId}`)
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()).digests
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useAlertRules(orgId: string) {
  return useQuery({
    queryKey: alertRuleKeys.list(orgId),
    queryFn:  () => fetchRules(orgId),
    enabled:  !!orgId,
    staleTime: 60_000,
  })
}

export function useCreateAlertRule(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<CreateAlertRuleInput, 'org_id'>) => createRule(orgId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: alertRuleKeys.all })
      toast.success('Alert rule created')
    },
    onError: (err) => toast.error((err as Error).message),
  })
}

export function useUpdateAlertRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateAlertRuleInput }) =>
      updateRule(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: alertRuleKeys.all }),
    onError: (err) => toast.error((err as Error).message),
  })
}

export function useDeleteAlertRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteRule,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: alertRuleKeys.all })
      toast.success('Rule deleted')
    },
    onError: (err) => toast.error((err as Error).message),
  })
}

export function useFireAlerts(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => fireAlerts(orgId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['alerts'] })
      toast.success(`Checked trends — ${data.fired} alert${data.fired !== 1 ? 's' : ''} fired`)
    },
    onError: (err) => toast.error((err as Error).message),
  })
}

export function useDigests(orgId: string) {
  return useQuery({
    queryKey: alertRuleKeys.digests(orgId),
    queryFn:  () => fetchDigests(orgId),
    enabled:  !!orgId,
    staleTime: 300_000,
  })
}

export function useGenerateDigest(orgId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ type, deliver }: { type: 'morning' | 'evening'; deliver?: boolean }) =>
      generateDigest(orgId, type, deliver),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: alertRuleKeys.digests(orgId) })
      qc.invalidateQueries({ queryKey: ['alerts'] })
      toast.success('Digest generated')
    },
    onError: (err) => toast.error((err as Error).message),
  })
}
