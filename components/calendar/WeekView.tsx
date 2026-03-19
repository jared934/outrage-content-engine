'use client'

import { Droppable } from '@hello-pangea/dnd'
import { format, isToday, isSameDay } from 'date-fns'
import { cn } from '@/lib/utils/cn'
import { CalendarItemChip } from './CalendarItemChip'
import type { PipelineItem } from '@/lib/pipeline/pipeline.types'

interface WeekViewProps {
  days:        Date[]
  getItems:    (day: Date) => PipelineItem[]
  onItemClick: (item: PipelineItem) => void
}

export function WeekView({ days, getItems, onItemClick }: WeekViewProps) {
  const today = new Date()

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Day headers */}
      <div className="grid border-b border-border shrink-0" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
        {days.map((day) => {
          const todayCell = isToday(day)
          const items     = getItems(day)
          return (
            <div
              key={day.toISOString()}
              className="p-2 border-r border-border last:border-r-0 text-center"
            >
              <p className={cn(
                'text-xs uppercase tracking-wide font-medium',
                todayCell ? 'text-accent' : 'text-zinc-600',
              )}>
                {format(day, 'EEE')}
              </p>
              <div className={cn(
                'text-xl font-bold mt-0.5 mx-auto h-9 w-9 flex items-center justify-center rounded-full',
                todayCell ? 'bg-accent text-white' : 'text-foreground',
              )}>
                {format(day, 'd')}
              </div>
              {items.length > 0 && (
                <div className={cn(
                  'h-1.5 w-1.5 rounded-full mx-auto mt-1',
                  todayCell ? 'bg-accent' : 'bg-zinc-600',
                )} />
              )}
            </div>
          )
        })}
      </div>

      {/* Day columns */}
      <div
        className="grid flex-1 overflow-y-auto"
        style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
      >
        {days.map((day) => {
          const key     = format(day, 'yyyy-MM-dd')
          const items   = getItems(day)
          const todayCell = isToday(day)

          return (
            <Droppable droppableId={key} key={key}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    'min-h-[200px] p-2 space-y-1.5 border-r border-border last:border-r-0 overflow-y-auto transition-colors',
                    todayCell && 'bg-accent/[0.03]',
                    snapshot.isDraggingOver && 'bg-accent/8 ring-1 ring-inset ring-accent/30',
                  )}
                >
                  {items.length === 0 && !snapshot.isDraggingOver && (
                    <div className="h-12 flex items-center justify-center">
                      <span className="text-[10px] text-zinc-800">—</span>
                    </div>
                  )}
                  {items.map((item, idx) => (
                    <CalendarItemChip
                      key={item.id}
                      item={item}
                      index={idx}
                      onClick={onItemClick}
                      compact={false}
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          )
        })}
      </div>
    </div>
  )
}
