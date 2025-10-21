'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/features/auth'

interface DashboardStats {
  uploads: number
  downloads: number
  upvotes: number
  views: number
  points: number
  badge_level: string
}

interface DashboardActivity {
  id: string
  type: 'upload' | 'vote' | 'download' | 'badge'
  points_earned: number
  created_at: string
  resource?: {
    title: string
    resource_type: string
  }
}

interface DashboardFeedItem {
  id: string
  title: string
  description?: string
  resource_type: string
  department: string
  course: string
  upvotes: number
  downloads: number
  views: number
  created_at: string
  feed_score: number
  feed_reason: string
  tags?: string[]
  difficulty_level?: string
  uploader?: {
    full_name: string
    department: string
  }
}

interface DashboardData {
  user: any
  stats?: DashboardStats
  recent_activity?: DashboardActivity[]
  personalized_feed?: DashboardFeedItem[]
  trending?: DashboardFeedItem[]
  unread_notifications: number
  timestamp: string
}

interface UseDashboardOptions {
  includeStats?: boolean
  includeActivity?: boolean
  includeRecommendations?: boolean
  includeFeed?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

interface UseDashboardReturn {
  data: DashboardData | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  lastUpdated: Date | null
}

export function useDashboard(options: UseDashboardOptions = {}): UseDashboardReturn {
  const {
    includeStats = true,
    includeActivity = true,
    includeRecommendations = true,
    includeFeed = true,
    autoRefresh = false,
    refreshInterval = 5 * 60 * 1000 // 5 minutes
  } = options

  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        include_stats: includeStats.toString(),
        include_activity: includeActivity.toString(),
        include_recommendations: includeRecommendations.toString(),
        include_feed: includeFeed.toString()
      })

      const response = await fetch(`/api/users/dashboard?${params}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard data: ${response.statusText}`)
      }

      const dashboardData = await response.json()
      setData(dashboardData)
      setLastUpdated(new Date())

    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [user?.id, includeStats, includeActivity, includeRecommendations, includeFeed])

  // Initial load
  useEffect(() => {
    if (user?.id) {
      fetchDashboardData()
    }
  }, [user?.id, fetchDashboardData])

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh || !user?.id) return

    const interval = setInterval(fetchDashboardData, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, user?.id, refreshInterval, fetchDashboardData])

  return {
    data,
    loading,
    error,
    refresh: fetchDashboardData,
    lastUpdated
  }
}

// Specialized hooks for specific dashboard sections
export function useDashboardStats() {
  return useDashboard({
    includeStats: true,
    includeActivity: false,
    includeRecommendations: false,
    includeFeed: false
  })
}

export function useDashboardActivity() {
  return useDashboard({
    includeStats: false,
    includeActivity: true,
    includeRecommendations: false,
    includeFeed: false
  })
}

export function useDashboardFeed() {
  return useDashboard({
    includeStats: false,
    includeActivity: false,
    includeRecommendations: false,
    includeFeed: true
  })
}