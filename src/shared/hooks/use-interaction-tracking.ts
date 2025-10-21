import React, { useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@/features/auth'
import { userInteractionTrackingService, type InteractionEvent } from '@/lib/services/user-interaction-tracking'
import type { UserInteraction } from '@/types'

export interface UseInteractionTrackingOptions {
  // Automatically track page views
  autoTrackPageViews?: boolean
  // Track scroll behavior
  trackScrollBehavior?: boolean
  // Track time spent on page
  trackTimeOnPage?: boolean
  // Debounce time for scroll tracking (ms)
  scrollDebounceMs?: number
}

export interface InteractionTracker {
  // Track specific interactions
  trackView: (resourceId: string, metadata?: Record<string, any>) => void
  trackDownload: (resourceId: string, metadata?: Record<string, any>) => void
  trackShare: (resourceId: string, metadata?: Record<string, any>) => void
  trackBookmark: (resourceId: string, metadata?: Record<string, any>) => void
  trackPreviewClick: (resourceId: string, metadata?: Record<string, any>) => void
  trackSearchClick: (resourceId: string, metadata?: Record<string, any>) => void
  
  // Track custom interactions
  trackCustomInteraction: (
    resourceId: string, 
    interactionType: UserInteraction['interaction_type'],
    metadata?: Record<string, any>
  ) => void
  
  // Batch tracking for performance
  trackBatch: (interactions: Omit<InteractionEvent, 'userId'>[]) => void
  
  // Page-level tracking
  startPageSession: (pageContext: string) => void
  endPageSession: () => void
}

export function useInteractionTracking(
  options: UseInteractionTrackingOptions = {}
): InteractionTracker {
  const { user } = useAuth()
  const pageStartTime = useRef<number>(Date.now())
  const currentPageContext = useRef<string>('')
  const scrollTimeout = useRef<NodeJS.Timeout>()
  const maxScrollPercentage = useRef<number>(0)

  const {
    autoTrackPageViews = false,
    trackScrollBehavior = false,
    trackTimeOnPage = false,
    scrollDebounceMs = 1000
  } = options

  // Generate session metadata
  const getSessionMetadata = useCallback(() => {
    const metadata: Record<string, any> = {
      sessionId: getSessionId(),
      deviceType: getDeviceType(),
      pageContext: currentPageContext.current
    }

    if (typeof window !== 'undefined') {
      metadata.viewportWidth = window.innerWidth
      metadata.viewportHeight = window.innerHeight
    }

    return metadata
  }, [])

  // Track view interaction
  const trackView = useCallback((resourceId: string, metadata: Record<string, any> = {}) => {
    if (!user?.id) return

    const viewMetadata = {
      ...getSessionMetadata(),
      ...metadata,
      viewStartTime: Date.now()
    }

    userInteractionTrackingService.trackInteraction({
      userId: user.id,
      resourceId,
      interactionType: 'view',
      metadata: viewMetadata as any
    })
  }, [user?.id, getSessionMetadata])

  // Track download interaction
  const trackDownload = useCallback((resourceId: string, metadata: Record<string, any> = {}) => {
    if (!user?.id) return

    const downloadMetadata = {
      ...getSessionMetadata(),
      ...metadata,
      downloadTime: Date.now()
    }

    userInteractionTrackingService.trackInteraction({
      userId: user.id,
      resourceId,
      interactionType: 'download',
      metadata: downloadMetadata as any
    })
  }, [user?.id, getSessionMetadata])

  // Track share interaction
  const trackShare = useCallback((resourceId: string, metadata: Record<string, any> = {}) => {
    if (!user?.id) return

    const shareMetadata = {
      ...getSessionMetadata(),
      ...metadata,
      shareTime: Date.now()
    }

    userInteractionTrackingService.trackInteraction({
      userId: user.id,
      resourceId,
      interactionType: 'share',
      metadata: shareMetadata as any
    })
  }, [user?.id, getSessionMetadata])

  // Track bookmark interaction
  const trackBookmark = useCallback((resourceId: string, metadata: Record<string, any> = {}) => {
    if (!user?.id) return

    const bookmarkMetadata = {
      ...getSessionMetadata(),
      ...metadata,
      bookmarkTime: Date.now()
    }

    userInteractionTrackingService.trackInteraction({
      userId: user.id,
      resourceId,
      interactionType: 'bookmark',
      metadata: bookmarkMetadata as any
    })
  }, [user?.id, getSessionMetadata])

  // Track preview click interaction
  const trackPreviewClick = useCallback((resourceId: string, metadata: Record<string, any> = {}) => {
    if (!user?.id) return

    const previewMetadata = {
      ...getSessionMetadata(),
      ...metadata,
      previewClickTime: Date.now()
    }

    userInteractionTrackingService.trackInteraction({
      userId: user.id,
      resourceId,
      interactionType: 'preview_click',
      metadata: previewMetadata as any
    })
  }, [user?.id, getSessionMetadata])

  // Track search click interaction
  const trackSearchClick = useCallback((resourceId: string, metadata: Record<string, any> = {}) => {
    if (!user?.id) return

    const searchMetadata = {
      ...getSessionMetadata(),
      ...metadata,
      searchClickTime: Date.now()
    }

    userInteractionTrackingService.trackInteraction({
      userId: user.id,
      resourceId,
      interactionType: 'search_click',
      metadata: searchMetadata as any
    })
  }, [user?.id, getSessionMetadata])

  // Track custom interaction
  const trackCustomInteraction = useCallback((
    resourceId: string,
    interactionType: UserInteraction['interaction_type'],
    metadata: Record<string, any> = {}
  ) => {
    if (!user?.id) return

    const customMetadata = {
      ...getSessionMetadata(),
      ...metadata,
      interactionTime: Date.now()
    }

    userInteractionTrackingService.trackInteraction({
      userId: user.id,
      resourceId,
      interactionType,
      metadata: customMetadata as any
    })
  }, [user?.id, getSessionMetadata])

  // Track batch interactions
  const trackBatch = useCallback((interactions: Omit<InteractionEvent, 'userId'>[]) => {
    if (!user?.id) return

    const batchWithUserId = interactions.map(interaction => ({
      ...interaction,
      userId: user.id,
      metadata: {
        ...getSessionMetadata(),
        ...interaction.metadata
      }
    }))

    userInteractionTrackingService.trackInteractionBatch(batchWithUserId)
  }, [user?.id, getSessionMetadata])

  // Start page session
  const startPageSession = useCallback((pageContext: string) => {
    currentPageContext.current = pageContext
    pageStartTime.current = Date.now()
    maxScrollPercentage.current = 0

    if (autoTrackPageViews && user?.id) {
      // Track page view as a general interaction
      userInteractionTrackingService.trackInteraction({
        userId: user.id,
        resourceId: 'page_view', // Special resource ID for page views
        interactionType: 'view',
        metadata: {
          ...getSessionMetadata(),
          pageContext,
          pageStartTime: pageStartTime.current
        } as any
      })
    }
  }, [user?.id, autoTrackPageViews, getSessionMetadata])

  // End page session
  const endPageSession = useCallback(() => {
    if (trackTimeOnPage && user?.id && currentPageContext.current) {
      const sessionDuration = Date.now() - pageStartTime.current

      userInteractionTrackingService.trackInteraction({
        userId: user.id,
        resourceId: 'page_session', // Special resource ID for page sessions
        interactionType: 'view',
        metadata: {
          ...getSessionMetadata(),
          sessionDuration,
          maxScrollPercentage: maxScrollPercentage.current,
          pageEndTime: Date.now()
        } as any
      })
    }

    currentPageContext.current = ''
    maxScrollPercentage.current = 0
  }, [user?.id, trackTimeOnPage, getSessionMetadata])

  // Set up scroll tracking
  useEffect(() => {
    if (!trackScrollBehavior || typeof window === 'undefined') return

    const handleScroll = () => {
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current)
      }

      scrollTimeout.current = setTimeout(() => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop
        const documentHeight = document.documentElement.scrollHeight - window.innerHeight
        const scrollPercentage = documentHeight > 0 ? (scrollTop / documentHeight) * 100 : 0

        maxScrollPercentage.current = Math.max(maxScrollPercentage.current, scrollPercentage)
      }, scrollDebounceMs)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current)
      }
    }
  }, [trackScrollBehavior, scrollDebounceMs])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      endPageSession()
    }
  }, [endPageSession])

  return {
    trackView,
    trackDownload,
    trackShare,
    trackBookmark,
    trackPreviewClick,
    trackSearchClick,
    trackCustomInteraction,
    trackBatch,
    startPageSession,
    endPageSession
  }
}

// Helper functions

function getSessionId(): string {
  if (typeof window !== 'undefined') {
    let sessionId = sessionStorage.getItem('interaction_session_id')
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('interaction_session_id', sessionId)
    }
    return sessionId
  }
  return `server_session_${Date.now()}`
}

function getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
  if (typeof window === 'undefined') return 'desktop'

  const width = window.innerWidth
  if (width < 768) return 'mobile'
  if (width < 1024) return 'tablet'
  return 'desktop'
}

// Higher-order component for automatic interaction tracking
export function withInteractionTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: UseInteractionTrackingOptions = {}
) {
  return function InteractionTrackingWrapper(props: P) {
    const tracker = useInteractionTracking(options)

    return React.createElement(WrappedComponent, { ...props, interactionTracker: tracker })
  }
}
