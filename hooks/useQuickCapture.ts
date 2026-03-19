'use client'

import { create } from 'zustand'
import { useEffect } from 'react'

interface QuickCaptureStore {
  isOpen: boolean
  open:   () => void
  close:  () => void
}

export const useQuickCaptureStore = create<QuickCaptureStore>((set) => ({
  isOpen: false,
  open:   () => set({ isOpen: true }),
  close:  () => set({ isOpen: false }),
}))

/** Mount once in the layout to register ⌘Shift+I globally */
export function useQuickCaptureShortcut() {
  const { isOpen, open, close } = useQuickCaptureStore()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'I') {
        e.preventDefault()
        isOpen ? close() : open()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, open, close])
}
