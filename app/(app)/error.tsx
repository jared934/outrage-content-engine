'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[AppError]', error)
  }, [error])

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="text-center space-y-4 max-w-sm">
        <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto" />
        <div>
          <p className="text-base font-semibold text-foreground">Something went wrong</p>
          <p className="text-sm text-muted mt-1">{error.message || 'An unexpected error occurred.'}</p>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-all mx-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Try again
        </button>
      </div>
    </div>
  )
}
