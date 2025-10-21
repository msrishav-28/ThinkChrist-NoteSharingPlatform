'use client'

import React, { createContext, useContext, useEffect, useRef } from 'react'
import { useAuth } from '@/features/auth'
import { useInteractionTracking, type InteractionTracker } from '@/hooks/use-interaction-tracking'

interface InteractionTrackingContextType {
  tracker: InteractionTracker
  isTrackingEnabled: boolean
}

const InteractionTrackingContext = createContext<InteractionTrackingContextType | null>(null)

interface InteractionTrackingProviderProps {
  children: React.ReactNode
  autoTrackPageViews?: boolean
  trackScrollBehavior?: boolean
  trackTimeOnPage?: boolean
}

export function InteractionTrackingProvider({
  children,
  autoTrackPageViews = true,
  trackScrollBehavior = true,
  trackTimeOnPage = true
}: InteractionTrackingProviderProps) {
  const { user } = useAuth()
  const tracker = useInteractionTracking({
    autoTrackPageViews,
    trackScrollBehavior,
    trackTimeOnPage
  })
  
  const isTrackingEnabled = !!user?.id
  const currentPath = useRef<string>('')

  // Track page changes
  useEffect(() => {
    if (typeof window === 'undefined' || !isTrackingEnabled) return

    const handleRouteChange = () => {
      const newPath = window.location.pathname
      
      // End previous session if path changed
      if (currentPath.current && currentPath.current !== newPath) {
        tracker.endPageSession()
      }
      
      // Start new session
      currentPath.current = newPath
      tracker.startPageSession(newPath)
    }

    // Initial page load
    handleRouteChange()

    // Listen for navigation changes (for SPA routing)
    const originalPushState = window.history.pushState
    const originalReplaceState = window.history.replaceState

    window.history.pushState = function(...args) {
      originalPushState.apply(window.history, args)
      setTimeout(handleRouteChange, 0)
    }

    window.history.replaceState = function(...args) {
      originalReplaceState.apply(window.history, args)
      setTimeout(handleRouteChange, 0)
    }

    window.addEventListener('popstate', handleRouteChange)

    return () => {
      // Restore original methods
      window.history.pushState = originalPushState
      window.history.replaceState = originalReplaceState
      window.removeEventListener('popstate', handleRouteChange)
      
      // End current session
      tracker.endPageSession()
    }
  }, [isTrackingEnabled, tracker])

  // Track page visibility changes
  useEffect(() => {
    if (typeof window === 'undefined' || !isTrackingEnabled) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page became hidden - end session
        tracker.endPageSession()
      } else {
        // Page became visible - start new session
        const currentPath = window.location.pathname
        tracker.startPageSession(currentPath)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isTrackingEnabled, tracker])

  const contextValue: InteractionTrackingContextType = {
    tracker,
    isTrackingEnabled
  }

  return (
    <InteractionTrackingContext.Provider value={contextValue}>
      {children}
    </InteractionTrackingContext.Provider>
  )
}

export function useInteractionTrackingContext(): InteractionTrackingContextType {
  const context = useContext(InteractionTrackingContext)
  
  if (!context) {
    throw new Error(
      'useInteractionTrackingContext must be used within an InteractionTrackingProvider'
    )
  }
  
  return context
}

// Convenience hook for just the tracker
export function useTracker(): InteractionTracker {
  const { tracker } = useInteractionTrackingContext()
  return tracker
}