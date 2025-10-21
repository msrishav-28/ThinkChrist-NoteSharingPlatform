import { createClient } from '@/lib/supabase/client'
import type { SearchFilters } from '@/types'

export interface SearchAnalyticsData {
  id?: string
  query: string
  results_count: number
  clicked_results: string[]
  user_id?: string
  filters_used: SearchFilters
  search_time: number
  created_at: string
}

export interface SearchMetrics {
  totalSearches: number
  averageResultsPerSearch: number
  averageSearchTime: number
  topQueries: Array<{ query: string; count: number; avgResults: number }>
  clickThroughRate: number
  popularFilters: Record<string, number>
  searchTrends: Array<{ date: string; searches: number }>
}

export interface QueryPerformance {
  query: string
  totalSearches: number
  averageResults: number
  averageClickPosition: number
  clickThroughRate: number
  averageSearchTime: number
  popularFilters: SearchFilters
}

export class SearchAnalyticsService {
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
   * Track a search query with its results and metadata
   */
  async trackSearch(data: Omit<SearchAnalyticsData, 'id' | 'created_at'>): Promise<void> {
    if (!this.isSupabaseAvailable()) return

    try {
      const analyticsData: SearchAnalyticsData = {
        ...data,
        created_at: new Date().toISOString()
      }

      const { error } = await this.supabase
        .from('search_analytics')
        .insert([analyticsData])

      if (error) {
        console.error('Error tracking search analytics:', error)
      }
    } catch (error) {
      console.error('Error tracking search analytics:', error)
    }
  }

  /**
   * Update search analytics with clicked results
   */
  async updateSearchWithClick(
    userId: string,
    query: string,
    resourceId: string,
    position: number
  ): Promise<void> {
    if (!this.isSupabaseAvailable()) return

    try {
      // Find the most recent search analytics entry for this user and query
      const { data: recentSearch } = await this.supabase
        .from('search_analytics')
        .select('id, clicked_results')
        .eq('user_id', userId)
        .eq('query', query)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (recentSearch) {
        const updatedClickedResults = [
          ...(recentSearch.clicked_results || []),
          `${resourceId}:${position}`
        ]

        await this.supabase
          .from('search_analytics')
          .update({ clicked_results: updatedClickedResults })
          .eq('id', recentSearch.id)
      }
    } catch (error) {
      console.error('Error updating search with click:', error)
    }
  }

  /**
   * Get comprehensive search metrics for analytics dashboard
   */
  async getSearchMetrics(
    dateRange?: { start: string; end: string },
    userId?: string
  ): Promise<SearchMetrics> {
    if (!this.isSupabaseAvailable()) {
      return this.getEmptyMetrics()
    }

    try {
      let query = this.supabase
        .from('search_analytics')
        .select('*')

      if (userId) {
        query = query.eq('user_id', userId)
      }

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start)
          .lte('created_at', dateRange.end)
      }

      const { data: analytics } = await query

      if (!analytics || analytics.length === 0) {
        return this.getEmptyMetrics()
      }

      // Calculate metrics
      const totalSearches = analytics.length
      const totalResults = analytics.reduce((sum, item) => sum + item.results_count, 0)
      const totalSearchTime = analytics.reduce((sum, item) => sum + item.search_time, 0)
      const totalClicks = analytics.reduce((sum, item) => sum + (item.clicked_results?.length || 0), 0)

      const averageResultsPerSearch = totalResults / totalSearches
      const averageSearchTime = totalSearchTime / totalSearches
      const clickThroughRate = totalClicks / totalSearches

      // Top queries
      const queryStats = analytics.reduce((acc, item) => {
        const query = item.query.toLowerCase().trim()
        if (!acc[query]) {
          acc[query] = { count: 0, totalResults: 0, clicks: 0 }
        }
        acc[query].count++
        acc[query].totalResults += item.results_count
        acc[query].clicks += item.clicked_results?.length || 0
        return acc
      }, {} as Record<string, { count: number; totalResults: number; clicks: number }>)

      const topQueries = Object.entries(queryStats)
        .map(([query, stats]) => ({
          query,
          count: (stats as any).count,
          avgResults: (stats as any).totalResults / (stats as any).count
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      // Popular filters
      const popularFilters = analytics.reduce((acc, item) => {
        const filters = item.filters_used || {}
        Object.entries(filters).forEach(([key, values]) => {
          if (Array.isArray(values) && values.length > 0) {
            acc[key] = (acc[key] || 0) + values.length
          } else if (values) {
            acc[key] = (acc[key] || 0) + 1
          }
        })
        return acc
      }, {} as Record<string, number>)

      // Search trends (daily aggregation)
      const searchTrends = this.calculateSearchTrends(analytics)

      return {
        totalSearches,
        averageResultsPerSearch,
        averageSearchTime,
        topQueries,
        clickThroughRate,
        popularFilters,
        searchTrends
      }
    } catch (error) {
      console.error('Error getting search metrics:', error)
      return this.getEmptyMetrics()
    }
  }

  /**
   * Get performance metrics for specific queries
   */
  async getQueryPerformance(queries: string[]): Promise<QueryPerformance[]> {
    try {
      const { data: analytics } = await this.supabase
        .from('search_analytics')
        .select('*')
        .in('query', queries)

      if (!analytics) return []

      const queryPerformance = queries.map(query => {
        const queryAnalytics = analytics.filter(item => 
          item.query.toLowerCase().trim() === query.toLowerCase().trim()
        )

        if (queryAnalytics.length === 0) {
          return {
            query,
            totalSearches: 0,
            averageResults: 0,
            averageClickPosition: 0,
            clickThroughRate: 0,
            averageSearchTime: 0,
            popularFilters: {}
          }
        }

        const totalSearches = queryAnalytics.length
        const totalResults = queryAnalytics.reduce((sum, item) => sum + item.results_count, 0)
        const totalSearchTime = queryAnalytics.reduce((sum, item) => sum + item.search_time, 0)
        const totalClicks = queryAnalytics.reduce((sum, item) => sum + (item.clicked_results?.length || 0), 0)

        // Calculate average click position
        let totalClickPositions = 0
        let clickCount = 0
        queryAnalytics.forEach(item => {
          item.clicked_results?.forEach((click: any) => {
            const position = parseInt(click.split(':')[1] || '0')
            totalClickPositions += position
            clickCount++
          })
        })

        const averageClickPosition = clickCount > 0 ? totalClickPositions / clickCount : 0

        // Most popular filters for this query
        const filterUsage = queryAnalytics.reduce((acc, item) => {
          const filters = item.filters_used || {}
          Object.entries(filters).forEach(([key, values]) => {
            if (!acc[key]) acc[key] = []
            if (Array.isArray(values)) {
              acc[key].push(...values)
            } else if (values) {
              acc[key].push(values)
            }
          })
          return acc
        }, {} as Record<string, any[]>)

        const popularFilters: SearchFilters = {}
        Object.entries(filterUsage).forEach(([key, values]) => {
          const uniqueValues = Array.from(new Set(values as any[]))
          if (uniqueValues.length > 0) {
            popularFilters[key as keyof SearchFilters] = uniqueValues as any
          }
        })

        return {
          query,
          totalSearches,
          averageResults: totalResults / totalSearches,
          averageClickPosition,
          clickThroughRate: totalClicks / totalSearches,
          averageSearchTime: totalSearchTime / totalSearches,
          popularFilters
        }
      })

      return queryPerformance
    } catch (error) {
      console.error('Error getting query performance:', error)
      return []
    }
  }

  /**
   * Get search suggestions based on analytics data
   */
  async getAnalyticsBasedSuggestions(
    partialQuery: string,
    limit: number = 5
  ): Promise<Array<{ query: string; popularity: number; avgResults: number }>> {
    if (!this.isSupabaseAvailable()) return []

    try {
      const { data: analytics } = await this.supabase
        .from('search_analytics')
        .select('query, results_count')
        .ilike('query', `%${partialQuery}%`)
        .gt('results_count', 0)
        .order('created_at', { ascending: false })
        .limit(100) // Get recent searches

      if (!analytics) return []

      // Aggregate by query
      const queryStats = analytics.reduce((acc, item) => {
        const query = item.query.toLowerCase().trim()
        if (!acc[query]) {
          acc[query] = { count: 0, totalResults: 0 }
        }
        acc[query].count++
        acc[query].totalResults += item.results_count
        return acc
      }, {} as Record<string, { count: number; totalResults: number }>)

      return Object.entries(queryStats)
        .map(([query, stats]) => ({
          query,
          popularity: stats.count,
          avgResults: stats.totalResults / stats.count
        }))
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, limit)
    } catch (error) {
      console.error('Error getting analytics-based suggestions:', error)
      return []
    }
  }

  /**
   * Get queries with poor performance (low CTR, high search time, etc.)
   */
  async getPoorPerformingQueries(limit: number = 10): Promise<QueryPerformance[]> {
    try {
      const { data: analytics } = await this.supabase
        .from('search_analytics')
        .select('*')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days

      if (!analytics) return []

      // Group by query and calculate performance metrics
      const queryStats = analytics.reduce((acc, item) => {
        const query = item.query.toLowerCase().trim()
        if (!acc[query]) {
          acc[query] = {
            searches: [],
            totalClicks: 0,
            totalSearchTime: 0
          }
        }
        acc[query].searches.push(item)
        acc[query].totalClicks += item.clicked_results?.length || 0
        acc[query].totalSearchTime += item.search_time
        return acc
      }, {} as Record<string, { searches: any[]; totalClicks: number; totalSearchTime: number }>)

      const poorPerformers = Object.entries(queryStats)
        .filter(([, stats]) => (stats as any).searches.length >= 3) // Only queries with at least 3 searches
        .map(([query, stats]) => {
          const totalSearches = (stats as any).searches.length
          const averageResults = (stats as any).searches.reduce((sum: number, s: any) => sum + s.results_count, 0) / totalSearches
          const clickThroughRate = (stats as any).totalClicks / totalSearches
          const averageSearchTime = (stats as any).totalSearchTime / totalSearches

          return {
            query,
            totalSearches,
            averageResults,
            averageClickPosition: 0, // Would need more complex calculation
            clickThroughRate,
            averageSearchTime,
            popularFilters: {},
            performanceScore: this.calculatePerformanceScore(clickThroughRate, averageResults, averageSearchTime)
          }
        })
        .sort((a, b) => a.performanceScore - b.performanceScore) // Lowest score first (worst performing)
        .slice(0, limit)

      return poorPerformers
    } catch (error) {
      console.error('Error getting poor performing queries:', error)
      return []
    }
  }

  // Private helper methods

  private getEmptyMetrics(): SearchMetrics {
    return {
      totalSearches: 0,
      averageResultsPerSearch: 0,
      averageSearchTime: 0,
      topQueries: [],
      clickThroughRate: 0,
      popularFilters: {},
      searchTrends: []
    }
  }

  private calculateSearchTrends(analytics: SearchAnalyticsData[]): Array<{ date: string; searches: number }> {
    const dailySearches = analytics.reduce((acc, item) => {
      const date = new Date(item.created_at).toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(dailySearches)
      .map(([date, searches]) => ({ date, searches }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  private calculatePerformanceScore(
    clickThroughRate: number,
    averageResults: number,
    averageSearchTime: number
  ): number {
    // Lower score = worse performance
    // CTR weight: 50%, Results weight: 30%, Speed weight: 20%
    const ctrScore = clickThroughRate * 50
    const resultsScore = Math.min(averageResults / 10, 1) * 30 // Normalize to max 10 results
    const speedScore = Math.max(0, (5000 - averageSearchTime) / 5000) * 20 // Normalize to 5 seconds max

    return ctrScore + resultsScore + speedScore
  }
}

// Export singleton instance
export const searchAnalyticsService = new SearchAnalyticsService()
