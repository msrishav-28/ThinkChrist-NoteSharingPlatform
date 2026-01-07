import { createClient } from '@/lib/supabase/client'
import type { Resource, User, UserInteraction } from '@/types'
import { DatabaseUtils } from '@/lib/database-utils'
import { searchCache } from './cache/search-cache'
import { logger } from '@/lib/logger'

export interface RecommendationScore {
  resourceId: string
  score: number
  reason: 'collaborative_filtering' | 'content_based' | 'popularity' | 'department_match' | 'course_match'
  metadata?: Record<string, any>
}

export interface RecommendationResult {
  resource: Resource
  score: number
  reasons: string[]
}

export interface UserSimilarity {
  userId: string
  similarity: number
  commonInteractions: number
}

export class RecommendationEngine {
  private _supabase: ReturnType<typeof createClient> | null = null

  private get supabase() {
    if (!this._supabase) {
      this._supabase = createClient()
    }
    return this._supabase
  }

  /**
   * Get personalized recommendations for a user
   */
  async getRecommendations(
    userId: string,
    limit: number = 10,
    excludeInteracted: boolean = true,
    useCache: boolean = true
  ): Promise<RecommendationResult[]> {
    try {
      // Check cache first
      if (useCache) {
        const cached = await searchCache.getRecommendations(userId, 'general')
        if (cached) {
          return cached.slice(0, limit) as unknown as RecommendationResult[]
        }
      }

      // Get user profile and preferences
      const user = await this.getUserProfile(userId)
      if (!user) return []

      // Get user interactions for collaborative filtering
      const userInteractions = await this.getUserInteractions(userId)

      // Calculate different recommendation scores with optimized queries
      const [
        collaborativeScores,
        contentBasedScores,
        popularityScores,
        departmentScores
      ] = await Promise.all([
        this.getCollaborativeFilteringScores(userId, userInteractions),
        this.getContentBasedScores(userId, user),
        this.getPopularityScores(user.department, user.semester),
        this.getDepartmentBasedScores(user.department, (user as any).course || '')
      ])

      // Combine and weight scores
      const combinedScores = this.combineScores([
        { scores: collaborativeScores, weight: 0.4 },
        { scores: contentBasedScores, weight: 0.3 },
        { scores: popularityScores, weight: 0.2 },
        { scores: departmentScores, weight: 0.1 }
      ])

      // Filter out already interacted resources if requested
      let filteredScores = combinedScores
      if (excludeInteracted) {
        const interactedResourceIds = new Set(userInteractions.map(i => i.resource_id))
        filteredScores = combinedScores.filter(score =>
          !interactedResourceIds.has(score.resourceId)
        )
      }

      // Get top recommendations with resource details
      const topScores = filteredScores
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)

      const recommendations = await this.enrichWithResourceDetails(topScores)

      // Cache the results
      if (useCache && recommendations.length > 0) {
        try {
          await searchCache.setRecommendations(userId, recommendations as unknown as Resource[], 'general')
        } catch (cacheError) {
          logger.warn('Failed to cache recommendations', { error: cacheError })
        }
      }

      return recommendations

    } catch (error) {
      logger.error('Error generating recommendations', { error })
      return []
    }
  }

  /**
   * Collaborative filtering based on user interactions
   */
  private async getCollaborativeFilteringScores(
    userId: string,
    userInteractions: UserInteraction[]
  ): Promise<RecommendationScore[]> {
    if (userInteractions.length === 0) return []

    // Find similar users based on interaction patterns
    const similarUsers = await this.findSimilarUsers(userId, userInteractions)

    if (similarUsers.length === 0) return []

    // Get resources that similar users interacted with
    const { data: similarUserInteractions } = await this.supabase
      .from('user_interactions')
      .select('resource_id, interaction_type, user_id')
      .in('user_id', similarUsers.map(u => u.userId))
      .in('interaction_type', ['view', 'download', 'bookmark'])

    if (!similarUserInteractions) return []

    // Calculate recommendation scores based on similar user preferences
    const resourceScores = new Map<string, number>()

    similarUserInteractions.forEach(interaction => {
      const similarUser = similarUsers.find(u => u.userId === interaction.user_id)
      if (!similarUser) return

      const currentScore = resourceScores.get(interaction.resource_id) || 0
      const interactionWeight = this.getInteractionWeight(interaction.interaction_type)
      const similarityWeight = similarUser.similarity

      resourceScores.set(
        interaction.resource_id,
        currentScore + (interactionWeight * similarityWeight)
      )
    })

    return Array.from(resourceScores.entries()).map(([resourceId, score]) => ({
      resourceId,
      score,
      reason: 'collaborative_filtering' as const,
      metadata: { similarUsersCount: similarUsers.length }
    }))
  }

  /**
   * Content-based recommendations based on user's interaction history
   */
  private async getContentBasedScores(
    userId: string,
    user: User
  ): Promise<RecommendationScore[]> {
    // Get user's interaction history to understand preferences
    const { data: interactions } = await this.supabase
      .from('user_interactions')
      .select(`
        resource_id,
        interaction_type,
        resources (
          tags,
          resource_type,
          difficulty_level,
          subject,
          topic
        )
      `)
      .eq('user_id', userId)
      .in('interaction_type', ['view', 'download', 'bookmark'])

    if (!interactions || interactions.length === 0) return []

    // Analyze user preferences
    const preferences = this.analyzeUserPreferences(interactions)

    // Find resources matching user preferences
    const { data: candidateResources } = await this.supabase
      .from('resources')
      .select('id, tags, resource_type, difficulty_level, subject, topic')
      .neq('uploaded_by', userId) // Exclude user's own resources

    if (!candidateResources) return []

    return candidateResources.map(resource => {
      const score = this.calculateContentSimilarity(resource, preferences)
      return {
        resourceId: resource.id,
        score,
        reason: 'content_based' as const,
        metadata: { matchedPreferences: preferences }
      }
    }).filter(score => score.score > 0)
  }

  /**
   * Popularity-based recommendations
   */
  private async getPopularityScores(
    department: string,
    semester: number
  ): Promise<RecommendationScore[]> {
    const { data: popularResources } = await this.supabase
      .from('resources')
      .select('id, upvotes, downloads, views, created_at')
      .eq('department', department)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
      .order('upvotes', { ascending: false })
      .limit(50)

    if (!popularResources) return []

    return popularResources.map(resource => {
      // Calculate popularity score based on engagement metrics
      const ageInDays = Math.max(1, (Date.now() - new Date(resource.created_at).getTime()) / (24 * 60 * 60 * 1000))
      const engagementScore = (resource.upvotes * 3 + resource.downloads * 2 + resource.views) / ageInDays

      return {
        resourceId: resource.id,
        score: Math.min(1, engagementScore / 100), // Normalize to 0-1
        reason: 'popularity' as const,
        metadata: {
          upvotes: resource.upvotes,
          downloads: resource.downloads,
          views: resource.views
        }
      }
    })
  }

  /**
   * Department and course-based recommendations
   */
  private async getDepartmentBasedScores(
    department: string,
    course: string
  ): Promise<RecommendationScore[]> {
    const { data: departmentResources } = await this.supabase
      .from('resources')
      .select('id, department, course, semester')
      .eq('department', department)
      .limit(100)

    if (!departmentResources) return []

    return departmentResources.map(resource => {
      let score = 0.3 // Base score for same department

      if (resource.course === course) {
        score += 0.4 // Bonus for same course
      }

      return {
        resourceId: resource.id,
        score,
        reason: 'department_match' as const,
        metadata: { department: resource.department, course: resource.course }
      }
    })
  }

  /**
   * Find users with similar interaction patterns
   */
  private async findSimilarUsers(
    userId: string,
    userInteractions: UserInteraction[]
  ): Promise<UserSimilarity[]> {
    const userResourceIds = new Set(userInteractions.map(i => i.resource_id))

    // Get interactions from other users on the same resources
    const { data: otherUserInteractions } = await this.supabase
      .from('user_interactions')
      .select('user_id, resource_id, interaction_type')
      .in('resource_id', Array.from(userResourceIds))
      .neq('user_id', userId)

    if (!otherUserInteractions) return []

    // Calculate similarity scores
    const userSimilarities = new Map<string, { common: number, total: Set<string> }>()

    otherUserInteractions.forEach(interaction => {
      const existing = userSimilarities.get(interaction.user_id) || {
        common: 0,
        total: new Set()
      }

      if (userResourceIds.has(interaction.resource_id)) {
        existing.common++
      }
      existing.total.add(interaction.resource_id)

      userSimilarities.set(interaction.user_id, existing)
    })

    // Calculate Jaccard similarity and return top similar users
    return Array.from(userSimilarities.entries())
      .map(([otherUserId, data]) => {
        const intersection = data.common
        const union = userResourceIds.size + data.total.size - intersection
        const similarity = union > 0 ? intersection / union : 0

        return {
          userId: otherUserId,
          similarity,
          commonInteractions: intersection
        }
      })
      .filter(user => user.similarity > 0.1 && user.commonInteractions >= 2)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10)
  }

  /**
   * Analyze user preferences from interaction history
   */
  private analyzeUserPreferences(interactions: any[]) {
    const tagCounts = new Map<string, number>()
    const typeCounts = new Map<string, number>()
    const difficultyCounts = new Map<string, number>()
    const subjectCounts = new Map<string, number>()

    interactions.forEach(interaction => {
      const resource = interaction.resources
      if (!resource) return

      // Count tags
      resource.tags?.forEach((tag: string) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
      })

      // Count resource types
      if (resource.resource_type) {
        typeCounts.set(resource.resource_type, (typeCounts.get(resource.resource_type) || 0) + 1)
      }

      // Count difficulty levels
      if (resource.difficulty_level) {
        difficultyCounts.set(resource.difficulty_level, (difficultyCounts.get(resource.difficulty_level) || 0) + 1)
      }

      // Count subjects
      if (resource.subject) {
        subjectCounts.set(resource.subject, (subjectCounts.get(resource.subject) || 0) + 1)
      }
    })

    return {
      preferredTags: Array.from(tagCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10),
      preferredTypes: Array.from(typeCounts.entries()).sort((a, b) => b[1] - a[1]),
      preferredDifficulty: Array.from(difficultyCounts.entries()).sort((a, b) => b[1] - a[1]),
      preferredSubjects: Array.from(subjectCounts.entries()).sort((a, b) => b[1] - a[1])
    }
  }

  /**
   * Calculate content similarity score
   */
  private calculateContentSimilarity(resource: any, preferences: any): number {
    let score = 0

    // Tag similarity
    const resourceTags = new Set(resource.tags || [])
    const preferredTags = new Set(preferences.preferredTags.map((t: any) => t[0]))
    const tagIntersection = new Set(Array.from(resourceTags).filter(tag => preferredTags.has(tag)))
    const tagUnion = new Set([...Array.from(resourceTags), ...Array.from(preferredTags)])

    if (tagUnion.size > 0) {
      score += (tagIntersection.size / tagUnion.size) * 0.4
    }

    // Resource type match
    const preferredType = preferences.preferredTypes[0]?.[0]
    if (preferredType && resource.resource_type === preferredType) {
      score += 0.3
    }

    // Difficulty level match
    const preferredDifficulty = preferences.preferredDifficulty[0]?.[0]
    if (preferredDifficulty && resource.difficulty_level === preferredDifficulty) {
      score += 0.2
    }

    // Subject match
    const preferredSubject = preferences.preferredSubjects[0]?.[0]
    if (preferredSubject && resource.subject === preferredSubject) {
      score += 0.1
    }

    return score
  }

  /**
   * Combine multiple recommendation scores with weights
   */
  private combineScores(
    scoreSets: Array<{ scores: RecommendationScore[], weight: number }>
  ): RecommendationScore[] {
    const combinedScores = new Map<string, { score: number, reasons: string[] }>()

    scoreSets.forEach(({ scores, weight }) => {
      scores.forEach(scoreItem => {
        const existing = combinedScores.get(scoreItem.resourceId) || { score: 0, reasons: [] }
        existing.score += scoreItem.score * weight
        existing.reasons.push(scoreItem.reason)
        combinedScores.set(scoreItem.resourceId, existing)
      })
    })

    return Array.from(combinedScores.entries()).map(([resourceId, data]) => ({
      resourceId,
      score: data.score,
      reason: 'collaborative_filtering' as const, // Primary reason
      metadata: { reasons: data.reasons }
    }))
  }

  /**
   * Enrich recommendation scores with full resource details
   */
  private async enrichWithResourceDetails(
    scores: RecommendationScore[]
  ): Promise<RecommendationResult[]> {
    if (scores.length === 0) return []

    const resourceIds = scores.map(s => s.resourceId)
    const { data: resources } = await this.supabase
      .from('resources')
      .select(`
        *,
        uploader:uploaded_by(full_name, department)
      `)
      .in('id', resourceIds)

    if (!resources) return []

    return scores
      .map(score => {
        const resource = resources.find(r => r.id === score.resourceId)
        if (!resource) return null

        return {
          resource,
          score: score.score,
          reasons: score.metadata?.reasons || [score.reason]
        }
      })
      .filter((item): item is RecommendationResult => item !== null)
  }

  /**
   * Get user profile information
   */
  private async getUserProfile(userId: string): Promise<User | null> {
    const { data: user } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    return user
  }

  /**
   * Get user interactions
   */
  private async getUserInteractions(userId: string): Promise<UserInteraction[]> {
    const { data: interactions } = await this.supabase
      .from('user_interactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100)

    return interactions || []
  }

  /**
   * Get interaction weight for scoring
   */
  private getInteractionWeight(interactionType: string): number {
    const weights = {
      'bookmark': 1.0,
      'download': 0.8,
      'view': 0.3,
      'share': 0.6,
      'preview_click': 0.2,
      'search_click': 0.4
    }
    return weights[interactionType as keyof typeof weights] || 0.1
  }

  /**
   * Track user interaction for future recommendations
   */
  async trackInteraction(
    userId: string,
    resourceId: string,
    interactionType: UserInteraction['interaction_type'],
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      await DatabaseUtils.trackUserInteraction(userId, resourceId, interactionType, metadata)

      // Invalidate user's recommendation cache when they interact with content
      await searchCache.invalidateUserRecommendations(userId)
    } catch (error) {
      logger.error('Error tracking interaction', { error })
    }
  }

  /**
   * Batch generate recommendations for multiple users (for precomputation)
   */
  async batchGenerateRecommendations(
    userIds: string[],
    limit: number = 10
  ): Promise<Map<string, RecommendationResult[]>> {
    const results = new Map<string, RecommendationResult[]>()

    // Process in batches to avoid overwhelming the database
    const batchSize = 10
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize)

      const batchResults = await Promise.allSettled(
        batch.map(async (userId) => {
          const recommendations = await this.getRecommendations(userId, limit, true, false)
          return { userId, recommendations }
        })
      )

      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.set(result.value.userId, result.value.recommendations)
        }
      })
    }

    return results
  }

  /**
   * Get cached recommendations or generate if not available
   */
  async getCachedRecommendations(
    userId: string,
    limit: number = 10
  ): Promise<RecommendationResult[]> {
    // Try cache first
    const cached = await searchCache.getRecommendations(userId, 'general')
    if (cached) {
      return cached.slice(0, limit) as unknown as RecommendationResult[]
    }

    // Generate if not cached
    return await this.getRecommendations(userId, limit, true, true)
  }

  /**
   * Precompute recommendations for active users
   */
  async precomputeRecommendations(): Promise<void> {
    try {
      // Get active users (users who have interacted in the last 30 days)
      const { data: activeUsers } = await this.supabase
        .from('user_interactions')
        .select('user_id')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .limit(100) // Limit to most active users

      if (!activeUsers) return

      const userIds = Array.from(new Set(activeUsers.map(u => u.user_id)))

      // Generate recommendations in batches
      await this.batchGenerateRecommendations(userIds, 20)

      logger.debug(`Precomputed recommendations for ${userIds.length} active users`)
    } catch (error) {
      logger.error('Error precomputing recommendations', { error })
    }
  }

  /**
   * Get recommendation performance metrics
   */
  async getRecommendationMetrics(userId?: string): Promise<{
    cacheHitRate: number
    averageGenerationTime: number
    totalRecommendations: number
  }> {
    // This would require tracking metrics over time
    // For now, return basic cache metrics
    const cacheMetrics = await searchCache.getPerformanceMetrics()

    return {
      cacheHitRate: cacheMetrics.recommendations.hitRate,
      averageGenerationTime: 0, // Would need to track timing
      totalRecommendations: cacheMetrics.recommendations.size
    }
  }

  /**
   * Optimize recommendation algorithm based on user feedback
   */
  async optimizeRecommendations(
    userId: string,
    feedback: Array<{
      resourceId: string
      rating: number // 1-5 scale
      reason?: string
    }>
  ): Promise<void> {
    try {
      // Store feedback for future algorithm improvements
      await Promise.all(
        feedback.map(item =>
          DatabaseUtils.trackUserInteraction(
            userId,
            item.resourceId,
            'view',
            { rating: item.rating, reason: item.reason }
          )
        )
      )

      // Invalidate cache to force regeneration with new feedback
      await searchCache.invalidateUserRecommendations(userId)
    } catch (error) {
      logger.error('Error optimizing recommendations', { error })
    }
  }
}
