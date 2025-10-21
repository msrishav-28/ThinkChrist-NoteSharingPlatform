import { useState, useEffect } from 'react'
import { UserPreferences } from '@/types'
import { preferencesService } from '@/lib/services/preferences-service'

export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      setLoading(true)
      setError(null)
      const userPreferences = await preferencesService.getUserPreferences()
      setPreferences(userPreferences)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preferences')
    } finally {
      setLoading(false)
    }
  }

  const updatePreferences = async (newPreferences: Partial<UserPreferences>) => {
    try {
      setError(null)
      const updated = await preferencesService.updateUserPreferences(newPreferences)
      if (updated) {
        setPreferences(updated)
        return true
      }
      return false
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preferences')
      return false
    }
  }

  const updateNotificationSettings = async (settings: UserPreferences['notification_settings']) => {
    try {
      setError(null)
      const success = await preferencesService.updateNotificationSettings(settings)
      if (success && preferences) {
        setPreferences({
          ...preferences,
          notification_settings: settings
        })
      }
      return success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update notification settings')
      return false
    }
  }

  const updateRecommendationSettings = async (settings: UserPreferences['recommendation_settings']) => {
    try {
      setError(null)
      const success = await preferencesService.updateRecommendationSettings(settings)
      if (success && preferences) {
        setPreferences({
          ...preferences,
          recommendation_settings: settings
        })
      }
      return success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update recommendation settings')
      return false
    }
  }

  const updatePrivacySettings = async (settings: UserPreferences['privacy_settings']) => {
    try {
      setError(null)
      const success = await preferencesService.updatePrivacySettings(settings)
      if (success && preferences) {
        setPreferences({
          ...preferences,
          privacy_settings: settings
        })
      }
      return success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update privacy settings')
      return false
    }
  }

  return {
    preferences,
    loading,
    error,
    updatePreferences,
    updateNotificationSettings,
    updateRecommendationSettings,
    updatePrivacySettings,
    refetch: loadPreferences
  }
}