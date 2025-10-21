'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Kbd } from '@/components/ui/kbd'
import { KeyboardShortcut } from '@/lib/hooks/use-keyboard-shortcuts'

interface KeyboardShortcutsHelpProps {
  shortcuts: KeyboardShortcut[]
}

export function KeyboardShortcutsHelp({ shortcuts }: KeyboardShortcutsHelpProps) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleOpenShortcutsHelp = () => setIsOpen(true)
    const handleCloseModals = () => setIsOpen(false)

    document.addEventListener('open-shortcuts-help', handleOpenShortcutsHelp)
    document.addEventListener('close-modals', handleCloseModals)

    return () => {
      document.removeEventListener('open-shortcuts-help', handleOpenShortcutsHelp)
      document.removeEventListener('close-modals', handleCloseModals)
    }
  }, [])

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category || 'General'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(shortcut)
    return acc
  }, {} as Record<string, KeyboardShortcut[]>)

  const formatShortcut = (shortcut: KeyboardShortcut) => {
    const keys = []
    
    if (shortcut.ctrlKey) keys.push('Ctrl')
    if (shortcut.metaKey) keys.push('Cmd')
    if (shortcut.altKey) keys.push('Alt')
    if (shortcut.shiftKey) keys.push('Shift')
    
    // Format special keys
    let mainKey = shortcut.key
    if (mainKey === ' ') mainKey = 'Space'
    if (mainKey === 'ArrowUp') mainKey = '↑'
    if (mainKey === 'ArrowDown') mainKey = '↓'
    if (mainKey === 'ArrowLeft') mainKey = '←'
    if (mainKey === 'ArrowRight') mainKey = '→'
    if (mainKey === 'Escape') mainKey = 'Esc'
    
    keys.push(mainKey)
    
    return keys
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Keyboard Shortcuts
            <Badge variant="outline" className="text-xs">
              Press <Kbd>?</Kbd> to toggle
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category}>
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50">
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {formatShortcut(shortcut).map((key, keyIndex) => (
                        <div key={keyIndex} className="flex items-center">
                          <Kbd>{key}</Kbd>
                          {keyIndex < formatShortcut(shortcut).length - 1 && (
                            <span className="mx-1 text-muted-foreground">+</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 pt-4 border-t text-xs text-muted-foreground">
          <p>
            Keyboard shortcuts work when you're not typing in an input field. 
            Press <Kbd>Esc</Kbd> to close dialogs and clear focus.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}