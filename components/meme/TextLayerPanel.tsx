'use client'

import { Plus, Trash2, ChevronDown, ChevronUp, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { TextLayer, TextAlign, FontStyle } from '@/lib/meme/meme.types'
import { useState } from 'react'

interface TextLayerPanelProps {
  layers: TextLayer[]
  selectedId: string | null
  onSelect: (id: string) => void
  onUpdate: (id: string, updates: Partial<TextLayer>) => void
  onDelete: (id: string) => void
  onAdd:    () => void
}

const FONT_STYLES: { value: FontStyle; label: string }[] = [
  { value: 'impact', label: 'Impact' },
  { value: 'bold',   label: 'Bold' },
  { value: 'normal', label: 'Normal' },
]

const COLORS = [
  '#FFFFFF', '#000000', '#EF4444', '#F97316',
  '#EAB308', '#22C55E', '#3B82F6', '#A855F7',
]

export function TextLayerPanel({
  layers, selectedId, onSelect, onUpdate, onDelete, onAdd,
}: TextLayerPanelProps) {
  const selected = layers.find((l) => l.id === selectedId) ?? null

  return (
    <div className="space-y-3">
      {/* Layer list */}
      <div className="space-y-1">
        {layers.map((layer, i) => (
          <div
            key={layer.id}
            className={cn(
              'flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer transition-all',
              selectedId === layer.id
                ? 'border-accent/50 bg-accent/5'
                : 'border-border hover:border-zinc-600 bg-surface',
            )}
            onClick={() => onSelect(layer.id)}
          >
            <span className="text-[10px] text-zinc-600 w-4 flex-shrink-0">#{i + 1}</span>
            <p className="flex-1 text-xs text-muted truncate min-w-0">
              {layer.content || '(empty)'}
            </p>
            <span className="text-[9px] text-zinc-700 uppercase font-medium flex-shrink-0">
              {layer.type}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(layer.id) }}
              className="text-zinc-700 hover:text-red-400 transition-colors flex-shrink-0"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={onAdd}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-border text-xs text-zinc-600 hover:text-muted hover:border-zinc-600 transition-all"
      >
        <Plus className="h-3 w-3" />
        Add text layer
      </button>

      {/* Selected layer editor */}
      {selected && (
        <div className="border border-border rounded-lg p-3 space-y-3 bg-surface-raised">
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
            Edit Layer
          </p>

          {/* Content */}
          <textarea
            value={selected.content}
            onChange={(e) => onUpdate(selected.id, { content: e.target.value })}
            rows={2}
            className="w-full bg-surface border border-border rounded-md px-2.5 py-2 text-xs text-foreground placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-accent resize-none"
            placeholder="Enter text..."
          />

          {/* Font + size row */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-zinc-600 mb-1">Style</p>
              <select
                value={selected.fontStyle}
                onChange={(e) => onUpdate(selected.id, { fontStyle: e.target.value as FontStyle })}
                className="w-full bg-surface border border-border text-xs text-foreground rounded-md px-2 py-1.5 focus:outline-none"
              >
                {FONT_STYLES.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-[10px] text-zinc-600 mb-1">Size ({selected.fontSize}px)</p>
              <input
                type="range"
                min={12} max={80} step={2}
                value={selected.fontSize}
                onChange={(e) => onUpdate(selected.id, { fontSize: Number(e.target.value) })}
                className="w-full accent-accent"
              />
            </div>
          </div>

          {/* Alignment */}
          <div className="flex items-center gap-1.5">
            {(['left', 'center', 'right'] as TextAlign[]).map((align) => {
              const Icon = align === 'left' ? AlignLeft : align === 'center' ? AlignCenter : AlignRight
              return (
                <button
                  key={align}
                  onClick={() => onUpdate(selected.id, { align })}
                  className={cn(
                    'flex-1 flex items-center justify-center py-1.5 rounded-md border text-xs transition-all',
                    selected.align === align
                      ? 'border-accent/50 bg-accent/10 text-accent'
                      : 'border-border text-zinc-500 hover:text-muted',
                  )}
                >
                  <Icon className="h-3 w-3" />
                </button>
              )
            })}
          </div>

          {/* Color picker */}
          <div>
            <p className="text-[10px] text-zinc-600 mb-1.5">Color</p>
            <div className="flex items-center gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => onUpdate(selected.id, { color: c })}
                  style={{ backgroundColor: c }}
                  className={cn(
                    'h-5 w-5 rounded-full border-2 flex-shrink-0 transition-all',
                    selected.color === c ? 'border-accent scale-110' : 'border-transparent hover:border-zinc-500',
                  )}
                />
              ))}
              <input
                type="color"
                value={selected.color}
                onChange={(e) => onUpdate(selected.id, { color: e.target.value })}
                className="h-5 w-5 rounded-full cursor-pointer border-0 bg-transparent"
                title="Custom color"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-3">
            {([
              { key: 'stroke', label: 'Outline' },
              { key: 'bold', label: 'Bold' },
              { key: 'uppercase', label: 'CAPS' },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => onUpdate(selected.id, { [key]: !selected[key] })}
                className={cn(
                  'flex-1 text-[10px] font-medium py-1 rounded-md border transition-all',
                  selected[key]
                    ? 'bg-accent/10 border-accent/30 text-accent'
                    : 'bg-surface border-border text-zinc-500 hover:text-muted',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
