import { Badge } from '@/components/ui/Badge'
import { STATUS_CONFIG } from '@/lib/canva/canva.types'
import type { ExportStatus } from '@/lib/canva/canva.types'

interface CanvaStatusBadgeProps {
  status: ExportStatus
  size?:  'sm' | 'md'
}

export function CanvaStatusBadge({ status, size = 'md' }: CanvaStatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  return (
    <Badge variant={config.variant} size={size} dot={config.dot}>
      {config.label}
    </Badge>
  )
}
