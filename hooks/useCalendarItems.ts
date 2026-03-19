'use client'

import { useMemo } from 'react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, format, isValid,
} from 'date-fns'
import { usePipelineItems, useMovePipelineItem, useUpdatePipelineItem } from '@/hooks/usePipelineItems'
import type { PipelineItem, PipelineStatus } from '@/lib/pipeline/pipeline.types'

export interface CalendarFilters {
  status?:   PipelineStatus | ''
  format?:   string
  platform?: string
}

export function useCalendarItems(orgId: string, filters: CalendarFilters = {}) {
  const query = usePipelineItems(orgId)
  const { mutate: updateItem } = useUpdatePipelineItem()

  const allItems = query.data ?? []

  // Apply filters
  const filtered = useMemo(() => {
    let list = allItems
    if (filters.status)   list = list.filter((i) => i.status === filters.status)
    if (filters.format)   list = list.filter((i) => i.format === filters.format)
    if (filters.platform) list = list.filter((i) => i.platform === filters.platform)
    return list
  }, [allItems, filters.status, filters.format, filters.platform])

  // Items with a publish_at date
  const scheduled = useMemo(
    () => filtered.filter((i) => !!i.publish_at && isValid(new Date(i.publish_at))),
    [filtered],
  )

  // Items without a publish_at (show in sidebar)
  const unscheduled = useMemo(
    () => filtered.filter((i) => !i.publish_at || !isValid(new Date(i.publish_at))),
    [filtered],
  )

  // Group scheduled items by YYYY-MM-DD
  const byDay = useMemo(() => {
    const map: Record<string, PipelineItem[]> = {}
    for (const item of scheduled) {
      const key = format(new Date(item.publish_at!), 'yyyy-MM-dd')
      if (!map[key]) map[key] = []
      map[key].push(item)
    }
    // Sort each day by time
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) =>
        new Date(a.publish_at!).getTime() - new Date(b.publish_at!).getTime()
      )
    }
    return map
  }, [scheduled])

  function getItemsForDay(day: Date): PipelineItem[] {
    return byDay[format(day, 'yyyy-MM-dd')] ?? []
  }

  // Schedule an item to a day (preserves time if item already has one, else sets noon)
  function scheduleToDay(itemId: string, day: Date) {
    const item = allItems.find((i) => i.id === itemId)
    if (!item) return

    let newDate: Date
    if (item.publish_at && isValid(new Date(item.publish_at))) {
      const existing = new Date(item.publish_at)
      newDate = new Date(day)
      newDate.setHours(existing.getHours(), existing.getMinutes(), 0, 0)
    } else {
      newDate = new Date(day)
      newDate.setHours(12, 0, 0, 0)
    }
    updateItem({ id: itemId, updates: { publish_at: newDate.toISOString() } })
  }

  // Remove from calendar (clear publish_at)
  function unschedule(itemId: string) {
    updateItem({ id: itemId, updates: { publish_at: null } })
  }

  // Days in month view (including leading/trailing days)
  function getMonthDays(date: Date): Date[] {
    return eachDayOfInterval({
      start: startOfWeek(startOfMonth(date)),
      end:   endOfWeek(endOfMonth(date)),
    })
  }

  // Days in week view
  function getWeekDays(date: Date): Date[] {
    return eachDayOfInterval({
      start: startOfWeek(date),
      end:   endOfWeek(date),
    })
  }

  return {
    ...query,
    filtered,
    scheduled,
    unscheduled,
    byDay,
    getItemsForDay,
    scheduleToDay,
    unschedule,
    getMonthDays,
    getWeekDays,
  }
}
