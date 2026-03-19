'use client'

import { useState } from 'react'
import { Droppable } from '@hello-pangea/dnd'
import { format, isSameMonth, isToday } from 'date-fns'
import { cn } from '@/lib/utils/cn'
import { CalendarItemChip } from './CalendarItemChip'
import { STATUS_CONFIG, FORMAT_ICONS } from '@/lib/pipeline/pipeline.types'
import type { PipelineItem } from '@/lib/pipeline/pipeline.types'

const WEEKDAYS_FULL  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const WEEKDAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

interface MonthViewProps {
  days:          Date[]
  currentDate:   Date
  getItems:      (day: Date) => PipelineItem[]
  onItemClick:   (item: PipelineItem) => void
  onDayClick?:   (day: Date) => void
}

interface DayCellOverflow {
  dayKey: string
  items: PipelineItem[]
}

export function MonthView({ days, currentDate, getItems, onItemClick, onDayClick }: MonthViewProps) {
  const [overflow, setOverflow] = useState<DayCellOverflow | null>(null)
  const MAX_VISIBLE = 3

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border shrink-0">
        {WEEKDAYS_FULL.map((day, i) => (
          <div key={day} className="py-2 text-center border-r border-border last:border-r-0">
            <span className="hidden md:block text-xs font-semibold text-zinc-600 uppercase tracking-wider">
              {day.slice(0, 3)}
            </span>
            <span className="md:hidden text-xs font-semibold text-zinc-600 uppercase tracking-wider">
              {WEEKDAYS_SHORT[i]}
            </span>
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 flex-1 overflow-y-auto" style={{ gridAutoRows: 'minmax(90px, 1fr)' }}>
        {days.map((day) => {
          const key          = format(day, 'yyyy-MM-dd')
          const inMonth      = isSameMonth(day, currentDate)
          const todayCell    = isToday(day)
          const items        = getItems(day)
          const visible      = items.slice(0, MAX_VISIBLE)
          const hiddenCount  = items.length - MAX_VISIBLE

          return (
            <Droppable droppableId={key} key={key}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  onClick={() => onDayClick?.(day)}
                  className={cn(
                    'relative p-1 border-b border-r border-border last:border-r-0 transition-colors',
                    !inMonth && 'opacity-30 bg-zinc-950/30',
                    snapshot.isDraggingOver && 'bg-accent/5 ring-1 ring-inset ring-accent/30',
                    inMonth && !todayCell && 'hover:bg-surface-raised/50',
                  )}
                >
                  {/* Day number */}
                  <div
                    className={cn(
                      'h-6 w-6 flex items-center justify-center rounded-full text-xs font-semibold mb-1 mx-auto md:mx-0',
                      todayCell
                        ? 'bg-accent text-white'
                        : 'text-muted hover:text-foreground',
                    )}
                  >
                    {format(day, 'd')}
                  </div>

                  {/* Items */}
                  <div className="space-y-0.5" onClick={(e) => e.stopPropagation()}>
                    {visible.map((item, idx) => (
                      <CalendarItemChip
                        key={item.id}
                        item={item}
                        index={idx}
                        onClick={onItemClick}
                        compact
                      />
                    ))}
                    {hiddenCount > 0 && (
                      <button
                        className="text-[10px] text-zinc-600 hover:text-muted pl-1 w-full text-left"
                        onClick={(e) => {
                          e.stopPropagation()
                          setOverflow({ dayKey: key, items })
                        }}
                      >
                        +{hiddenCount} more
                      </button>
                    )}
                  </div>

                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          )
        })}
      </div>

      {/* Overflow popover */}
      {overflow && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOverflow(null)}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-72 bg-surface border border-border rounded-xl shadow-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-foreground">
                {format(new Date(overflow.dayKey), 'EEEE, MMM d')}
              </span>
              <button
                onClick={() => setOverflow(null)}
                className="text-zinc-600 hover:text-foreground text-xs"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {overflow.items.map((item) => {
                const cfg = STATUS_CONFIG[item.status]
                return (
                  <button
                    key={item.id}
                    onClick={() => { onItemClick(item); setOverflow(null) }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-raised hover:bg-zinc-700/30 transition-colors text-left"
                  >
                    <span className="text-sm">{FORMAT_ICONS[item.format ?? ''] ?? '📄'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                      {item.publish_at && (
                        <p className="text-[10px] text-muted">
                          {format(new Date(item.publish_at), 'h:mm a')}
                        </p>
                      )}
                    </div>
                    <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full', cfg.bgClass, cfg.textClass)}>
                      {cfg.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
