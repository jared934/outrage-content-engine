import * as React from 'react'
import { cn } from '@/lib/utils/cn'

type BadgeVariant =
  | 'default'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'muted'
  | 'outline'

type BadgeSize = 'sm' | 'md'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
}

const variantClasses: Record<BadgeVariant, string> = {
  default:  'bg-zinc-800 text-zinc-300 border-zinc-700',
  accent:   'bg-accent/15 text-red-400 border-accent/30',
  success:  'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  warning:  'bg-amber-500/15 text-amber-400 border-amber-500/30',
  danger:   'bg-red-500/15 text-red-400 border-red-500/30',
  info:     'bg-blue-500/15 text-blue-400 border-blue-500/30',
  muted:    'bg-transparent text-zinc-500 border-zinc-700',
  outline:  'bg-transparent text-foreground border-border',
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'text-[10px] px-1.5 py-0.5 gap-1',
  md: 'text-xs px-2 py-0.5 gap-1.5',
}

export function Badge({ variant = 'default', size = 'md', dot, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium whitespace-nowrap',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'inline-block h-1.5 w-1.5 rounded-full shrink-0',
            variant === 'success' && 'bg-emerald-400',
            variant === 'warning' && 'bg-amber-400',
            variant === 'danger' && 'bg-red-400',
            variant === 'accent' && 'bg-red-400',
            variant === 'info' && 'bg-blue-400',
            (variant === 'default' || variant === 'muted' || variant === 'outline') && 'bg-zinc-500'
          )}
        />
      )}
      {children}
    </span>
  )
}
