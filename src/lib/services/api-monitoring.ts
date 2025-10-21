import { YouTubePreviewGenerator, type YouTubeAPIQuota } from './preview-generators/youtube'
import { GitHubPreviewGenerator, type GitHubRateLimit } from './preview-generators/github'
import { CircuitBreakerManager, CircuitState } from './circuit-breaker'

export interface APIUsageMetrics {
  service: 'youtube' | 'github'
  timestamp: Date
  requestCount: number
  successCount: number
  errorCount: number
  averageResponseTime: number
  quotaUsed?: number
  quotaLimit?: number
  rateLimitRemaining?: number
  rateLimitReset?: Date
}

export interface APIAlert {
  id: string
  service: 'youtube' | 'github'
  type: 'quota_warning' | 'quota_exceeded' | 'rate_limit' | 'circuit_breaker' | 'high_error_rate'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  timestamp: Date
  resolved: boolean
  metadata?: Record<string, any>
}

export interface APIHealthStatus {
  service: 'youtube' | 'github'
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unavailable'
  lastChecked: Date
  responseTime?: number
  errorRate: number
  quotaUsage?: number
  rateLimitStatus?: 'ok' | 'warning' | 'exceeded'
  circuitBreakerState: CircuitState
}

export class APIMonitoringService {
  private static readonly QUOTA_WARNING_THRESHOLD = 0.8 // 80%
  private static readonly QUOTA_CRITICAL_THRESHOLD = 0.95 // 95%
  private static readonly ERROR_RATE_WARNING_THRESHOLD = 0.1 // 10%
  private static readonly ERROR_RATE_CRITICAL_THRESHOLD = 0.25 // 25%
  
  // In-memory storage (in production, use Redis/database)
  private static metrics = new Map<string, APIUsageMetrics[]>()
  private static alerts = new Map<string, APIAlert>()
  private static healthStatus = new Map<string, APIHealthStatus>()

  /**
   * Record API usage metrics
   */
  static recordMetrics(
    service: 'youtube' | 'github',
    success: boolean,
    responseTime: number,
    error?: Error
  ): void {
    const key = `${service}-${new Date().toISOString().split('T')[0]}` // Daily metrics
    const existing = this.metrics.get(key) || []
    
    const now = new Date()
    let todayMetrics = existing.find(m => 
      m.timestamp.toDateString() === now.toDateString()
    )
    
    if (!todayMetrics) {
      todayMetrics = {
        service,
        timestamp: now,
        requestCount: 0,
        successCount: 0,
        errorCount: 0,
        averageResponseTime: 0
      }
      existing.push(todayMetrics)
    }
    
    // Update metrics
    todayMetrics.requestCount++
    if (success) {
      todayMetrics.successCount++
    } else {
      todayMetrics.errorCount++
    }
    
    // Update average response time
    const totalTime = todayMetrics.averageResponseTime * (todayMetrics.requestCount - 1) + responseTime
    todayMetrics.averageResponseTime = totalTime / todayMetrics.requestCount
    
    this.metrics.set(key, existing)
    
    // Update health status
    this.updateHealthStatus(service)
    
    // Check for alerts
    this.checkAlerts(service, todayMetrics, error)
  }

  /**
   * Update health status for a service
   */
  private static updateHealthStatus(service: 'youtube' | 'github'): void {
    const metrics = this.getTodayMetrics(service)
    const circuitBreaker = CircuitBreakerManager.getBreaker(`${service}-api`)
    
    let status: APIHealthStatus['status'] = 'healthy'
    let rateLimitStatus: 'ok' | 'warning' | 'exceeded' = 'ok'
    let quotaUsage = 0
    
    // Get service-specific data
    if (service === 'youtube') {
      const quota = YouTubePreviewGenerator.getQuotaUsage()
      if (quota) {
        quotaUsage = quota.currentUsage / quota.dailyLimit
        if (quotaUsage >= this.QUOTA_CRITICAL_THRESHOLD) {
          status = 'unavailable'
        } else if (quotaUsage >= this.QUOTA_WARNING_THRESHOLD) {
          status = 'degraded'
        }
      }
    } else if (service === 'github') {
      const rateLimit = GitHubPreviewGenerator.getRateLimit()
      if (rateLimit) {
        const usageRatio = rateLimit.used / rateLimit.limit
        quotaUsage = usageRatio
        
        if (rateLimit.remaining === 0) {
          rateLimitStatus = 'exceeded'
          status = 'unavailable'
        } else if (rateLimit.remaining < rateLimit.limit * 0.1) {
          rateLimitStatus = 'warning'
          status = 'degraded'
        }
      }
    }
    
    // Check error rate
    if (metrics) {
      const errorRate = metrics.errorCount / metrics.requestCount
      if (errorRate >= this.ERROR_RATE_CRITICAL_THRESHOLD) {
        status = 'unhealthy'
      } else if (errorRate >= this.ERROR_RATE_WARNING_THRESHOLD && status === 'healthy') {
        status = 'degraded'
      }
    }
    
    // Check circuit breaker state
    const circuitState = circuitBreaker.getState()
    if (circuitState === CircuitState.OPEN) {
      status = 'unavailable'
    } else if (circuitState === CircuitState.HALF_OPEN && status === 'healthy') {
      status = 'degraded'
    }
    
    this.healthStatus.set(service, {
      service,
      status,
      lastChecked: new Date(),
      responseTime: metrics?.averageResponseTime,
      errorRate: metrics ? metrics.errorCount / metrics.requestCount : 0,
      quotaUsage,
      rateLimitStatus,
      circuitBreakerState: circuitState
    })
  }

  /**
   * Check for alert conditions
   */
  private static checkAlerts(
    service: 'youtube' | 'github',
    metrics: APIUsageMetrics,
    error?: Error
  ): void {
    const alerts: Omit<APIAlert, 'id' | 'timestamp' | 'resolved'>[] = []
    
    // Check quota/rate limit alerts
    if (service === 'youtube') {
      const quota = YouTubePreviewGenerator.getQuotaUsage()
      if (quota) {
        const usageRatio = quota.currentUsage / quota.dailyLimit
        
        if (usageRatio >= this.QUOTA_CRITICAL_THRESHOLD) {
          alerts.push({
            service,
            type: 'quota_exceeded',
            severity: 'critical',
            message: `YouTube API quota critically high: ${Math.round(usageRatio * 100)}% used`,
            metadata: { quota, usageRatio }
          })
        } else if (usageRatio >= this.QUOTA_WARNING_THRESHOLD) {
          alerts.push({
            service,
            type: 'quota_warning',
            severity: 'medium',
            message: `YouTube API quota warning: ${Math.round(usageRatio * 100)}% used`,
            metadata: { quota, usageRatio }
          })
        }
      }
    } else if (service === 'github') {
      const rateLimit = GitHubPreviewGenerator.getRateLimit()
      if (rateLimit) {
        if (rateLimit.remaining === 0) {
          alerts.push({
            service,
            type: 'rate_limit',
            severity: 'critical',
            message: `GitHub API rate limit exceeded. Resets at ${new Date(rateLimit.reset * 1000).toISOString()}`,
            metadata: { rateLimit }
          })
        } else if (rateLimit.remaining < rateLimit.limit * 0.1) {
          alerts.push({
            service,
            type: 'rate_limit',
            severity: 'medium',
            message: `GitHub API rate limit warning: ${rateLimit.remaining} requests remaining`,
            metadata: { rateLimit }
          })
        }
      }
    }
    
    // Check error rate alerts
    const errorRate = metrics.errorCount / metrics.requestCount
    if (errorRate >= this.ERROR_RATE_CRITICAL_THRESHOLD) {
      alerts.push({
        service,
        type: 'high_error_rate',
        severity: 'critical',
        message: `High error rate detected: ${Math.round(errorRate * 100)}%`,
        metadata: { errorRate, metrics }
      })
    } else if (errorRate >= this.ERROR_RATE_WARNING_THRESHOLD) {
      alerts.push({
        service,
        type: 'high_error_rate',
        severity: 'medium',
        message: `Elevated error rate: ${Math.round(errorRate * 100)}%`,
        metadata: { errorRate, metrics }
      })
    }
    
    // Check circuit breaker alerts
    const circuitState = CircuitBreakerManager.getBreaker(`${service}-api`).getState()
    if (circuitState === CircuitState.OPEN) {
      alerts.push({
        service,
        type: 'circuit_breaker',
        severity: 'critical',
        message: `Circuit breaker is OPEN for ${service} API`,
        metadata: { circuitState }
      })
    }
    
    // Store new alerts
    alerts.forEach(alert => {
      const alertId = `${service}-${alert.type}-${Date.now()}`
      this.alerts.set(alertId, {
        ...alert,
        id: alertId,
        timestamp: new Date(),
        resolved: false
      })
    })
  }

  /**
   * Get today's metrics for a service
   */
  private static getTodayMetrics(service: 'youtube' | 'github'): APIUsageMetrics | null {
    const key = `${service}-${new Date().toISOString().split('T')[0]}`
    const metrics = this.metrics.get(key) || []
    const today = new Date().toDateString()
    
    return metrics.find(m => m.timestamp.toDateString() === today) || null
  }

  /**
   * Get health status for all services
   */
  static getHealthStatus(): Map<string, APIHealthStatus> {
    // Update health status for all services
    this.updateHealthStatus('youtube')
    this.updateHealthStatus('github')
    
    return new Map(this.healthStatus)
  }

  /**
   * Get health status for a specific service
   */
  static getServiceHealth(service: 'youtube' | 'github'): APIHealthStatus | null {
    this.updateHealthStatus(service)
    return this.healthStatus.get(service) || null
  }

  /**
   * Get active alerts
   */
  static getActiveAlerts(): APIAlert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved)
  }

  /**
   * Get alerts for a specific service
   */
  static getServiceAlerts(service: 'youtube' | 'github'): APIAlert[] {
    return Array.from(this.alerts.values()).filter(alert => 
      alert.service === service && !alert.resolved
    )
  }

  /**
   * Resolve an alert
   */
  static resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId)
    if (alert) {
      alert.resolved = true
      return true
    }
    return false
  }

  /**
   * Get usage metrics for a service
   */
  static getUsageMetrics(
    service: 'youtube' | 'github',
    days = 7
  ): APIUsageMetrics[] {
    const metrics: APIUsageMetrics[] = []
    const now = new Date()
    
    for (let i = 0; i < days; i++) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const key = `${service}-${date.toISOString().split('T')[0]}`
      
      const dayMetrics = this.metrics.get(key) || []
      const dayData = dayMetrics.find(m => 
        m.timestamp.toDateString() === date.toDateString()
      )
      
      if (dayData) {
        metrics.unshift(dayData)
      } else {
        // Add empty metrics for days with no data
        metrics.unshift({
          service,
          timestamp: date,
          requestCount: 0,
          successCount: 0,
          errorCount: 0,
          averageResponseTime: 0
        })
      }
    }
    
    return metrics
  }

  /**
   * Get comprehensive monitoring dashboard data
   */
  static getDashboardData(): {
    healthStatus: Map<string, APIHealthStatus>
    activeAlerts: APIAlert[]
    metrics: {
      youtube: APIUsageMetrics[]
      github: APIUsageMetrics[]
    }
    quotaInfo: {
      youtube?: YouTubeAPIQuota
      github?: GitHubRateLimit
    }
  } {
    return {
      healthStatus: this.getHealthStatus(),
      activeAlerts: this.getActiveAlerts(),
      metrics: {
        youtube: this.getUsageMetrics('youtube'),
        github: this.getUsageMetrics('github')
      },
      quotaInfo: {
        youtube: YouTubePreviewGenerator.getQuotaUsage() || undefined,
        github: GitHubPreviewGenerator.getRateLimit() || undefined
      }
    }
  }

  /**
   * Test all API connections
   */
  static async testAllConnections(): Promise<{
    youtube: { success: boolean; error?: string }
    github: { success: boolean; error?: string }
  }> {
    const [youtubeResult, githubResult] = await Promise.allSettled([
      YouTubePreviewGenerator.testAPIConnection(),
      GitHubPreviewGenerator.testAPIConnection()
    ])
    
    return {
      youtube: youtubeResult.status === 'fulfilled' 
        ? youtubeResult.value 
        : { success: false, error: 'Test failed' },
      github: githubResult.status === 'fulfilled' 
        ? githubResult.value 
        : { success: false, error: 'Test failed' }
    }
  }

  /**
   * Clear old metrics and alerts (cleanup)
   */
  static cleanup(daysToKeep = 30): void {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
    
    // Clean up metrics
    for (const [key, metrics] of Array.from(this.metrics.entries())) {
      const filteredMetrics = metrics.filter(m => m.timestamp >= cutoffDate)
      if (filteredMetrics.length === 0) {
        this.metrics.delete(key)
      } else {
        this.metrics.set(key, filteredMetrics)
      }
    }
    
    // Clean up resolved alerts older than cutoff
    for (const [key, alert] of Array.from(this.alerts.entries())) {
      if (alert.resolved && alert.timestamp < cutoffDate) {
        this.alerts.delete(key)
      }
    }
  }

  /**
   * Reset all monitoring data (for testing)
   */
  static reset(): void {
    this.metrics.clear()
    this.alerts.clear()
    this.healthStatus.clear()
  }
}