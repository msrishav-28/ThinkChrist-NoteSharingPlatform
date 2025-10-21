import { createClient } from '@/lib/supabase/client'

export interface PerformanceMetric {
  id?: string
  metric_name: string
  metric_value: number
  metric_unit: string
  context: Record<string, any>
  user_id?: string
  session_id?: string
  created_at: string
}

export interface DatabaseQueryMetric {
  query_type: string
  table_name: string
  execution_time: number
  rows_affected: number
  query_hash: string
  success: boolean
  error_message?: string
}

export interface UserFlowMetric {
  flow_name: string
  step_name: string
  step_duration: number
  step_success: boolean
  user_id: string
  session_id: string
  metadata: Record<string, any>
}

export interface CacheMetric {
  cache_type: string
  operation: 'hit' | 'miss' | 'set' | 'delete' | 'clear'
  key_pattern?: string
  execution_time: number
  cache_size?: number
}

/**
 * Performance monitoring service for tracking key metrics
 */
export class PerformanceMonitor {
  private _supabase: ReturnType<typeof createClient> | null = null

  private get supabase() {
    if (!this._supabase) {
      this._supabase = createClient()
    }
    return this._supabase
  }
  private metrics: PerformanceMetric[] = []
  private batchSize = 50
  private flushInterval = 30000 // 30 seconds
  private flushTimer: NodeJS.Timeout | null = null

  constructor() {
    this.startBatchFlushing()
  }

  /**
   * Track a performance metric
   */
  async trackMetric(
    name: string,
    value: number,
    unit: string = 'ms',
    context: Record<string, any> = {},
    userId?: string,
    sessionId?: string
  ): Promise<void> {
    const metric: PerformanceMetric = {
      metric_name: name,
      metric_value: value,
      metric_unit: unit,
      context,
      user_id: userId,
      session_id: sessionId,
      created_at: new Date().toISOString()
    }

    this.metrics.push(metric)

    // Flush if batch is full
    if (this.metrics.length >= this.batchSize) {
      await this.flushMetrics()
    }
  }

  /**
   * Track database query performance
   */
  async trackDatabaseQuery(
    queryType: string,
    tableName: string,
    executionTime: number,
    rowsAffected: number = 0,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    const queryHash = this.generateQueryHash(queryType, tableName)
    
    await this.trackMetric(
      'database_query',
      executionTime,
      'ms',
      {
        query_type: queryType,
        table_name: tableName,
        rows_affected: rowsAffected,
        query_hash: queryHash,
        success,
        error_message: errorMessage
      }
    )
  }

  /**
   * Track user flow performance
   */
  async trackUserFlow(
    flowName: string,
    stepName: string,
    stepDuration: number,
    success: boolean,
    userId: string,
    sessionId: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    await this.trackMetric(
      'user_flow',
      stepDuration,
      'ms',
      {
        flow_name: flowName,
        step_name: stepName,
        step_success: success,
        ...metadata
      },
      userId,
      sessionId
    )
  }

  /**
   * Track cache performance
   */
  async trackCacheOperation(
    cacheType: string,
    operation: CacheMetric['operation'],
    executionTime: number,
    keyPattern?: string,
    cacheSize?: number
  ): Promise<void> {
    await this.trackMetric(
      'cache_operation',
      executionTime,
      'ms',
      {
        cache_type: cacheType,
        operation,
        key_pattern: keyPattern,
        cache_size: cacheSize
      }
    )
  }

  /**
   * Track API endpoint performance
   */
  async trackApiEndpoint(
    endpoint: string,
    method: string,
    responseTime: number,
    statusCode: number,
    userId?: string,
    requestSize?: number,
    responseSize?: number
  ): Promise<void> {
    await this.trackMetric(
      'api_endpoint',
      responseTime,
      'ms',
      {
        endpoint,
        method,
        status_code: statusCode,
        request_size: requestSize,
        response_size: responseSize,
        success: statusCode >= 200 && statusCode < 400
      },
      userId
    )
  }

  /**
   * Track search performance
   */
  async trackSearchPerformance(
    query: string,
    resultCount: number,
    executionTime: number,
    cacheHit: boolean,
    userId?: string,
    filters?: Record<string, any>
  ): Promise<void> {
    await this.trackMetric(
      'search_performance',
      executionTime,
      'ms',
      {
        query_length: query.length,
        result_count: resultCount,
        cache_hit: cacheHit,
        filters_used: filters ? Object.keys(filters).length : 0,
        has_filters: filters ? Object.keys(filters).length > 0 : false
      },
      userId
    )
  }

  /**
   * Track recommendation generation performance
   */
  async trackRecommendationPerformance(
    userId: string,
    recommendationCount: number,
    executionTime: number,
    cacheHit: boolean,
    algorithmType: string
  ): Promise<void> {
    await this.trackMetric(
      'recommendation_performance',
      executionTime,
      'ms',
      {
        recommendation_count: recommendationCount,
        cache_hit: cacheHit,
        algorithm_type: algorithmType
      },
      userId
    )
  }

  /**
   * Track file upload performance
   */
  async trackFileUpload(
    fileSize: number,
    fileType: string,
    uploadTime: number,
    success: boolean,
    userId: string,
    errorMessage?: string
  ): Promise<void> {
    await this.trackMetric(
      'file_upload',
      uploadTime,
      'ms',
      {
        file_size: fileSize,
        file_type: fileType,
        success,
        error_message: errorMessage,
        upload_speed: fileSize / (uploadTime / 1000) // bytes per second
      },
      userId
    )
  }

  /**
   * Get performance metrics for analysis
   */
  async getMetrics(
    metricName?: string,
    startDate?: string,
    endDate?: string,
    userId?: string,
    limit: number = 1000
  ): Promise<PerformanceMetric[]> {
    try {
      let query = this.supabase
        .from('performance_metrics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (metricName) {
        query = query.eq('metric_name', metricName)
      }

      if (userId) {
        query = query.eq('user_id', userId)
      }

      if (startDate) {
        query = query.gte('created_at', startDate)
      }

      if (endDate) {
        query = query.lte('created_at', endDate)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching performance metrics:', error)
      return []
    }
  }

  /**
   * Get aggregated performance statistics
   */
  async getPerformanceStats(
    metricName: string,
    timeRange: '1h' | '24h' | '7d' | '30d' = '24h'
  ): Promise<{
    average: number
    median: number
    p95: number
    p99: number
    min: number
    max: number
    count: number
  }> {
    try {
      const timeRangeMs = this.getTimeRangeMs(timeRange)
      const startDate = new Date(Date.now() - timeRangeMs).toISOString()

      const metrics = await this.getMetrics(metricName, startDate)
      const values = metrics.map(m => m.metric_value).sort((a, b) => a - b)

      if (values.length === 0) {
        return {
          average: 0,
          median: 0,
          p95: 0,
          p99: 0,
          min: 0,
          max: 0,
          count: 0
        }
      }

      const average = values.reduce((sum, val) => sum + val, 0) / values.length
      const median = this.getPercentile(values, 50)
      const p95 = this.getPercentile(values, 95)
      const p99 = this.getPercentile(values, 99)

      return {
        average,
        median,
        p95,
        p99,
        min: values[0],
        max: values[values.length - 1],
        count: values.length
      }
    } catch (error) {
      console.error('Error calculating performance stats:', error)
      return {
        average: 0,
        median: 0,
        p95: 0,
        p99: 0,
        min: 0,
        max: 0,
        count: 0
      }
    }
  }

  /**
   * Get slow queries for optimization
   */
  async getSlowQueries(
    threshold: number = 1000, // 1 second
    limit: number = 50
  ): Promise<Array<{
    query_type: string
    table_name: string
    avg_execution_time: number
    max_execution_time: number
    count: number
  }>> {
    try {
      const metrics = await this.getMetrics('database_query', undefined, undefined, undefined, 1000)
      
      const queryStats = new Map<string, {
        times: number[]
        query_type: string
        table_name: string
      }>()

      metrics.forEach(metric => {
        if (metric.metric_value >= threshold) {
          const key = `${metric.context.query_type}_${metric.context.table_name}`
          const existing = queryStats.get(key) || {
            times: [] as number[],
            query_type: metric.context.query_type,
            table_name: metric.context.table_name
          }
          existing.times.push(metric.metric_value)
          queryStats.set(key, existing)
        }
      })

      return Array.from(queryStats.entries())
        .map(([key, data]) => ({
          query_type: data.query_type,
          table_name: data.table_name,
          avg_execution_time: data.times.reduce((sum, time) => sum + time, 0) / data.times.length,
          max_execution_time: Math.max(...data.times),
          count: data.times.length
        }))
        .sort((a, b) => b.avg_execution_time - a.avg_execution_time)
        .slice(0, limit)
    } catch (error) {
      console.error('Error getting slow queries:', error)
      return []
    }
  }

  /**
   * Get performance alerts
   */
  async getPerformanceAlerts(): Promise<Array<{
    type: string
    message: string
    severity: 'low' | 'medium' | 'high'
    metric_name: string
    current_value: number
    threshold: number
  }>> {
    const alerts: Array<{
      type: string
      message: string
      severity: 'low' | 'medium' | 'high'
      metric_name: string
      current_value: number
      threshold: number
    }> = []

    try {
      // Check API response times
      const apiStats = await this.getPerformanceStats('api_endpoint', '1h')
      if (apiStats.p95 > 2000) { // 2 seconds
        alerts.push({
          type: 'slow_api',
          message: `API response time P95 is ${apiStats.p95.toFixed(0)}ms`,
          severity: apiStats.p95 > 5000 ? 'high' : 'medium',
          metric_name: 'api_endpoint',
          current_value: apiStats.p95,
          threshold: 2000
        })
      }

      // Check search performance
      const searchStats = await this.getPerformanceStats('search_performance', '1h')
      if (searchStats.p95 > 1000) { // 1 second
        alerts.push({
          type: 'slow_search',
          message: `Search performance P95 is ${searchStats.p95.toFixed(0)}ms`,
          severity: searchStats.p95 > 3000 ? 'high' : 'medium',
          metric_name: 'search_performance',
          current_value: searchStats.p95,
          threshold: 1000
        })
      }

      // Check database query performance
      const dbStats = await this.getPerformanceStats('database_query', '1h')
      if (dbStats.p95 > 500) { // 500ms
        alerts.push({
          type: 'slow_database',
          message: `Database query P95 is ${dbStats.p95.toFixed(0)}ms`,
          severity: dbStats.p95 > 2000 ? 'high' : 'medium',
          metric_name: 'database_query',
          current_value: dbStats.p95,
          threshold: 500
        })
      }

      return alerts
    } catch (error) {
      console.error('Error getting performance alerts:', error)
      return []
    }
  }

  /**
   * Flush metrics to database
   */
  private async flushMetrics(): Promise<void> {
    if (this.metrics.length === 0) return

    try {
      const metricsToFlush = [...this.metrics]
      this.metrics = []

      const { error } = await this.supabase
        .from('performance_metrics')
        .insert(metricsToFlush)

      if (error) {
        console.error('Error flushing performance metrics:', error)
        // Put metrics back if flush failed
        this.metrics.unshift(...metricsToFlush)
      }
    } catch (error) {
      console.error('Error flushing performance metrics:', error)
    }
  }

  /**
   * Start automatic batch flushing
   */
  private startBatchFlushing(): void {
    this.flushTimer = setInterval(async () => {
      await this.flushMetrics()
    }, this.flushInterval)
  }

  /**
   * Stop automatic batch flushing
   */
  stopBatchFlushing(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
  }

  /**
   * Generate a hash for query identification
   */
  private generateQueryHash(queryType: string, tableName: string): string {
    return `${queryType}_${tableName}`.toLowerCase()
  }

  /**
   * Get time range in milliseconds
   */
  private getTimeRangeMs(timeRange: string): number {
    const ranges = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    }
    return ranges[timeRange as keyof typeof ranges] || ranges['24h']
  }

  /**
   * Calculate percentile from sorted array
   */
  private getPercentile(sortedArray: number[], percentile: number): number {
    const index = (percentile / 100) * (sortedArray.length - 1)
    const lower = Math.floor(index)
    const upper = Math.ceil(index)
    
    if (lower === upper) {
      return sortedArray[lower]
    }
    
    const weight = index - lower
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight
  }

  /**
   * Cleanup old metrics
   */
  async cleanupOldMetrics(olderThanDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

      const { data, error } = await this.supabase
        .from('performance_metrics')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select('id')

      if (error) throw error
      return data?.length || 0
    } catch (error) {
      console.error('Error cleaning up old metrics:', error)
      return 0
    }
  }

  /**
   * Destroy monitor and cleanup resources
   */
  async destroy(): Promise<void> {
    this.stopBatchFlushing()
    await this.flushMetrics()
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor()
