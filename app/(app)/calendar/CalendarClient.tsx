'use client'

import { useState, useCallback } from 'react'
import {
  format, addMonths, subMonths, addWeeks, subWeeks,
  startOfWeek, endOfWeek, startOfToday,
} from 'date-fns'
import {
  DragDropContext, type DropResult,
} from '@hello-pangea/dnd'
import {
  Calendar, ChevronLeft, ChevronRight,
  LayoutGrid, List, Columns, Filter,
  RefreshCw, AlertTriangle,
} from 'lucide-react'

import { Button }              from '@/components/ui/Button'
import { Skeleton }            from '@/components/ui/Skeleton'
import { cn }                  from '@/lib/utils/cn'

import { MonthView }           from '@/components/calendar/MonthView'
import { WeekView }            from '@/components/calendar/WeekView'
import { CalendarListView }    from '@/components/calendar/CalendarListView'
import { UnscheduledPanel }    from '@/components/calendar/UnscheduledPanel'
import { ScheduleModal }       from '@/components/calendar/ScheduleModal'

import { useCalendarItems }    from '@/hooks/useCalendarItems'
import {
  PIPELINE_STATUSES,
  STATUS_CONFIG,
  FORMAT_OPTIONS,
  PLATFORM_OPTIONS,
} from '@/lib/pipeline/pipeline.types'
import type { PipelineItem, PipelineStatus } from '@/lib/pipeline/pipeline.types'

type CalView = 'month' | 'week' | 'list'

interface CalendarClientProps {
  orgId: string
}

export function CalendarClient({ orgId }: CalendarClientProps) {
  const [view,           setView]           = useState<CalView>('month')
  const [cursor,         setCursor]         = useState<Date>(startOfToday())
  const [showFilters,    setShowFilters]    = useState(false)
  const [filterStatus,   setFilterStatus]   = useState<PipelineStatus | ''>('')
  const [filterFormat,   setFilterFormat]   = useState('')
  const [filterPlatform, setFilterPlatform] = useState('')
  const [selectedItem,   setSelectedItem]   = useState<PipelineItem | null>(null)
  const [showUnscheduled, setShowUnscheduled] = useState(true)

  const {
    isLoading,
    refetch,
    unscheduled,
    scheduled,
    getItemsForDay,
    getMonthDays,
    getWeekDays,
    scheduleToDay,
    unschedule,
  } = useCalendarItems(orgId, {
    status:   filterStatus   || undefined,
    format:   filterFormat   || undefined,
    platform: filterPlatform || undefined,
  })

  // Navigation
  function prev() {
    setCursor((d) => view === 'month' ? subMonths(d, 1) : subWeeks(d, 1))
  }
  function next() {
    setCursor((d) => view === 'month' ? addMonths(d, 1) : addWeeks(d, 1))
  }
  function goToday() {
    setCursor(startOfToday())
  }

  // Header date label
  const dateLabel = view === 'month'
    ? format(cursor, 'MMMM yyyy')
    : `${format(startOfWeek(cursor), 'MMM d')} – ${format(endOfWeek(cursor), 'MMM d, yyyy')}`

  // Days for current view
  const days = view === 'month' ? getMonthDays(cursor) : getWeekDays(cursor)

  // Drag/drop handler
  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return
    const { draggableId, destination } = result

    if (destination.droppableId === 'unscheduled') {
      unschedule(draggableId)
    } else {
      // destination.droppableId is 'yyyy-MM-dd'
      const [y, m, d] = destination.droppableId.split('-').map(Number)
      scheduleToDay(draggableId, new Date(y, m - 1, d))
    }
  }, [scheduleToDay, unschedule])

  // Urgent same-day items (due today, not yet posted)
  const urgentToday = scheduled.filter((i) => {
    if (!i.publish_at) return false
    const pub = new Date(i.publish_at)
    const now = new Date()
    return (
      pub.toDateString() === now.toDateString() &&
      i.status !== 'posted' &&
      (i.urgency ?? 0) >= 70
    )
  })

  const hasFilters = !!(filterStatus || filterFormat || filterPlatform)

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="h-full flex flex-col">

        {/* ---------------------------------------------------------------- */}
        {/* Urgent same-day banner                                           */}
        {/* ---------------------------------------------------------------- */}
        {urgentToday.length > 0 && (
          <div className="flex items-center gap-3 px-5 py-2 bg-amber-950/50 border-b border-amber-800/40 shrink-0">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span className="text-xs text-amber-400 font-medium">
              {urgentToday.length} urgent item{urgentToday.length > 1 ? 's' : ''} scheduled for today
            </span>
            <div className="flex gap-1.5 flex-wrap">
              {urgentToday.slice(0, 3).map((i) => (
                <button
                  key={i.id}
                  onClick={() => setSelectedItem(i)}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/60 text-amber-300 hover:bg-amber-800/60 transition-colors truncate max-w-[140px]"
                >
                  {i.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Toolbar                                                          */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border shrink-0 flex-wrap">
          <Calendar className="h-4 w-4 text-muted shrink-0" />
          <h1 className="font-display font-bold text-lg text-foreground">Content Calendar</h1>

          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={prev}
              className="p-1.5 rounded-lg text-zinc-600 hover:text-foreground hover:bg-surface-raised transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-foreground min-w-[160px] text-center">
              {dateLabel}
            </span>
            <button
              onClick={next}
              className="p-1.5 rounded-lg text-zinc-600 hover:text-foreground hover:bg-surface-raised transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <Button variant="secondary" size="sm" onClick={goToday}>Today</Button>

          <div className="flex-1" />

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors',
              hasFilters || showFilters
                ? 'bg-accent/10 border-accent/40 text-accent'
                : 'border-border text-zinc-500 hover:border-zinc-600 hover:text-foreground',
            )}
          >
            <Filter className="h-3 w-3" />
            {hasFilters ? 'Filtered' : 'Filter'}
          </button>

          {/* Unscheduled toggle */}
          <button
            onClick={() => setShowUnscheduled((v) => !v)}
            className={cn(
              'hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors',
              showUnscheduled
                ? 'border-zinc-700 text-zinc-400'
                : 'border-border text-zinc-600 hover:border-zinc-700',
            )}
          >
            Inbox {unscheduled.length > 0 && `(${unscheduled.length})`}
          </button>

          {/* View toggle */}
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            {([
              { v: 'month', icon: <LayoutGrid className="h-3.5 w-3.5" />, title: 'Month' },
              { v: 'week',  icon: <Columns className="h-3.5 w-3.5" />,    title: 'Week' },
              { v: 'list',  icon: <List className="h-3.5 w-3.5" />,       title: 'List' },
            ] as const).map(({ v, icon, title }, i) => (
              <button
                key={v}
                onClick={() => setView(v)}
                title={title}
                className={cn(
                  'px-2.5 py-1.5 transition-colors',
                  i > 0 && 'border-l border-border',
                  view === v ? 'bg-surface-raised text-foreground' : 'text-zinc-600 hover:text-foreground',
                )}
              >
                {icon}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={() => refetch()}
            className="text-zinc-600 hover:text-foreground transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Filter bar                                                       */}
        {/* ---------------------------------------------------------------- */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-2 px-5 py-2.5 border-b border-border bg-surface-raised shrink-0">
            <select
              className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-zinc-600"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as PipelineStatus | '')}
            >
              <option value="">All statuses</option>
              {PIPELINE_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
              ))}
            </select>

            <select
              className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-zinc-600"
              value={filterFormat}
              onChange={(e) => setFilterFormat(e.target.value)}
            >
              <option value="">All formats</option>
              {FORMAT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>{f.icon} {f.label}</option>
              ))}
            </select>

            <select
              className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-zinc-600"
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
            >
              <option value="">All platforms</option>
              {PLATFORM_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>

            {hasFilters && (
              <button
                onClick={() => { setFilterStatus(''); setFilterFormat(''); setFilterPlatform('') }}
                className="text-xs text-zinc-600 hover:text-foreground underline transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Main area: calendar + sidebar                                    */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex flex-1 overflow-hidden">

          {/* Calendar view */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {isLoading ? (
              <div className="flex gap-2 p-5 flex-wrap">
                {Array.from({ length: 35 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 flex-1 min-w-[60px] rounded-lg" />
                ))}
              </div>
            ) : view === 'month' ? (
              <MonthView
                days={days}
                currentDate={cursor}
                getItems={getItemsForDay}
                onItemClick={setSelectedItem}
              />
            ) : view === 'week' ? (
              <WeekView
                days={days}
                getItems={getItemsForDay}
                onItemClick={setSelectedItem}
              />
            ) : (
              <div className="flex-1 overflow-y-auto">
                <CalendarListView
                  scheduled={scheduled}
                  unscheduled={unscheduled}
                  onItemClick={setSelectedItem}
                />
              </div>
            )}
          </div>

          {/* Unscheduled sidebar — hidden in list view (it shows there inline) */}
          {view !== 'list' && showUnscheduled && (
            <UnscheduledPanel
              items={unscheduled}
              onItemClick={setSelectedItem}
            />
          )}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Mobile: unscheduled collapsed panel at bottom                   */}
        {/* ---------------------------------------------------------------- */}
        {view !== 'list' && (
          <div className="lg:hidden border-t border-border shrink-0">
            <UnscheduledPanel
              items={unscheduled}
              onItemClick={setSelectedItem}
              mobileCollapsed
            />
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Schedule modal                                                      */}
      {/* ------------------------------------------------------------------ */}
      {selectedItem && (
        <ScheduleModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </DragDropContext>
  )
}
