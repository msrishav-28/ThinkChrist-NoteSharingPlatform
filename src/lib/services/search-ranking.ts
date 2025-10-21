import { createClient } from '@/lib/supabase/client'
import type { Resource, SearchFilters } from '@/types'
import { searchAnalyticsService } from './search-analytics'

export interface RankingFactors {
  relevanceScore: number
  popularityScore: number
  qualityScore: number
  recencyScore: number
  personalizedScore: number
  clickThroughScore: number
}

export interface RankedResource extends Resource {
  rankingScore: number
  rankingFactors: RankingFactors
}

export class SearchRankingService {
  private _supabase: ReturnType<typeof createClient> | null = null

  private get supabase() {
    if (!this._supabase) {
      this._supabase = createClient()
    }
    return this._supabase
  }

  private isSupabaseAvailable(): boolean {
    return this.supabase && typeof this.supabase.from === 'function'
  }

  /**
   * Rank search results using multiple factors including analytics data
   */
  async rankSearchResults(
    resources: Resource[],
    query: string,
    userId?: string,
    filters: SearchFilters = {}
  ): Promise<RankedResource[]> {
    if (resources.length === 0) return []

    if (!this.isSupabaseAvailable()) {
      // Return resources with default ranking when Supabase is not available
      return resources.map(resource => ({
        ...resource,
        rankingScore: 0.5,
        rankingFactors: {
          relevanceScore: 0.5,
          popularityScore: 0.5,
          qualityScore: 0.5,
          recencyScore: 0.5,
          personalizedScore: 0.5,
          clickThroughScore: 0.5
        }
      }))
    }

    try {
      // Get analytics data for ranking
      const [
        clickThroughData,
        userInteractions,
        popularityData
      ] = await Promise.all([
        this.getClickThroughData(resources.map(r => r.id), query),
        userId ? this.getUserInteractionData(userId, resources.map(r => r.id)) : Promise.resolve({}),
        this.getPopularityData(resources.map(r => r.id))
      ])

      // Calculate ranking scores for each resource
      const rankedResources: RankedResource[] = resources.map(resource => {
        const rankingFactors = this.calculateRankingFactors(
          resource,
          query,
          clickThroughData[resource.id] || { clicks: 0, impressions: 0, avgPosition: 0 },
          (userInteractions as any)[resource.id] || { views: 0, downloads: 0, bookmarks: 0 },
          (popularityData as any)[resource.id] || { totalViews: 0, totalDownloads: 0, avgRating: 0 }
        )

        const rankingScore = this.calculateFinalScore(rankingFactors)

        return {
          ...resource,
          rankingScore,
          rankingFactors
        }
      })

      // Sort by ranking score (highest first)
      return rankedResources.sort((a, b) => b.rankingScore - a.rankingScore)
    } catch (error) {
      console.error('Error ranking search results:', error)
      // Return original resources with default ranking
      return resources.map(resource => ({
        ...resource,
        rankingScore: 0.5,
        rankingFactors: {
          relevanceScore: 0.5,
          popularityScore: 0.5,
          qualityScore: 0.5,
          recencyScore: 0.5,
          personalizedScore: 0.5,
          clickThroughScore: 0.5
        }
      }))
    }
  }

  /**
   * Get personalized search results based on user behavior
   */
  async getPersonalizedResults(
    resources: Resource[],
    userId: string,
    limit: number = 20
  ): Promise<RankedResource[]> {
    try {
      // Get user's interaction history
      const { data: userHistory } = await this.supabase
        .from('user_interactions')
        .select('resource_id, interaction_type, interaction_data')
        .eq('user_id', userId)
        .in('interaction_type', ['view', 'download', 'bookmark', 'search_click'])
        .order('created_at', { ascending: false })
        .limit(100)

      if (!userHistory) return resources.slice(0, limit) as RankedResource[]

      // Analyze user preferences
      const userPreferences = this.analyzeUserPreferences(userHistory)

      // Score resources based on user preferences
      const personalizedResources = resources.map(resource => {
        const personalizedScore = this.calculatePersonalizationScore(resource, userPreferences)
        
        return {
          ...resource,
          rankingScore: personalizedScore,
          rankingFactors: {
            relevanceScore: 0.5,
            popularityScore: 0.3,
            qualityScore: 0.4,
            recencyScore: 0.3,
            personalizedScore: personalizedScore,
            clickThroughScore: 0.3
          }
        }
      })

      return personalizedResources
        .sort((a, b) => b.rankingScore - a.rankingScore)
        .slice(0, limit)
    } catch (error) {
      console.error('Error getting personalized results:', error)
      return resources.slice(0, limit) as RankedResource[]
    }
  }

  /**
   * Boost search results based on trending content
   */
  async applyTrendingBoost(
    rankedResources: RankedResource[],
    timeWindow: number = 7 // days
  ): Promise<RankedResource[]> {
    if (!this.isSupabaseAvailable()) return rankedResources

    try {
      const cutoffDate = new Date(Date.now() - timeWindow * 24 * 60 * 60 * 1000).toISOString()

      // Get trending resources (high interaction in recent time window)
      const { data: trendingData } = await this.supabase
        .from('user_interactions')
        .select('resource_id, interaction_type')
        .gte('created_at', cutoffDate)
        .in('resource_id', rankedResources.map(r => r.id))

      if (!trendingData) return rankedResources

      // Calculate trending scores
      const trendingScores = trendingData.reduce((acc, interaction) => {
        if (!acc[interaction.resource_id]) {
          acc[interaction.resource_id] = { views: 0, downloads: 0, total: 0 }
        }
        
        acc[interaction.resource_id].total++
        if (interaction.interaction_type === 'view') {
          acc[interaction.resource_id].views++
        } else if (interaction.interaction_type === 'download') {
          acc[interaction.resource_id].downloads++
        }
        
        return acc
      }, {} as Record<string, { views: number; downloads: number; total: number }>)

      // Apply trending boost
      return rankedResources.map(resource => {
        const trendingData = trendingScores[resource.id]
        if (!trendingData) return resource

        // Calculate trending boost (0.0 to 0.2 additional score)
        const trendingBoost = Math.min(
          (trendingData.total * 0.01) + (trendingData.downloads * 0.02),
          0.2
        )

        return {
          ...resource,
          rankingScore: resource.rankingScore + trendingBoost,
          rankingFactors: {
            ...resource.rankingFactors,
            popularityScore: resource.rankingFactors.popularityScore + trendingBoost
          }
        }
      }).sort((a, b) => b.rankingScore - a.rankingScore)
    } catch (error) {
      console.error('Error applying trending boost:', error)
      return rankedResources
    }
  }

  // Private helper methods

  private async getClickThroughData(
    resourceIds: string[],
    query: string
  ): Promise<Record<string, { clicks: number; impressions: number; avgPosition: number }>> {
    if (!this.isSupabaseAvailable()) return {}

    try {
      const { data: analytics } = await this.supabase
        .from('search_analytics')
        .select('clicked_results, results_count')
        .eq('query', query)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days

      if (!analytics) return {}

      const clickData: Record<string, { clicks: number; impressions: number; positions: number[] }> = {}

      analytics.forEach(search => {
        // Count impressions (each search is an impression for all results)
        resourceIds.forEach(resourceId => {
          if (!clickData[resourceId]) {
            clickData[resourceId] = { clicks: 0, impressions: 0, positions: [] }
          }
          clickData[resourceId].impressions++
        })

        // Count clicks and positions
        search.clicked_results?.forEach((click: any) => {
          const [resourceId, position] = click.split(':')
          if (resourceIds.includes(resourceId)) {
            if (!clickData[resourceId]) {
              clickData[resourceId] = { clicks: 0, impressions: 0, positions: [] }
            }
            clickData[resourceId].clicks++
            clickData[resourceId].positions.push(parseInt(position) || 0)
          }
        })
      })

      // Calculate average positions
      return Object.entries(clickData).reduce((acc, [resourceId, data]) => {
        acc[resourceId] = {
          clicks: data.clicks,
          impressions: data.impressions,
          avgPosition: data.positions.length > 0 
            ? data.positions.reduce((sum, pos) => sum + pos, 0) / data.positions.length
            : 0
        }
        return acc
      }, {} as Record<string, { clicks: number; impressions: number; avgPosition: number }>)
    } catch (error) {
      console.error('Error getting click-through data:', error)
      return {}
    }
  }

  private async getUserInteractionData(
    userId: string,
    resourceIds: string[]
  ): Promise<Record<string, { views: number; downloads: number; bookmarks: number }>> {
    if (!this.isSupabaseAvailable()) return {}

    try {
      const { data: interactions } = await this.supabase
        .from('user_interactions')
        .select('resource_id, interaction_type')
        .eq('user_id', userId)
        .in('resource_id', resourceIds)

      if (!interactions) return {}

      return interactions.reduce((acc, interaction) => {
        if (!acc[interaction.resource_id]) {
          acc[interaction.resource_id] = { views: 0, downloads: 0, bookmarks: 0 }
        }

        switch (interaction.interaction_type) {
          case 'view':
            acc[interaction.resource_id].views++
            break
          case 'download':
            acc[interaction.resource_id].downloads++
            break
          case 'bookmark':
            acc[interaction.resource_id].bookmarks++
            break
        }

        return acc
      }, {} as Record<string, { views: number; downloads: number; bookmarks: number }>)
    } catch (error) {
      console.error('Error getting user interaction data:', error)
      return {}
    }
  }

  private async getPopularityData(
    resourceIds: string[]
  ): Promise<Record<string, { totalViews: number; totalDownloads: number; avgRating: number }>> {
    if (!this.isSupabaseAvailable()) return {}

    try {
      // Get aggregated popularity data from resources table
      const { data: resources } = await this.supabase
        .from('resources')
        .select('id, views, downloads, upvotes, downvotes')
        .in('id', resourceIds)

      if (!resources) return {}

      return resources.reduce((acc, resource) => {
        const totalVotes = resource.upvotes + resource.downvotes
        const avgRating = totalVotes > 0 ? resource.upvotes / totalVotes : 0.5

        acc[resource.id] = {
          totalViews: resource.views || 0,
          totalDownloads: resource.downloads || 0,
          avgRating
        }
        return acc
      }, {} as Record<string, { totalViews: number; totalDownloads: number; avgRating: number }>)
    } catch (error) {
      console.error('Error getting popularity data:', error)
      return {}
    }
  }

  private calculateRankingFactors(
    resource: Resource,
    query: string,
    clickThroughData: { clicks: number; impressions: number; avgPosition: number },
    userInteractions: { views: number; downloads: number; bookmarks: number },
    popularityData: { totalViews: number; totalDownloads: number; avgRating: number }
  ): RankingFactors {
    // Relevance score based on text matching
    const relevanceScore = this.calculateRelevanceScore(resource, query)

    // Popularity score based on overall engagement
    const popularityScore = this.calculatePopularityScore(popularityData)

    // Quality score based on ratings and verification
    const qualityScore = this.calculateQualityScore(resource, popularityData.avgRating)

    // Recency score based on creation date
    const recencyScore = this.calculateRecencyScore(resource.created_at)

    // Personalized score based on user interactions
    const personalizedScore = this.calculatePersonalizedScore(userInteractions)

    // Click-through score based on search analytics
    const clickThroughScore = this.calculateClickThroughScore(clickThroughData)

    return {
      relevanceScore,
      popularityScore,
      qualityScore,
      recencyScore,
      personalizedScore,
      clickThroughScore
    }
  }

  private calculateRelevanceScore(resource: Resource, query: string): number {
    if (!query.trim()) return 0.5

    const queryTerms = query.toLowerCase().split(/\s+/)
    const title = (resource.title || '').toLowerCase()
    const description = (resource.description || '').toLowerCase()
    const tags = (resource.tags || []).join(' ').toLowerCase()
    const subject = (resource.subject || '').toLowerCase()

    let score = 0
    let maxScore = queryTerms.length * 4 // Max points per term across all fields

    queryTerms.forEach(term => {
      // Title matches (highest weight)
      if (title.includes(term)) score += 2
      
      // Description matches
      if (description.includes(term)) score += 1
      
      // Tag matches
      if (tags.includes(term)) score += 1.5
      
      // Subject matches
      if (subject.includes(term)) score += 1
    })

    return Math.min(score / maxScore, 1)
  }

  private calculatePopularityScore(popularityData: { totalViews: number; totalDownloads: number; avgRating: number }): number {
    const viewScore = Math.min(popularityData.totalViews / 100, 1) * 0.3
    const downloadScore = Math.min(popularityData.totalDownloads / 50, 1) * 0.4
    const ratingScore = popularityData.avgRating * 0.3

    return viewScore + downloadScore + ratingScore
  }

  private calculateQualityScore(resource: Resource, avgRating: number): number {
    let score = avgRating * 0.6 // Base rating score

    // Verification bonus
    if (resource.is_verified) score += 0.2

    // Content completeness bonus
    if (resource.description && resource.description.length > 50) score += 0.1
    if (resource.tags && resource.tags.length > 0) score += 0.1

    return Math.min(score, 1)
  }

  private calculateRecencyScore(createdAt: string): number {
    const now = Date.now()
    const created = new Date(createdAt).getTime()
    const daysSinceCreation = (now - created) / (1000 * 60 * 60 * 24)

    // Decay function: newer content gets higher score
    if (daysSinceCreation <= 7) return 1.0
    if (daysSinceCreation <= 30) return 0.8
    if (daysSinceCreation <= 90) return 0.6
    if (daysSinceCreation <= 365) return 0.4
    return 0.2
  }

  private calculatePersonalizedScore(userInteractions: { views: number; downloads: number; bookmarks: number }): number {
    const viewScore = Math.min(userInteractions.views * 0.1, 0.3)
    const downloadScore = Math.min(userInteractions.downloads * 0.2, 0.4)
    const bookmarkScore = Math.min(userInteractions.bookmarks * 0.3, 0.3)

    return viewScore + downloadScore + bookmarkScore
  }

  private calculateClickThroughScore(clickThroughData: { clicks: number; impressions: number; avgPosition: number }): number {
    if (clickThroughData.impressions === 0) return 0.5

    const ctr = clickThroughData.clicks / clickThroughData.impressions
    const positionPenalty = clickThroughData.avgPosition > 0 ? Math.max(0, 1 - (clickThroughData.avgPosition - 1) * 0.1) : 1

    return Math.min(ctr * 2 * positionPenalty, 1)
  }

  private calculateFinalScore(factors: RankingFactors): number {
    // Weighted combination of all factors
    const weights = {
      relevance: 0.25,
      popularity: 0.20,
      quality: 0.15,
      recency: 0.10,
      personalized: 0.15,
      clickThrough: 0.15
    }

    return (
      factors.relevanceScore * weights.relevance +
      factors.popularityScore * weights.popularity +
      factors.qualityScore * weights.quality +
      factors.recencyScore * weights.recency +
      factors.personalizedScore * weights.personalized +
      factors.clickThroughScore * weights.clickThrough
    )
  }

  private analyzeUserPreferences(userHistory: any[]): {
    preferredTypes: Record<string, number>
    preferredDepartments: Record<string, number>
    preferredTags: Record<string, number>
  } {
    const preferences = {
      preferredTypes: {} as Record<string, number>,
      preferredDepartments: {} as Record<string, number>,
      preferredTags: {} as Record<string, number>
    }

    // This would need to be enhanced to actually analyze the resource data
    // For now, return empty preferences
    return preferences
  }

  private calculatePersonalizationScore(resource: Resource, preferences: any): number {
    // Simplified personalization - would need more sophisticated implementation
    return 0.5
  }
}

// Export singleton instance
export const searchRankingService = new SearchRankingService()
