'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/features/auth'
import type { RecommendationResult } from '@/lib/services/recommendation'

interface UseRecommendationsOptions {
  limit?: number
  excludeInteracted?: boolean
  autoLoad?: boolean
}

interface UseRecommendationsReturn {
  recommendations: RecommendationResult[]
  loading: boolean
  error: string | null
  loadRecommendations: () => Promise<void>
  trackInteraction: (resourceId: string, interactionType: string, metadata?: Record<string, any>) => Promise<void>
}

export function useRecommendations(options: UseRecommendationsOptions = {}): UseRecommendationsReturn {
  const { 
    limit = 10, 
    excludeInteracted = true, 
    autoLoad = true 
  } = options
  
  const { user } = useAuth()
  const [recommendations, setRecommendations] = useState<RecommendationResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRecommendations = useCallback(async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        limit: limit.toString(),
        exclude_interacted: excludeInteracted.toString()
      })
      
      const response = await fetch(`/api/users/recommendations?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch recommendations')
      }
      
      const data = await response.json()
      setRecommendations(data.recommendations || [])
    } catch (err) {
      console.error('Error loading recommendations:', err)
      setError('Failed to load recommendations')
    } finally {
      setLoading(false)
    }
  }, [user?.id, limit, excludeInteracted])

  const trackInteraction = useCallback(async (
    resourceId: string, 
    interactionType: string, 
    metadata: Record<string, any> = {}
  ) => {
    if (!user?.id) return

    try {
      await fetch('/api/users/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resourceId,
          interactionType,
          metadata: {
            ...metadata,
            timestamp: new Date().toISOString()
          }
        })
      })
    } catch (error) {
      console.error('Error tracking interaction:', error)
    }
  }, [user?.id])

  useEffect(() => {
    if (autoLoad && user?.id) {
      loadRecommendations()
    }
  }, [autoLoad, user?.id, loadRecommendations])

  return {
    recommendations,
    loading,
    error,
    loadRecommendations,
    trackInteraction
  }
}