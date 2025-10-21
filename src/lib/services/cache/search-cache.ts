import type { SearchResults, SearchFilters, Resource } from '@/types'
import { MemoryCache, type CacheOptions } from './cache-manager'
import { createHash } from 'crypto'

export interface SearchCacheEntry {
  results: SearchResults
  timestamp: number
  filters: SearchFilters
  query: string
}

export interface RecommendationCacheEntry {
  recommendations: Resource[]
  timestamp: number
  userId: string
}

/**
 * Specialized cache for search results with intelligent cache key generation
 */
export class SearchCache {
  private searchCache: MemoryCache<SearchCacheEntry>
  private recommendationCache: MemoryCache<RecommendationCacheEntry>
  private readonly searchTtl: number
  private readonly recommendationTtl: number

  constructor(options: {
    searchTtl?: number
    recommendationTtl?: number
    maxSearchEntries?: number
    maxRecommendationEntries?: number
  } = {}) {
    const {
      searchTtl = 5 * 60 * 1000, // 5 minutes for search results
      recommendationTtl = 30 * 60 * 1000, // 30 minutes for recommendations
      maxSearchEntries = 1000,
      maxRecommendationEntries = 500
    } = options

    this.searchTtl = searchTtl
    this.recommendationTtl = recommendationTtl

    this.searchCache = new MemoryCache<SearchCacheEntry>({
      ttl: searchTtl,
      maxSize: maxSearchEntries
    })

    this.recommendationCache = new MemoryCache<RecommendationCacheEntry>({
      ttl: recommendationTtl,
      maxSize: maxRecommendationEntries
    })
  }

  /**
   * Generate a cache key for search query and filters
   */
  private generateSearchKey(query: string, filters: SearchFilters, userId?: string): string {
    const normalizedQuery = query.toLowerCase().trim()
    const sortedFilters = this.normalizeFilters(filters)
    const keyData = {
      query: normalizedQuery,
      filters: sortedFilters,
      userId: userId || 'anonymous'
    }
    
    return createHash('md5').update(JSON.stringify(keyData)).digest('hex')
  }

  /**
   * Generate a cache key for user recommendations
   */
  private generateRecommendationKey(userId: string, context?: string): string {
    const keyData = { userId, context: context || 'general' }
    return createHash('md5').update(JSON.stringify(keyData)).digest('hex')
  }

  /**
   * Normalize filters for consistent cache keys
   */
  private normalizeFilters(filters: SearchFilters): SearchFilters {
    return {
      resourceTypes: filters.resourceTypes?.sort(),
      departments: filters.departments?.sort(),
      courses: filters.courses?.sort(),
      semesters: filters.semesters?.sort(),
      tags: filters.tags?.sort(),
      difficulty: filters.difficulty?.sort(),
      dateRange: filters.dateRange
    }
  }

  /**
   * Get cached search results
   */
  async getSearchResults(
    query: string, 
    filters: SearchFilters, 
    userId?: string
  ): Promise<SearchResults | null> {
    const key = this.generateSearchKey(query, filters, userId)
    const cached = await this.searchCache.get(key)
    
    if (cached && this.isSearchCacheValid(cached)) {
      return cached.results
    }
    
    return null
  }

  /**
   * Cache search results
   */
  async setSearchResults(
    query: string, 
    filters: SearchFilters, 
    results: SearchResults, 
    userId?: string
  ): Promise<void> {
    const key = this.generateSearchKey(query, filters, userId)
    const entry: SearchCacheEntry = {
      results,
      timestamp: Date.now(),
      filters,
      query
    }
    
    await this.searchCache.set(key, entry)
  }

  /**
   * Get cached recommendations
   */
  async getRecommendations(userId: string, context?: string): Promise<Resource[] | null> {
    const key = this.generateRecommendationKey(userId, context)
    const cached = await this.recommendationCache.get(key)
    
    if (cached && this.isRecommendationCacheValid(cached)) {
      return cached.recommendations
    }
    
    return null
  }

  /**
   * Cache recommendations
   */
  async setRecommendations(
    userId: string, 
    recommendations: Resource[], 
    context?: string
  ): Promise<void> {
    const key = this.generateRecommendationKey(userId, context)
    const entry: RecommendationCacheEntry = {
      recommendations,
      timestamp: Date.now(),
      userId
    }
    
    await this.recommendationCache.set(key, entry)
  }

  /**
   * Invalidate search cache for specific patterns
   */
  async invalidateSearchPattern(pattern: {
    department?: string
    course?: string
    resourceType?: string
  }): Promise<void> {
    // This is a simplified implementation
    // In a production system, you might want to maintain reverse indexes
    // for more efficient pattern-based invalidation
    await this.searchCache.clear()
  }

  /**
   * Invalidate recommendations for a user
   */
  async invalidateUserRecommendations(userId: string): Promise<void> {
    // Clear all recommendation entries for this user
    const allKeys = await this.getAllRecommendationKeys()
    const userKeys = allKeys.filter(key => key.includes(userId))
    
    await Promise.all(userKeys.map(key => this.recommendationCache.delete(key)))
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      search: this.searchCache.getStats(),
      recommendations: this.recommendationCache.getStats()
    }
  }

  /**
   * Get popular search queries from cache
   */
  getPopularSearches(limit: number = 10): Array<{ query: string; hits: number }> {
    return this.searchCache.getPopularEntries(limit)
      .map(entry => ({
        query: entry.data.query,
        hits: entry.hits
      }))
  }

  /**
   * Warm cache with common searches
   */
  async warmSearchCache(commonSearches: Array<{
    query: string
    filters: SearchFilters
    results: SearchResults
  }>): Promise<void> {
    await Promise.all(
      commonSearches.map(search =>
        this.setSearchResults(search.query, search.filters, search.results)
      )
    )
  }

  /**
   * Check if search cache entry is still valid
   */
  private isSearchCacheValid(entry: SearchCacheEntry): boolean {
    return (Date.now() - entry.timestamp) < this.searchTtl
  }

  /**
   * Check if recommendation cache entry is still valid
   */
  private isRecommendationCacheValid(entry: RecommendationCacheEntry): boolean {
    return (Date.now() - entry.timestamp) < this.recommendationTtl
  }

  /**
   * Get all recommendation cache keys (simplified implementation)
   */
  private async getAllRecommendationKeys(): Promise<string[]> {
    // This is a simplified implementation
    // In a real system, you'd maintain a key registry
    return []
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    await Promise.all([
      this.searchCache.clear(),
      this.recommendationCache.clear()
    ])
  }

  /**
   * Get cache performance metrics
   */
  async getPerformanceMetrics() {
    const searchStats = this.searchCache.getStats()
    const recommendationStats = this.recommendationCache.getStats()
    
    return {
      search: {
        hitRate: searchStats.hitRate,
        size: searchStats.size,
        hits: searchStats.hits,
        misses: searchStats.misses
      },
      recommendations: {
        hitRate: recommendationStats.hitRate,
        size: recommendationStats.size,
        hits: recommendationStats.hits,
        misses: recommendationStats.misses
      },
      overall: {
        totalHits: searchStats.hits + recommendationStats.hits,
        totalMisses: searchStats.misses + recommendationStats.misses,
        overallHitRate: (searchStats.hits + recommendationStats.hits) / 
          (searchStats.hits + recommendationStats.hits + searchStats.misses + recommendationStats.misses)
      }
    }
  }
}

// Export singleton instance
export const searchCache = new SearchCache()