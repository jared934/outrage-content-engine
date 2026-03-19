import Link from 'next/link'
import { cn } from '@/lib/utils/cn'
import { Button, type ButtonProps } from './Button'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: ButtonProps & { label: string; href?: string }
  className?: string
  compact?: boolean
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 gap-2' : 'py-16 gap-3',
        className
      )}
    >
      {icon && (
        <div className={cn('text-zinc-600', compact ? 'mb-1' : 'mb-2')}>
          {icon}
        </div>
      )}
      <h3 className={cn('font-medium text-foreground', compact ? 'text-sm' : 'text-base')}>
        {title}
      </h3>
      {description && (
        <p className={cn('text-muted max-w-sm', compact ? 'text-xs' : 'text-sm')}>
          {description}
        </p>
      )}
      {action && (
        action.href ? (
          <Link href={action.href}>
            <Button
              variant={action.variant ?? 'primary'}
              size={action.size ?? 'sm'}
              className={cn('mt-2', action.className)}
            >
              {action.label}
            </Button>
          </Link>
        ) : (
          <Button
            {...action}
            variant={action.variant ?? 'primary'}
            size={action.size ?? 'sm'}
            className={cn('mt-2', action.className)}
          >
            {action.label}
          </Button>
        )
      )}
    </div>
  )
}
