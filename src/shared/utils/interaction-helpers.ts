import { userInteractionTrackingService } from '@/lib/services/user-interaction-tracking'
import type { UserInteraction } from '@/types'

/**
 * Helper functions to easily integrate interaction tracking into existing components
 */

export interface TrackingHelpers {
  trackResourceView: (resourceId: string, metadata?: Record<string, any>) => void
  trackResourceDownload: (resourceId: string, metadata?: Record<string, any>) => void
  trackResourceShare: (resourceId: string, metadata?: Record<string, any>) => void
  trackResourceBookmark: (resourceId: string, isBookmarked: boolean, metadata?: Record<string, any>) => void
  trackSearchClick: (resourceId: string, searchQuery: string, position: number, metadata?: Record<string, any>) => void
  trackPreviewClick: (resourceId: string, previewType: string, metadata?: Record<string, any>) => void
}

/**
 * Create tracking helpers for a specific user
 */
export function createTrackingHelpers(userId: string): TrackingHelpers {
  const trackResourceView = (resourceId: string, metadata: Record<string, any> = {}) => {
    userInteractionTrackingService.trackInteraction({
      userId,
      resourceId,
      interactionType: 'view',
      metadata: {
        ...metadata,
        timestamp: Date.now().toString()
      }
    })
  }

  const trackResourceDownload = (resourceId: string, metadata: Record<string, any> = {}) => {
    userInteractionTrackingService.trackInteraction({
      userId,
      resourceId,
      interactionType: 'download',
      metadata: {
        ...metadata,
        timestamp: Date.now().toString()
      }
    })
  }

  const trackResourceShare = (resourceId: string, metadata: Record<string, any> = {}) => {
    userInteractionTrackingService.trackInteraction({
      userId,
      resourceId,
      interactionType: 'share',
      metadata: {
        ...metadata,
        timestamp: Date.now().toString()
      }
    })
  }

  const trackResourceBookmark = (
    resourceId: string, 
    isBookmarked: boolean, 
    metadata: Record<string, any> = {}
  ) => {
    userInteractionTrackingService.trackInteraction({
      userId,
      resourceId,
      interactionType: 'bookmark',
      metadata: {
        ...metadata,
        bookmarkAction: isBookmarked ? 'add' : 'remove',
        timestamp: Date.now().toString()
      }
    })
  }

  const trackSearchClick = (
    resourceId: string, 
    searchQuery: string, 
    position: number, 
    metadata: Record<string, any> = {}
  ) => {
    userInteractionTrackingService.trackInteraction({
      userId,
      resourceId,
      interactionType: 'search_click',
      metadata: {
        ...metadata,
        searchQuery,
        searchPosition: position,
        timestamp: Date.now().toString()
      }
    })
  }

  const trackPreviewClick = (
    resourceId: string, 
    previewType: string, 
    metadata: Record<string, any> = {}
  ) => {
    userInteractionTrackingService.trackInteraction({
      userId,
      resourceId,
      interactionType: 'preview_click',
      metadata: {
        ...metadata,
        previewType: previewType as "full" | "thumbnail" | "hover",
        timestamp: Date.now().toString()
      }
    })
  }

  return {
    trackResourceView,
    trackResourceDownload,
    trackResourceShare,
    trackResourceBookmark,
    trackSearchClick,
    trackPreviewClick
  }
}

/**
 * Higher-order function to add interaction tracking to click handlers
 */
export function withClickTracking<T extends (...args: any[]) => any>(
  originalHandler: T,
  trackingFn: () => void
): T {
  return ((...args: Parameters<T>) => {
    // Track the interaction
    trackingFn()
    
    // Call the original handler
    return originalHandler(...args)
  }) as T
}

/**
 * Debounced interaction tracking for high-frequency events like scrolling
 */
export function createDebouncedTracker(
  trackingFn: () => void,
  delay: number = 1000
): () => void {
  let timeoutId: NodeJS.Timeout | null = null

  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      trackingFn()
      timeoutId = null
    }, delay)
  }
}

/**
 * Track view duration for a resource
 */
export function createViewDurationTracker(
  userId: string,
  resourceId: string,
  metadata: Record<string, any> = {}
) {
  const startTime = Date.now()
  let isActive = true

  const endTracking = () => {
    if (!isActive) return

    const viewDuration = Date.now() - startTime
    isActive = false

    userInteractionTrackingService.trackInteraction({
      userId,
      resourceId,
      interactionType: 'view',
      metadata: {
        ...metadata,
        viewDuration,
        viewStartTime: startTime,
        viewEndTime: Date.now()
      } as any
    })
  }

  // Auto-end tracking when user leaves the page
  const handleBeforeUnload = () => endTracking()
  const handleVisibilityChange = () => {
    if (document.hidden) {
      endTracking()
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)
  }

  return {
    endTracking,
    cleanup: () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', handleBeforeUnload)
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
      endTracking()
    }
  }
}

/**
 * Track scroll behavior on a resource page
 */
export function createScrollTracker(
  userId: string,
  resourceId: string,
  metadata: Record<string, any> = {}
) {
  let maxScrollPercentage = 0
  let scrollEvents: Array<{ percentage: number; timestamp: number }> = []
  const startTime = Date.now()

  const handleScroll = () => {
    if (typeof window === 'undefined') return

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    const documentHeight = document.documentElement.scrollHeight - window.innerHeight
    const scrollPercentage = documentHeight > 0 ? (scrollTop / documentHeight) * 100 : 0

    maxScrollPercentage = Math.max(maxScrollPercentage, scrollPercentage)
    
    // Record scroll milestones (25%, 50%, 75%, 100%)
    const milestones = [25, 50, 75, 100]
    milestones.forEach(milestone => {
      if (scrollPercentage >= milestone && !scrollEvents.some(e => e.percentage === milestone)) {
        scrollEvents.push({ percentage: milestone, timestamp: Date.now() })
      }
    })
  }

  const debouncedScroll = createDebouncedTracker(handleScroll, 500)

  const endTracking = () => {
    const sessionDuration = Date.now() - startTime

    userInteractionTrackingService.trackInteraction({
      userId,
      resourceId,
      interactionType: 'view',
      metadata: {
        ...metadata,
        maxScrollPercentage,
        scrollMilestones: scrollEvents,
        sessionDuration,
        scrollBehavior: 'tracked'
      } as any
    })
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('scroll', debouncedScroll, { passive: true })
  }

  return {
    endTracking,
    cleanup: () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('scroll', debouncedScroll)
      }
      endTracking()
    }
  }
}

/**
 * Batch multiple interactions for efficient processing
 */
export class InteractionBatcher {
  private batch: Array<{
    userId: string
    resourceId: string
    interactionType: UserInteraction['interaction_type']
    metadata?: Record<string, any>
  }> = []
  
  private batchTimeout: NodeJS.Timeout | null = null
  private readonly BATCH_SIZE = 10
  private readonly BATCH_TIMEOUT_MS = 5000

  add(
    userId: string,
    resourceId: string,
    interactionType: UserInteraction['interaction_type'],
    metadata: Record<string, any> = {}
  ) {
    this.batch.push({
      userId,
      resourceId,
      interactionType,
      metadata: {
        ...metadata,
        timestamp: Date.now().toString()
      }
    })

    if (this.batch.length >= this.BATCH_SIZE) {
      this.flush()
    } else {
      this.scheduleBatch()
    }
  }

  private scheduleBatch() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
    }

    this.batchTimeout = setTimeout(() => {
      this.flush()
    }, this.BATCH_TIMEOUT_MS)
  }

  flush() {
    if (this.batch.length === 0) return

    const batchToProcess = [...this.batch]
    this.batch = []

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
      this.batchTimeout = null
    }

    // Process batch
    userInteractionTrackingService.trackInteractionBatch(batchToProcess)
  }

  cleanup() {
    this.flush()
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
    }
  }
}

/**
 * Create a global interaction batcher instance
 */
export const globalInteractionBatcher = new InteractionBatcher()

/**
 * Utility to track interactions with automatic batching
 */
export function trackInteractionBatched(
  userId: string,
  resourceId: string,
  interactionType: UserInteraction['interaction_type'],
  metadata: Record<string, any> = {}
) {
  globalInteractionBatcher.add(userId, resourceId, interactionType, metadata)
}

/**
 * Clean up all tracking when component unmounts or page unloads
 */
export function cleanupAllTracking() {
  globalInteractionBatcher.cleanup()
}
