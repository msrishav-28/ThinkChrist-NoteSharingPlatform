import { createClient } from '@/lib/supabase/client'
import type { 
  Resource, 
  SearchFilters, 
  SearchResults,
  UserInteraction 
} from '@/types'
import { DatabaseUtils } from '@/lib/database-utils'
import { searchAnalyticsService } from './search-analytics'
import { searchRankingService, type RankedResource } from './search-ranking'
import { searchCache } from './cache/search-cache'

export interface SearchSuggestion {
  text: string
  type: 'query' | 'tag' | 'course' | 'department'
  count?: number
}

export interface SearchAnalytics {
  query: string
  results_count: number
  clicked_results: string[]
  user_id?: string
  filters_used: SearchFilters
  search_time: number
  created_at: string
}

export class SearchService {
  private _supabase: ReturnType<typeof createClient> | null = null

  private get supabase() {
    if (!this._supabase) {
      this._supabase = createClient()
    }
    return this._supabase
  }

  /**
   * Perform enhanced search with full-text capabilities and filtering
   */
  async search(
    query: string,
    filters: SearchFilters = {},
    options: {
      limit?: number
      offset?: number
      userId?: string
      trackAnalytics?: boolean
      useCache?: boolean
    } = {}
  ): Promise<SearchResults> {
    const { limit = 20, offset = 0, userId, trackAnalytics = true, useCache = true } = options
    const startTime = Date.now()

    try {
      // Check cache first for non-paginated searches
      if (useCache && offset === 0) {
        const cached = await searchCache.getSearchResults(query, filters, userId)
        if (cached) {
          // Apply pagination to cached results if needed
          const paginatedResources = cached.resources.slice(0, limit)
          return {
            ...cached,
            resources: paginatedResources
          }
        }
      }

      // Build the search query
      let queryBuilder = this.supabase
        .from('resources')
        .select(`
          *,
          uploader:uploaded_by(full_name, department, badge_level)
        `)

      // Full-text search across multiple fields
      if (query.trim()) {
        const searchTerms = query.trim().split(/\s+/).map(term => `%${term}%`)
        const searchConditions = searchTerms.map(term => 
          `title.ilike.${term},description.ilike.${term},subject.ilike.${term},topic.ilike.${term}`
        ).join(',')
        queryBuilder = queryBuilder.or(searchConditions)
      }

      // Apply filters
      queryBuilder = this.applyFilters(queryBuilder, filters)

      // Execute search with pagination
      const { data: resources, error } = await queryBuilder
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error

      // Get total count for pagination
      const { count } = await this.getSearchCount(query, filters)

      // Get facets for filtering UI
      const facets = await this.getSearchFacets(query, filters)

      const searchTime = Date.now() - startTime

      // Apply intelligent ranking to results
      let rankedResources: RankedResource[] = []
      if (resources && resources.length > 0) {
        rankedResources = await searchRankingService.rankSearchResults(
          resources,
          query,
          userId,
          filters
        )

        // Apply trending boost for better discovery
        rankedResources = await searchRankingService.applyTrendingBoost(rankedResources)
      }

      const searchResults: SearchResults = {
        resources: rankedResources || [],
        total: count || 0,
        facets: facets || {
          resourceTypes: {},
          departments: {},
          courses: {},
          tags: {},
          difficulty: {}
        }
      }

      // Cache results for future requests (only for first page)
      if (useCache && offset === 0 && searchResults.resources.length > 0) {
        try {
          await searchCache.setSearchResults(query, filters, searchResults, userId)
        } catch (cacheError) {
          console.warn('Failed to cache search results:', cacheError)
        }
      }

      // Track search analytics
      if (trackAnalytics && userId) {
        await searchAnalyticsService.trackSearch({
          query,
          results_count: count || 0,
          clicked_results: [],
          user_id: userId,
          filters_used: filters,
          search_time: searchTime
        })
      }

      return searchResults
    } catch (error) {
      console.error('Search error:', error)
      throw new Error('Search failed. Please try again.')
    }
  }

  /**
   * Get search suggestions based on existing content and analytics
   */
  async getSuggestions(query: string, limit: number = 10): Promise<SearchSuggestion[]> {
    if (!query.trim() || query.length < 2) return []

    const suggestions: SearchSuggestion[] = []

    try {
      // Get analytics-based suggestions (prioritized)
      const analyticsSuggestions = await searchAnalyticsService.getAnalyticsBasedSuggestions(
        query,
        Math.ceil(limit * 0.4) // 40% of suggestions from analytics
      )
      
      suggestions.push(...analyticsSuggestions.map(s => ({
        text: s.query,
        type: 'query' as const,
        count: s.popularity
      })))

      // Get tag suggestions
      const { data: tagData } = await this.supabase
        .rpc('get_popular_tags', { search_term: query.toLowerCase(), result_limit: limit })

      if (tagData) {
        suggestions.push(...tagData.map((tag: any) => ({
          text: tag.tag_name,
          type: 'tag' as const,
          count: tag.usage_count
        })))
      }

      // Get course suggestions
      const { data: courseData } = await this.supabase
        .from('resources')
        .select('course')
        .ilike('course', `%${query}%`)
        .limit(limit)

      if (courseData) {
        const uniqueCourses = Array.from(new Set(courseData.map(r => r.course)))
        suggestions.push(...uniqueCourses.map(course => ({
          text: course,
          type: 'course' as const
        })))
      }

      // Get department suggestions
      const { data: deptData } = await this.supabase
        .from('resources')
        .select('department')
        .ilike('department', `%${query}%`)
        .limit(limit)

      if (deptData) {
        const uniqueDepts = Array.from(new Set(deptData.map(r => r.department)))
        suggestions.push(...uniqueDepts.map(dept => ({
          text: dept,
          type: 'department' as const
        })))
      }

      // Remove duplicates and limit results, prioritizing analytics-based suggestions
      const uniqueSuggestions = suggestions
        .filter((suggestion, index, self) => 
          index === self.findIndex(s => s.text === suggestion.text && s.type === suggestion.type)
        )
        .sort((a, b) => {
          // Prioritize suggestions with count (analytics-based)
          if (a.count && !b.count) return -1
          if (!a.count && b.count) return 1
          if (a.count && b.count) return b.count - a.count
          return 0
        })
        .slice(0, limit)

      return uniqueSuggestions
    } catch (error) {
      console.error('Error getting suggestions:', error)
      return []
    }
  }

  /**
   * Search within a specific collection
   */
  async searchInCollection(
    collectionId: string,
    query: string,
    filters: SearchFilters = {}
  ): Promise<Resource[]> {
    try {
      let queryBuilder = this.supabase
        .from('collection_resources')
        .select(`
          resource:resources(
            *,
            uploader:uploaded_by(full_name, department, badge_level)
          )
        `)
        .eq('collection_id', collectionId)

      // Apply search to the joined resource
      if (query.trim()) {
        const searchTerms = query.trim().split(/\s+/).map(term => `%${term}%`)
        // Note: This is a simplified approach. In production, you might want to use a more sophisticated search
        queryBuilder = queryBuilder.or(
          searchTerms.map(term => 
            `resource.title.ilike.${term},resource.description.ilike.${term}`
          ).join(',')
        )
      }

      const { data, error } = await queryBuilder.order('order_index')

      if (error) throw error

      // Extract resources and apply additional filters
      let resources: Resource[] = data?.map((item: any) => item.resource).filter(Boolean) || []

      // Apply filters manually since we can't easily do it in the query
      resources = this.applyClientSideFilters(resources, filters)

      return resources
    } catch (error) {
      console.error('Collection search error:', error)
      throw new Error('Collection search failed. Please try again.')
    }
  }

  /**
   * Track user interaction with search results
   */
  async trackSearchResultClick(
    userId: string,
    resourceId: string,
    query: string,
    position: number
  ): Promise<void> {
    try {
      // Track the interaction
      await DatabaseUtils.trackUserInteraction(
        userId,
        resourceId,
        'search_click',
        {
          query,
          position,
          timestamp: new Date().toISOString()
        }
      )

      // Update search analytics with click data
      await searchAnalyticsService.updateSearchWithClick(
        userId,
        query,
        resourceId,
        position
      )
    } catch (error) {
      console.error('Error tracking search result click:', error)
      // Don't throw error for analytics tracking failures
    }
  }

  /**
   * Get popular search terms and trends
   */
  async getPopularSearchTerms(limit: number = 10): Promise<SearchSuggestion[]> {
    try {
      return await searchAnalyticsService.getAnalyticsBasedSuggestions('', limit)
        .then(suggestions => suggestions.map(s => ({
          text: s.query,
          type: 'query' as const,
          count: s.popularity
        })))
    } catch (error) {
      console.error('Error getting popular search terms:', error)
      return []
    }
  }

  /**
   * Get personalized search recommendations for a user
   */
  async getPersonalizedRecommendations(
    userId: string,
    limit: number = 10,
    useCache: boolean = true
  ): Promise<RankedResource[]> {
    try {
      // Check cache first
      if (useCache) {
        const cached = await searchCache.getRecommendations(userId, 'personalized')
        if (cached) {
          return cached.slice(0, limit) as RankedResource[]
        }
      }

      // Get recent resources as base set
      const { data: recentResources } = await this.supabase
        .from('resources')
        .select(`
          *,
          uploader:uploaded_by(full_name, department, badge_level)
        `)
        .order('created_at', { ascending: false })
        .limit(100) // Get larger set for personalization

      if (!recentResources) return []

      // Apply personalized ranking
      const personalizedResults = await searchRankingService.getPersonalizedResults(
        recentResources,
        userId,
        limit
      )

      // Cache the results
      if (useCache && personalizedResults.length > 0) {
        try {
          await searchCache.setRecommendations(userId, personalizedResults, 'personalized')
        } catch (cacheError) {
          console.warn('Failed to cache recommendations:', cacheError)
        }
      }

      return personalizedResults
    } catch (error) {
      console.error('Error getting personalized recommendations:', error)
      return []
    }
  }

  /**
   * Get search analytics metrics
   */
  async getSearchMetrics(
    dateRange?: { start: string; end: string },
    userId?: string
  ) {
    return await searchAnalyticsService.getSearchMetrics(dateRange, userId)
  }

  /**
   * Get poor performing queries for optimization
   */
  async getPoorPerformingQueries(limit: number = 10) {
    return await searchAnalyticsService.getPoorPerformingQueries(limit)
  }

  /**
   * Invalidate search cache when content changes
   */
  async invalidateSearchCache(pattern?: {
    department?: string
    course?: string
    resourceType?: string
  }): Promise<void> {
    if (pattern) {
      await searchCache.invalidateSearchPattern(pattern)
    } else {
      await searchCache.clear()
    }
  }

  /**
   * Invalidate user recommendations cache
   */
  async invalidateUserRecommendations(userId: string): Promise<void> {
    await searchCache.invalidateUserRecommendations(userId)
  }

  /**
   * Get search cache performance metrics
   */
  async getSearchCacheMetrics() {
    return await searchCache.getPerformanceMetrics()
  }

  /**
   * Warm search cache with popular queries
   */
  async warmSearchCache(): Promise<void> {
    try {
      // Get popular search terms
      const popularTerms = await this.getPopularSearchTerms(20)
      
      // Pre-execute searches for popular terms
      const warmupSearches = await Promise.allSettled(
        popularTerms.map(async (term) => {
          const results = await this.search(term.text, {}, { 
            useCache: false, 
            trackAnalytics: false 
          })
          return { query: term.text, filters: {}, results }
        })
      )

      // Cache successful results
      const successfulSearches = warmupSearches
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value)

      await searchCache.warmSearchCache(successfulSearches)
    } catch (error) {
      console.warn('Failed to warm search cache:', error)
    }
  }

  /**
   * Optimize search query for better performance
   */
  private optimizeSearchQuery(query: string): string {
    // Remove common stop words and normalize
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'])
    
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .join(' ')
      .trim()
  }

  /**
   * Get search suggestions with caching
   */
  async getCachedSuggestions(query: string, limit: number = 10): Promise<SearchSuggestion[]> {
    const optimizedQuery = this.optimizeSearchQuery(query)
    if (!optimizedQuery) return []

    // Use the existing getSuggestions method but with optimized query
    return await this.getSuggestions(optimizedQuery, limit)
  }

  // Private helper methods

  private applyFilters(queryBuilder: any, filters: SearchFilters) {
    if (filters.resourceTypes?.length) {
      queryBuilder = queryBuilder.in('resource_type', filters.resourceTypes)
    }
    if (filters.departments?.length) {
      queryBuilder = queryBuilder.in('department', filters.departments)
    }
    if (filters.courses?.length) {
      queryBuilder = queryBuilder.in('course', filters.courses)
    }
    if (filters.semesters?.length) {
      queryBuilder = queryBuilder.in('semester', filters.semesters)
    }
    if (filters.tags?.length) {
      queryBuilder = queryBuilder.overlaps('tags', filters.tags)
    }
    if (filters.difficulty?.length) {
      queryBuilder = queryBuilder.in('difficulty_level', filters.difficulty)
    }
    if (filters.dateRange) {
      queryBuilder = queryBuilder
        .gte('created_at', filters.dateRange.start)
        .lte('created_at', filters.dateRange.end)
    }

    return queryBuilder
  }

  private async getSearchCount(query: string, filters: SearchFilters): Promise<{ count: number }> {
    let queryBuilder = this.supabase
      .from('resources')
      .select('*', { count: 'exact', head: true })

    if (query.trim()) {
      const searchTerms = query.trim().split(/\s+/).map(term => `%${term}%`)
      const searchConditions = searchTerms.map(term => 
        `title.ilike.${term},description.ilike.${term},subject.ilike.${term},topic.ilike.${term}`
      ).join(',')
      queryBuilder = queryBuilder.or(searchConditions)
    }

    queryBuilder = this.applyFilters(queryBuilder, filters)

    const { count, error } = await queryBuilder

    if (error) throw error
    return { count: count || 0 }
  }

  private async getSearchFacets(query: string, filters: SearchFilters) {
    // This is a simplified implementation. In production, you might want to use database functions
    // or more sophisticated aggregation queries
    
    try {
      let baseQuery = this.supabase.from('resources').select('resource_type, department, course, tags, difficulty_level')

      if (query.trim()) {
        const searchTerms = query.trim().split(/\s+/).map(term => `%${term}%`)
        const searchConditions = searchTerms.map(term => 
          `title.ilike.${term},description.ilike.${term},subject.ilike.${term},topic.ilike.${term}`
        ).join(',')
        baseQuery = baseQuery.or(searchConditions)
      }

      const { data } = await baseQuery

      if (!data) return {
        resourceTypes: {},
        departments: {},
        courses: {},
        tags: {},
        difficulty: {}
      }

      // Calculate facets
      const facets = {
        resourceTypes: {} as Record<string, number>,
        departments: {} as Record<string, number>,
        courses: {} as Record<string, number>,
        tags: {} as Record<string, number>,
        difficulty: {} as Record<string, number>
      }

      data.forEach(resource => {
        // Resource types
        if (resource.resource_type) {
          facets.resourceTypes[resource.resource_type] = 
            (facets.resourceTypes[resource.resource_type] || 0) + 1
        }

        // Departments
        if (resource.department) {
          facets.departments[resource.department] = 
            (facets.departments[resource.department] || 0) + 1
        }

        // Courses
        if (resource.course) {
          facets.courses[resource.course] = 
            (facets.courses[resource.course] || 0) + 1
        }

        // Tags
        if (resource.tags && Array.isArray(resource.tags)) {
          resource.tags.forEach(tag => {
            facets.tags[tag] = (facets.tags[tag] || 0) + 1
          })
        }

        // Difficulty
        if (resource.difficulty_level) {
          facets.difficulty[resource.difficulty_level] = 
            (facets.difficulty[resource.difficulty_level] || 0) + 1
        }
      })

      return facets
    } catch (error) {
      console.error('Error getting search facets:', error)
      return {
        resourceTypes: {},
        departments: {},
        courses: {},
        tags: {},
        difficulty: {}
      }
    }
  }

  private applyClientSideFilters(resources: Resource[], filters: SearchFilters): Resource[] {
    return resources.filter(resource => {
      if (filters.resourceTypes?.length && !filters.resourceTypes.includes(resource.resource_type)) {
        return false
      }
      if (filters.departments?.length && !filters.departments.includes(resource.department)) {
        return false
      }
      if (filters.courses?.length && !filters.courses.includes(resource.course)) {
        return false
      }
      if (filters.semesters?.length && !filters.semesters.includes(resource.semester)) {
        return false
      }
      if (filters.tags?.length && !filters.tags.some(tag => resource.tags?.includes(tag))) {
        return false
      }
      if (filters.difficulty?.length && resource.difficulty_level && 
          !filters.difficulty.includes(resource.difficulty_level)) {
        return false
      }
      if (filters.dateRange) {
        const resourceDate = new Date(resource.created_at)
        const startDate = new Date(filters.dateRange.start)
        const endDate = new Date(filters.dateRange.end)
        if (resourceDate < startDate || resourceDate > endDate) {
          return false
        }
      }
      return true
    })
  }


}

// Export singleton instance
export const searchService = new SearchService()
