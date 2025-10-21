'use client'

import { useGlobalKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts'
import { KeyboardShortcutsHelp } from '@/components/common/keyboard-shortcuts-help'

interface KeyboardShortcutsProviderProps {
  children: React.ReactNode
}

export function KeyboardShortcutsProvider({ children }: KeyboardShortcutsProviderProps) {
  const shortcuts = useGlobalKeyboardShortcuts()

  return (
    <>
      {children}
      <KeyboardShortcutsHelp shortcuts={shortcuts} />
    </>
  )
}