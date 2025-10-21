import { createClient } from '@/lib/supabase/client'
import { UserPreferences } from '@/types'

export class PreferencesService {
  private _supabase: ReturnType<typeof createClient> | null = null

  private get supabase() {
    if (!this._supabase) {
      this._supabase = createClient()
    }
    return this._supabase
  }

  async getUserPreferences(): Promise<UserPreferences | null> {
    try {
      const response = await fetch('/api/users/preferences')
      if (!response.ok) {
        throw new Error('Failed to fetch preferences')
      }
      return await response.json()
    } catch (error) {
      console.error('Error fetching user preferences:', error)
      return null
    }
  }

  async updateUserPreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences | null> {
    try {
      const response = await fetch('/api/users/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      })

      if (!response.ok) {
        throw new Error('Failed to update preferences')
      }

      return await response.json()
    } catch (error) {
      console.error('Error updating user preferences:', error)
      return null
    }
  }

  async updateNotificationSettings(settings: UserPreferences['notification_settings']): Promise<boolean> {
    try {
      const currentPreferences = await this.getUserPreferences()
      if (!currentPreferences) return false

      const updatedPreferences = await this.updateUserPreferences({
        ...currentPreferences,
        notification_settings: settings
      })

      return updatedPreferences !== null
    } catch (error) {
      console.error('Error updating notification settings:', error)
      return false
    }
  }

  async updateRecommendationSettings(settings: UserPreferences['recommendation_settings']): Promise<boolean> {
    try {
      const currentPreferences = await this.getUserPreferences()
      if (!currentPreferences) return false

      const updatedPreferences = await this.updateUserPreferences({
        ...currentPreferences,
        recommendation_settings: settings
      })

      return updatedPreferences !== null
    } catch (error) {
      console.error('Error updating recommendation settings:', error)
      return false
    }
  }

  async updatePrivacySettings(settings: UserPreferences['privacy_settings']): Promise<boolean> {
    try {
      const currentPreferences = await this.getUserPreferences()
      if (!currentPreferences) return false

      const updatedPreferences = await this.updateUserPreferences({
        ...currentPreferences,
        privacy_settings: settings
      })

      return updatedPreferences !== null
    } catch (error) {
      console.error('Error updating privacy settings:', error)
      return false
    }
  }

  getDefaultPreferences(): Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'> {
    return {
      notification_settings: {
        email_digest: true,
        new_resources: true,
        votes_received: true,
        achievements: true
      },
      recommendation_settings: {
        enable_recommendations: true,
        track_interactions: true
      },
      privacy_settings: {
        profile_visibility: 'public',
        activity_visibility: 'public'
      }
    }
  }
}

export const preferencesService = new PreferencesService()
