import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/features/auth'
import { Achievement, UserProgress, LeaderboardEntry, LeaderboardScope, UserAction } from '@/lib/services/gamification'

interface UseGamificationReturn {
  userProgress: UserProgress | null
  achievements: Achievement[]
  leaderboard: LeaderboardEntry[]
  userRank: number | null
  loading: boolean
  error: string | null
  awardPoints: (action: UserAction) => Promise<void>
  checkAchievements: () => Promise<Achievement[]>
  refreshProgress: () => Promise<void>
  refreshLeaderboard: (scope?: LeaderboardScope) => Promise<void>
}

export function useGamification(): UseGamificationReturn {
  const { user } = useAuth()
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [userRank, setUserRank] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUserProgress = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/gamification/progress')
      if (!response.ok) {
        throw new Error('Failed to fetch user progress')
      }

      const data = await response.json()
      setUserProgress(data.progress)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [user])

  const fetchLeaderboard = useCallback(async (scope?: LeaderboardScope) => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (scope?.type) params.append('type', scope.type)
      if (scope?.department) params.append('department', scope.department)
      if (scope?.course) params.append('course', scope.course)
      if (scope?.timeframe) params.append('timeframe', scope.timeframe)

      const response = await fetch(`/api/gamification/leaderboard?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard')
      }

      const data = await response.json()
      setLeaderboard(data.leaderboard)
      setUserRank(data.user_rank)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [user])

  const awardPoints = useCallback(async (action: UserAction) => {
    if (!user) return

    try {
      const response = await fetch('/api/gamification/points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(action),
      })

      if (!response.ok) {
        throw new Error('Failed to award points')
      }

      // Refresh user progress after awarding points
      await fetchUserProgress()
    } catch (err) {
      console.error('Error awarding points:', err)
      setError(err instanceof Error ? err.message : 'Failed to award points')
    }
  }, [user, fetchUserProgress])

  const checkAchievements = useCallback(async (): Promise<Achievement[]> => {
    if (!user) return []

    try {
      const response = await fetch('/api/gamification/achievements', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to check achievements')
      }

      const data = await response.json()
      const newAchievements = data.new_achievements || []
      
      if (newAchievements.length > 0) {
        setAchievements(prev => [...prev, ...newAchievements])
        // Refresh progress to get updated stats
        await fetchUserProgress()
      }

      return newAchievements
    } catch (err) {
      console.error('Error checking achievements:', err)
      setError(err instanceof Error ? err.message : 'Failed to check achievements')
      return []
    }
  }, [user, fetchUserProgress])

  const refreshProgress = useCallback(async () => {
    await fetchUserProgress()
  }, [fetchUserProgress])

  const refreshLeaderboard = useCallback(async (scope?: LeaderboardScope) => {
    await fetchLeaderboard(scope)
  }, [fetchLeaderboard])

  // Initial data fetch
  useEffect(() => {
    if (user) {
      fetchUserProgress()
      fetchLeaderboard()
    }
  }, [user, fetchUserProgress, fetchLeaderboard])

  return {
    userProgress,
    achievements,
    leaderboard,
    userRank,
    loading,
    error,
    awardPoints,
    checkAchievements,
    refreshProgress,
    refreshLeaderboard,
  }
}

// Hook for awarding points for specific actions
export function usePointsAward() {
  const { awardPoints } = useGamification()

  const awardUploadPoints = useCallback(async (resourceId: string, resourceType: string, metadata?: Record<string, any>) => {
    await awardPoints({
      type: 'upload_resource',
      userId: '', // Will be set by the API
      resourceId,
      resourceType,
      metadata
    })
  }, [awardPoints])

  const awardVotePoints = useCallback(async (resourceId: string, voteType: 'upvote' | 'downvote') => {
    await awardPoints({
      type: voteType === 'upvote' ? 'receive_upvote' : 'receive_downvote',
      userId: '', // Will be set by the API
      resourceId
    })
  }, [awardPoints])

  const awardCollectionPoints = useCallback(async (collectionId: string, actionType: 'create' | 'add_resource' | 'share') => {
    const actionMap = {
      create: 'create_collection',
      add_resource: 'add_to_collection',
      share: 'share_collection'
    }

    await awardPoints({
      type: actionMap[actionType] as any,
      userId: '', // Will be set by the API
      collectionId
    })
  }, [awardPoints])

  const awardDownloadPoints = useCallback(async (resourceId: string) => {
    await awardPoints({
      type: 'resource_downloaded',
      userId: '', // Will be set by the API
      resourceId
    })
  }, [awardPoints])

  return {
    awardUploadPoints,
    awardVotePoints,
    awardCollectionPoints,
    awardDownloadPoints
  }
}

// Hook for achievement notifications
export function useAchievementNotifications() {
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([])
  const [showNotification, setShowNotification] = useState(false)

  const showAchievement = useCallback((achievement: Achievement) => {
    setNewAchievements(prev => [...prev, achievement])
    setShowNotification(true)
  }, [])

  const dismissNotification = useCallback(() => {
    setShowNotification(false)
    // Clear achievements after a delay
    setTimeout(() => {
      setNewAchievements([])
    }, 300)
  }, [])

  return {
    newAchievements,
    showNotification,
    showAchievement,
    dismissNotification
  }
}