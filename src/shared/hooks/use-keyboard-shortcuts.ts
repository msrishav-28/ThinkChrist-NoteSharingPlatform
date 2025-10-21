'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
  metaKey?: boolean
  action: () => void
  description: string
  category?: string
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
}

export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    // Don't trigger shortcuts when user is typing in input fields
    const target = event.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true' ||
      target.closest('[contenteditable="true"]')
    ) {
      return
    }

    const matchingShortcut = shortcuts.find(shortcut => {
      return (
        shortcut.key.toLowerCase() === event.key.toLowerCase() &&
        !!shortcut.ctrlKey === event.ctrlKey &&
        !!shortcut.altKey === event.altKey &&
        !!shortcut.shiftKey === event.shiftKey &&
        !!shortcut.metaKey === event.metaKey
      )
    })

    if (matchingShortcut) {
      event.preventDefault()
      matchingShortcut.action()
    }
  }, [shortcuts, enabled])

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown, enabled])
}

// Common keyboard shortcuts for the application
export function useGlobalKeyboardShortcuts() {
  const router = useRouter()

  const shortcuts: KeyboardShortcut[] = [
    {
      key: '/',
      action: () => {
        const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
        } else {
          router.push('/search')
        }
      },
      description: 'Focus search',
      category: 'Navigation'
    },
    {
      key: 'h',
      action: () => router.push('/'),
      description: 'Go to home',
      category: 'Navigation'
    },
    {
      key: 'r',
      action: () => router.push('/resources'),
      description: 'Go to resources',
      category: 'Navigation'
    },
    {
      key: 'c',
      action: () => router.push('/collections'),
      description: 'Go to collections',
      category: 'Navigation'
    },
    {
      key: 'l',
      action: () => router.push('/leaderboard'),
      description: 'Go to leaderboard',
      category: 'Navigation'
    },
    {
      key: 'u',
      action: () => router.push('/upload'),
      description: 'Upload resource',
      category: 'Actions'
    },
    {
      key: 'n',
      ctrlKey: true,
      action: () => router.push('/collections/new'),
      description: 'New collection',
      category: 'Actions'
    },
    {
      key: 'k',
      ctrlKey: true,
      action: () => {
        // Open command palette or search
        const event = new CustomEvent('open-command-palette')
        document.dispatchEvent(event)
      },
      description: 'Open command palette',
      category: 'Interface'
    },
    {
      key: '?',
      shiftKey: true,
      action: () => {
        // Open keyboard shortcuts help
        const event = new CustomEvent('open-shortcuts-help')
        document.dispatchEvent(event)
      },
      description: 'Show keyboard shortcuts',
      category: 'Help'
    },
    {
      key: 'Escape',
      action: () => {
        // Close modals, clear focus, etc.
        const activeElement = document.activeElement as HTMLElement
        if (activeElement && activeElement.blur) {
          activeElement.blur()
        }
        
        // Close any open modals
        const event = new CustomEvent('close-modals')
        document.dispatchEvent(event)
      },
      description: 'Close modals/clear focus',
      category: 'Interface'
    }
  ]

  useKeyboardShortcuts({ shortcuts })

  return shortcuts
}

// Resource-specific shortcuts
export function useResourceKeyboardShortcuts(resourceId?: string) {
  const router = useRouter()

  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'd',
      action: () => {
        if (resourceId) {
          const event = new CustomEvent('download-resource', { detail: { resourceId } })
          document.dispatchEvent(event)
        }
      },
      description: 'Download resource',
      category: 'Resource Actions'
    },
    {
      key: 'v',
      action: () => {
        if (resourceId) {
          router.push(`/resources/${resourceId}`)
        }
      },
      description: 'View resource details',
      category: 'Resource Actions'
    },
    {
      key: 'ArrowUp',
      action: () => {
        const event = new CustomEvent('vote-resource', { detail: { type: 'upvote', resourceId } })
        document.dispatchEvent(event)
      },
      description: 'Upvote resource',
      category: 'Resource Actions'
    },
    {
      key: 'ArrowDown',
      action: () => {
        const event = new CustomEvent('vote-resource', { detail: { type: 'downvote', resourceId } })
        document.dispatchEvent(event)
      },
      description: 'Downvote resource',
      category: 'Resource Actions'
    },
    {
      key: 's',
      action: () => {
        const event = new CustomEvent('share-resource', { detail: { resourceId } })
        document.dispatchEvent(event)
      },
      description: 'Share resource',
      category: 'Resource Actions'
    }
  ]

  useKeyboardShortcuts({ shortcuts })

  return shortcuts
}

// Collection-specific shortcuts
export function useCollectionKeyboardShortcuts(collectionId?: string) {
  const router = useRouter()

  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'e',
      action: () => {
        if (collectionId) {
          router.push(`/collections/${collectionId}/edit`)
        }
      },
      description: 'Edit collection',
      category: 'Collection Actions'
    },
    {
      key: 'a',
      action: () => {
        const event = new CustomEvent('add-to-collection', { detail: { collectionId } })
        document.dispatchEvent(event)
      },
      description: 'Add resource to collection',
      category: 'Collection Actions'
    },
    {
      key: 's',
      ctrlKey: true,
      action: () => {
        const event = new CustomEvent('save-collection', { detail: { collectionId } })
        document.dispatchEvent(event)
      },
      description: 'Save collection',
      category: 'Collection Actions'
    }
  ]

  useKeyboardShortcuts({ shortcuts })

  return shortcuts
}