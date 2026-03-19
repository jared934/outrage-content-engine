'use client'

import { useQuickCaptureStore, useQuickCaptureShortcut } from '@/hooks/useQuickCapture'
import { QuickCaptureModal } from './QuickCaptureModal'

export function QuickCaptureProvider() {
  const { isOpen, close } = useQuickCaptureStore()
  useQuickCaptureShortcut()
  return <QuickCaptureModal isOpen={isOpen} onClose={close} />
}
