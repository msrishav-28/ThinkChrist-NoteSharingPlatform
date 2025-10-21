'use client'

import { useEffect } from 'react'
import { 
  initializeSkipLinks, 
  addFocusVisiblePolyfill, 
  liveRegionManager,
  prefersReducedMotion,
  prefersHighContrast
} from '@/lib/utils/accessibility'

interface AccessibilityProviderProps {
  children: React.ReactNode
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  useEffect(() => {
    // Initialize skip links
    initializeSkipLinks()
    
    // Add focus-visible polyfill for older browsers
    addFocusVisiblePolyfill()
    
    // Create default live regions
    liveRegionManager.createRegion('default-announcements', 'polite')
    liveRegionManager.createRegion('urgent-announcements', 'assertive')
    
    // Add accessibility classes based on user preferences
    const updateAccessibilityClasses = () => {
      const root = document.documentElement
      
      if (prefersReducedMotion()) {
        root.classList.add('reduce-motion')
      } else {
        root.classList.remove('reduce-motion')
      }
      
      if (prefersHighContrast()) {
        root.classList.add('high-contrast')
      } else {
        root.classList.remove('high-contrast')
      }
    }
    
    // Initial check
    updateAccessibilityClasses()
    
    // Listen for changes in user preferences
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const contrastQuery = window.matchMedia('(prefers-contrast: high)')
    
    motionQuery.addEventListener('change', updateAccessibilityClasses)
    contrastQuery.addEventListener('change', updateAccessibilityClasses)
    
    // Cleanup function
    return () => {
      motionQuery.removeEventListener('change', updateAccessibilityClasses)
      contrastQuery.removeEventListener('change', updateAccessibilityClasses)
      liveRegionManager.cleanup()
    }
  }, [])

  // Add keyboard navigation announcements
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Announce navigation for screen readers
      if (e.key === 'Tab') {
        const activeElement = document.activeElement as HTMLElement
        if (activeElement && activeElement.getAttribute('aria-label')) {
          // Small delay to ensure focus has moved
          setTimeout(() => {
            const label = activeElement.getAttribute('aria-label')
            if (label) {
              liveRegionManager.announce(`Focused: ${label}`, 'default-announcements')
            }
          }, 100)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return <>{children}</>
}

// Hook for announcing messages to screen readers
export function useAnnounce() {
  return {
    announce: (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      const regionId = priority === 'assertive' ? 'urgent-announcements' : 'default-announcements'
      liveRegionManager.announce(message, regionId, priority)
    },
    clear: (priority: 'polite' | 'assertive' = 'polite') => {
      const regionId = priority === 'assertive' ? 'urgent-announcements' : 'default-announcements'
      liveRegionManager.clear(regionId)
    }
  }
}

// Hook for managing focus
export function useFocusManagement() {
  return {
    focusElement: (selector: string) => {
      const element = document.querySelector(selector) as HTMLElement
      if (element) {
        // Make focusable if needed
        if (!element.hasAttribute('tabindex')) {
          element.setAttribute('tabindex', '-1')
        }
        element.focus()
        return true
      }
      return false
    },
    
    focusFirstError: () => {
      const firstError = document.querySelector('[aria-invalid="true"]') as HTMLElement
      if (firstError) {
        firstError.focus()
        return true
      }
      return false
    },
    
    focusMainContent: () => {
      const main = document.getElementById('main-content') || document.querySelector('main')
      if (main) {
        if (!main.hasAttribute('tabindex')) {
          main.setAttribute('tabindex', '-1')
        }
        main.focus()
        return true
      }
      return false
    }
  }
}