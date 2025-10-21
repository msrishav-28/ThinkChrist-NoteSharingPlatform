import { createClient } from '@/lib/supabase/client'
import type { UserInteraction, UserPreferences } from '@/types'
import { DatabaseUtils } from '@/lib/database-utils'

export interface InteractionEvent {
  userId: string
  resourceId: string
  interactionType: UserInteraction['interaction_type']
  metadata?: {
    // View-specific metadata
    viewDuration?: number
    scrollPercentage?: number
    source?: 'search' | 'recommendation' | 'collection' | 'direct' | 'dashboard'
    
    // Download-specific metadata
    downloadMethod?: 'direct' | 'bulk'
    
    // Share-specific metadata
    shareMethod?: 'link' | 'email' | 'social'
    shareTarget?: string
    
    // Search-specific metadata
    searchQuery?: string
    searchPosition?: number
    searchFilters?: Record<string, any>
    
    // Preview-specific metadata
    previewType?: 'thumbnail' | 'full' | 'hover'
    previewDuration?: number
    
    // Bookmark-specific metadata
    bookmarkAction?: 'add' | 'remove'
    
    // General metadata
    sessionId?: string
    userAgent?: string
    referrer?: string
    timestamp?: string
    deviceType?: 'desktop' | 'mobile' | 'tablet'
    
    // Privacy-compliant context
    pageContext?: string
    featureUsed?: string
  }
}

export interface InteractionAnalytics {
  totalInteractions: number
  uniqueUsers: number
  interactionsByType: Record<string, number>
  averageEngagementTime: number
  topResources: Array<{
    resourceId: string
    title: string
    interactions: number
    uniqueUsers: number
  }>
  userEngagementTrends: Array<{
    date: string
    interactions: number
    uniqueUsers: number
  }>
}

export interface UserEngagementProfile {
  userId: string
  totalInteractions: number
  preferredResourceTypes: Array<{ type: string; count: number }>
  averageSessionDuration: number
  mostActiveTimeOfDay: number
  engagementScore: number
  lastActiveDate: string
  interactionPatterns: {
    viewToDownloadRate: number
    bookmarkRate: number
    shareRate: number
    searchClickThroughRate: number
  }
}

export interface PrivacySettings {
  trackInteractions: boolean
  trackDetailedMetadata: boolean
  shareAnalyticsData: boolean
  retentionPeriodDays: number
}

export class UserInteractionTrackingService {
  private _supabase: ReturnType<typeof createClient> | null = null

  private get supabase() {
    if (!this._supabase) {
      this._supabase = createClient()
    }
    return this._supabase
  }
  private batchQueue: InteractionEvent[] = []
  private batchTimeout: NodeJS.Timeout | null = null
  private readonly BATCH_SIZE = 10
  private readonly BATCH_TIMEOUT_MS = 5000

  /**
   * Track a user interaction with privacy compliance
   */
  async trackInteraction(event: InteractionEvent): Promise<void> {
    try {
      // Check user privacy preferences
      const privacySettings = await this.getUserPrivacySettings(event.userId)
      
      if (!privacySettings.trackInteractions) {
        return // User has opted out of interaction tracking
      }

      // Filter metadata based on privacy settings
      const filteredMetadata = this.filterMetadataByPrivacy(
        event.metadata || {},
        privacySettings
      )

      // Add to batch queue for efficient processing
      this.batchQueue.push({
        ...event,
        metadata: {
          ...filteredMetadata,
          timestamp: new Date().toISOString(),
          sessionId: this.getSessionId()
        }
      })

      // Process batch if it reaches the size limit
      if (this.batchQueue.length >= this.BATCH_SIZE) {
        await this.processBatch()
      } else {
        // Set timeout to process batch
        this.scheduleBatchProcessing()
      }

    } catch (error) {
      console.error('Error tracking user interaction:', error)
      // Don't throw error to avoid disrupting user experience
    }
  }

  /**
   * Track multiple interactions in batch
   */
  async trackInteractionBatch(events: InteractionEvent[]): Promise<void> {
    try {
      const validEvents: InteractionEvent[] = []

      for (const event of events) {
        const privacySettings = await this.getUserPrivacySettings(event.userId)
        
        if (privacySettings.trackInteractions) {
          const filteredMetadata = this.filterMetadataByPrivacy(
            event.metadata || {},
            privacySettings
          )

          validEvents.push({
            ...event,
            metadata: {
              ...filteredMetadata,
              timestamp: new Date().toISOString(),
              sessionId: this.getSessionId()
            }
          })
        }
      }

      if (validEvents.length > 0) {
        await this.insertInteractions(validEvents)
      }

    } catch (error) {
      console.error('Error tracking interaction batch:', error)
    }
  }

  /**
   * Get user engagement analytics
   */
  async getUserEngagementProfile(userId: string): Promise<UserEngagementProfile | null> {
    try {
      const { data: interactions } = await this.supabase
        .from('user_interactions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()) // Last 90 days

      if (!interactions || interactions.length === 0) {
        return null
      }

      return this.calculateEngagementProfile(userId, interactions)

    } catch (error) {
      console.error('Error getting user engagement profile:', error)
      return null
    }
  }

  /**
   * Get resource interaction analytics
   */
  async getResourceInteractionAnalytics(
    resourceId: string,
    dateRange?: { start: string; end: string }
  ): Promise<InteractionAnalytics> {
    try {
      let query = this.supabase
        .from('user_interactions')
        .select(`
          *,
          resources!inner(id, title)
        `)
        .eq('resource_id', resourceId)

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end)
      }

      const { data: interactions } = await query

      return this.calculateInteractionAnalytics(interactions || [])

    } catch (error) {
      console.error('Error getting resource interaction analytics:', error)
      return this.getEmptyAnalytics()
    }
  }

  /**
   * Get platform-wide interaction analytics
   */
  async getPlatformInteractionAnalytics(
    dateRange?: { start: string; end: string }
  ): Promise<InteractionAnalytics> {
    try {
      let query = this.supabase
        .from('user_interactions')
        .select(`
          *,
          resources!inner(id, title)
        `)

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end)
      }

      const { data: interactions } = await query.limit(10000) // Limit for performance

      return this.calculateInteractionAnalytics(interactions || [])

    } catch (error) {
      console.error('Error getting platform interaction analytics:', error)
      return this.getEmptyAnalytics()
    }
  }

  /**
   * Get interaction trends for recommendations
   */
  async getInteractionTrendsForRecommendations(
    userId: string,
    limit: number = 100
  ): Promise<UserInteraction[]> {
    try {
      const { data: interactions } = await this.supabase
        .from('user_interactions')
        .select(`
          *,
          resources!inner(
            id, title, resource_type, tags, department, course, 
            difficulty_level, subject, topic
          )
        `)
        .eq('user_id', userId)
        .in('interaction_type', ['view', 'download', 'bookmark', 'share'])
        .order('created_at', { ascending: false })
        .limit(limit)

      return interactions || []

    } catch (error) {
      console.error('Error getting interaction trends:', error)
      return []
    }
  }

  /**
   * Clean up old interactions based on retention policy
   */
  async cleanupOldInteractions(): Promise<void> {
    try {
      // Get all users' privacy settings to determine retention periods
      const { data: preferences } = await this.supabase
        .from('user_preferences')
        .select('user_id, privacy_settings')

      if (!preferences) return

      // Group users by retention period
      const retentionGroups = new Map<number, string[]>()
      
      preferences.forEach(pref => {
        const retentionDays = pref.privacy_settings?.retentionPeriodDays || 365
        if (!retentionGroups.has(retentionDays)) {
          retentionGroups.set(retentionDays, [])
        }
        retentionGroups.get(retentionDays)!.push(pref.user_id)
      })

      // Clean up interactions for each retention group
      for (const [retentionDays, userIds] of Array.from(retentionGroups)) {
        const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)
        
        await this.supabase
          .from('user_interactions')
          .delete()
          .in('user_id', userIds)
          .lt('created_at', cutoffDate.toISOString())
      }

    } catch (error) {
      console.error('Error cleaning up old interactions:', error)
    }
  }

  /**
   * Update user privacy settings for interaction tracking
   */
  async updateUserPrivacySettings(
    userId: string,
    privacySettings: Partial<PrivacySettings>
  ): Promise<void> {
    try {
      const { data: currentPrefs } = await this.supabase
        .from('user_preferences')
        .select('privacy_settings')
        .eq('user_id', userId)
        .single()

      const updatedPrivacySettings = {
        ...currentPrefs?.privacy_settings,
        ...privacySettings
      }

      await DatabaseUtils.updateUserPreferences(userId, {
        privacy_settings: {
          ...currentPrefs?.privacy_settings,
          ...updatedPrivacySettings
        }
      })

      // If user opted out, clean up their existing interactions
      if (privacySettings.trackInteractions === false) {
        await this.supabase
          .from('user_interactions')
          .delete()
          .eq('user_id', userId)
      }

    } catch (error) {
      console.error('Error updating user privacy settings:', error)
      throw error
    }
  }

  /**
   * Export user interaction data (GDPR compliance)
   */
  async exportUserInteractionData(userId: string): Promise<UserInteraction[]> {
    try {
      const { data: interactions } = await this.supabase
        .from('user_interactions')
        .select(`
          *,
          resources!inner(id, title, resource_type)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      return interactions || []

    } catch (error) {
      console.error('Error exporting user interaction data:', error)
      return []
    }
  }

  /**
   * Delete all user interaction data (GDPR compliance)
   */
  async deleteUserInteractionData(userId: string): Promise<void> {
    try {
      await this.supabase
        .from('user_interactions')
        .delete()
        .eq('user_id', userId)

    } catch (error) {
      console.error('Error deleting user interaction data:', error)
      throw error
    }
  }

  // Private helper methods

  private async getUserPrivacySettings(userId: string): Promise<PrivacySettings> {
    try {
      const { data: preferences } = await this.supabase
        .from('user_preferences')
        .select('privacy_settings')
        .eq('user_id', userId)
        .single()

      const privacySettings = preferences?.privacy_settings || {}

      return {
        trackInteractions: privacySettings.trackInteractions ?? true,
        trackDetailedMetadata: privacySettings.trackDetailedMetadata ?? true,
        shareAnalyticsData: privacySettings.shareAnalyticsData ?? false,
        retentionPeriodDays: privacySettings.retentionPeriodDays ?? 365
      }

    } catch (error) {
      // Default to privacy-friendly settings if preferences not found
      return {
        trackInteractions: true,
        trackDetailedMetadata: false,
        shareAnalyticsData: false,
        retentionPeriodDays: 90
      }
    }
  }

  private filterMetadataByPrivacy(
    metadata: Record<string, any>,
    privacySettings: PrivacySettings
  ): Record<string, any> {
    if (!privacySettings.trackDetailedMetadata) {
      // Only keep essential metadata for basic functionality
      const essentialKeys = [
        'source', 'searchQuery', 'searchPosition', 'bookmarkAction'
      ]
      
      const filteredMetadata: Record<string, any> = {}
      essentialKeys.forEach(key => {
        if (metadata[key] !== undefined) {
          filteredMetadata[key] = metadata[key]
        }
      })
      
      return filteredMetadata
    }

    // Remove potentially sensitive data even with detailed tracking
    const sensitiveKeys = ['userAgent', 'referrer']
    const filteredMetadata = { ...metadata }
    
    sensitiveKeys.forEach(key => {
      delete filteredMetadata[key]
    })

    return filteredMetadata
  }

  private getSessionId(): string {
    // Generate or retrieve session ID for grouping interactions
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

  private scheduleBatchProcessing(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
    }

    this.batchTimeout = setTimeout(async () => {
      await this.processBatch()
    }, this.BATCH_TIMEOUT_MS)
  }

  private async processBatch(): Promise<void> {
    if (this.batchQueue.length === 0) return

    const eventsToProcess = [...this.batchQueue]
    this.batchQueue = []

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
      this.batchTimeout = null
    }

    await this.insertInteractions(eventsToProcess)
  }

  private async insertInteractions(events: InteractionEvent[]): Promise<void> {
    try {
      const interactionRecords = events.map(event => ({
        user_id: event.userId,
        resource_id: event.resourceId,
        interaction_type: event.interactionType,
        interaction_data: event.metadata || {}
      }))

      const { error } = await this.supabase
        .from('user_interactions')
        .insert(interactionRecords)

      if (error) {
        console.error('Error inserting interactions:', error)
      }

    } catch (error) {
      console.error('Error in insertInteractions:', error)
    }
  }

  private calculateEngagementProfile(
    userId: string,
    interactions: UserInteraction[]
  ): UserEngagementProfile {
    const totalInteractions = interactions.length
    
    // Calculate resource type preferences
    const resourceTypeCounts = interactions.reduce((acc, interaction) => {
      const resourceType = (interaction as any).resources?.resource_type || 'unknown'
      acc[resourceType] = (acc[resourceType] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const preferredResourceTypes = Object.entries(resourceTypeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)

    // Calculate interaction patterns
    const viewCount = interactions.filter(i => i.interaction_type === 'view').length
    const downloadCount = interactions.filter(i => i.interaction_type === 'download').length
    const bookmarkCount = interactions.filter(i => i.interaction_type === 'bookmark').length
    const shareCount = interactions.filter(i => i.interaction_type === 'share').length
    const searchClickCount = interactions.filter(i => i.interaction_type === 'search_click').length

    const interactionPatterns = {
      viewToDownloadRate: viewCount > 0 ? downloadCount / viewCount : 0,
      bookmarkRate: totalInteractions > 0 ? bookmarkCount / totalInteractions : 0,
      shareRate: totalInteractions > 0 ? shareCount / totalInteractions : 0,
      searchClickThroughRate: searchClickCount > 0 ? downloadCount / searchClickCount : 0
    }

    // Calculate engagement score (0-100)
    const engagementScore = Math.min(100, 
      (totalInteractions * 2) + 
      (downloadCount * 5) + 
      (bookmarkCount * 3) + 
      (shareCount * 4)
    )

    // Calculate average session duration from view interactions
    const viewInteractions = interactions.filter(i => i.interaction_type === 'view')
    const totalViewDuration = viewInteractions.reduce((sum, interaction) => {
      return sum + (interaction.interaction_data?.viewDuration || 0)
    }, 0)
    const averageSessionDuration = viewInteractions.length > 0 ? 
      totalViewDuration / viewInteractions.length : 0

    // Find most active time of day
    const hourCounts = interactions.reduce((acc, interaction) => {
      const hour = new Date(interaction.created_at).getHours()
      acc[hour] = (acc[hour] || 0) + 1
      return acc
    }, {} as Record<number, number>)

    const mostActiveTimeOfDay = Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 12

    const lastActiveDate = interactions.length > 0 ? 
      interactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at :
      new Date().toISOString()

    return {
      userId,
      totalInteractions,
      preferredResourceTypes,
      averageSessionDuration,
      mostActiveTimeOfDay: parseInt(mostActiveTimeOfDay.toString()),
      engagementScore,
      lastActiveDate,
      interactionPatterns
    }
  }

  private calculateInteractionAnalytics(interactions: any[]): InteractionAnalytics {
    const totalInteractions = interactions.length
    const uniqueUsers = new Set(interactions.map(i => i.user_id)).size

    // Count interactions by type
    const interactionsByType = interactions.reduce((acc, interaction) => {
      acc[interaction.interaction_type] = (acc[interaction.interaction_type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Calculate average engagement time from view interactions
    const viewInteractions = interactions.filter(i => i.interaction_type === 'view')
    const totalEngagementTime = viewInteractions.reduce((sum, interaction) => {
      return sum + (interaction.interaction_data?.viewDuration || 0)
    }, 0)
    const averageEngagementTime = viewInteractions.length > 0 ? 
      totalEngagementTime / viewInteractions.length : 0

    // Get top resources
    const resourceInteractionCounts = interactions.reduce((acc, interaction) => {
      const resourceId = interaction.resource_id
      if (!acc[resourceId]) {
        acc[resourceId] = {
          resourceId,
          title: interaction.resources?.title || 'Unknown',
          interactions: 0,
          uniqueUsers: new Set()
        }
      }
      acc[resourceId].interactions++
      acc[resourceId].uniqueUsers.add(interaction.user_id)
      return acc
    }, {} as Record<string, any>)

    const topResources = Object.values(resourceInteractionCounts)
      .map((resource: any) => ({
        resourceId: resource.resourceId,
        title: resource.title,
        interactions: resource.interactions,
        uniqueUsers: resource.uniqueUsers.size
      }))
      .sort((a, b) => b.interactions - a.interactions)
      .slice(0, 10)

    // Calculate daily trends
    const dailyInteractions = interactions.reduce((acc, interaction) => {
      const date = new Date(interaction.created_at).toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = { interactions: 0, uniqueUsers: new Set() }
      }
      acc[date].interactions++
      acc[date].uniqueUsers.add(interaction.user_id)
      return acc
    }, {} as Record<string, { interactions: number; uniqueUsers: Set<string> }>)

    const userEngagementTrends = Object.entries(dailyInteractions)
      .map(([date, data]) => ({
        date,
        interactions: (data as any).interactions,
        uniqueUsers: (data as any).uniqueUsers.size
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return {
      totalInteractions,
      uniqueUsers,
      interactionsByType,
      averageEngagementTime,
      topResources,
      userEngagementTrends
    }
  }

  private getEmptyAnalytics(): InteractionAnalytics {
    return {
      totalInteractions: 0,
      uniqueUsers: 0,
      interactionsByType: {},
      averageEngagementTime: 0,
      topResources: [],
      userEngagementTrends: []
    }
  }
}

// Export singleton instance
export const userInteractionTrackingService = new UserInteractionTrackingService()
