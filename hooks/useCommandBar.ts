'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/stores/ui.store'

export function useCommandBar() {
  const { commandBarOpen, setCommandBarOpen } = useUIStore()
  const router = useRouter()

  const open  = useCallback(() => setCommandBarOpen(true),  [setCommandBarOpen])
  const close = useCallback(() => setCommandBarOpen(false), [setCommandBarOpen])

  const navigate = useCallback(
    (href: string) => {
      router.push(href)
      close()
    },
    [router, close],
  )

  return { isOpen: commandBarOpen, open, close, navigate }
}
