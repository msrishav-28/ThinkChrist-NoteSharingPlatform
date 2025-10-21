import { NextRequest, NextResponse } from 'next/server'
import { performanceMonitor } from '../services/performance-monitor'

export interface PerformanceMiddlewareOptions {
  trackApiCalls?: boolean
  trackDatabaseQueries?: boolean
  slowQueryThreshold?: number
  excludePaths?: string[]
  sampleRate?: number // 0-1, percentage of requests to track
}

/**
 * Middleware for automatic performance tracking
 */
export class PerformanceMiddleware {
  private options: Required<PerformanceMiddlewareOptions>

  constructor(options: PerformanceMiddlewareOptions = {}) {
    this.options = {
      trackApiCalls: true,
      trackDatabaseQueries: true,
      slowQueryThreshold: 1000,
      excludePaths: ['/api/health', '/favicon.ico', '/_next'],
      sampleRate: 1.0,
      ...options
    }
  }

  /**
   * Create middleware function for Next.js
   */
  createMiddleware() {
    return async (request: NextRequest) => {
      const startTime = Date.now()
      const pathname = request.nextUrl.pathname

      // Check if path should be excluded
      if (this.shouldExcludePath(pathname)) {
        return NextResponse.next()
      }

      // Sample requests based on sample rate
      if (Math.random() > this.options.sampleRate) {
        return NextResponse.next()
      }

      // Get user ID from request if available
      const userId = this.extractUserId(request)
      const sessionId = this.extractSessionId(request)

      try {
        // Continue with the request
        const response = NextResponse.next()

        // Track the API call performance
        if (this.options.trackApiCalls && pathname.startsWith('/api/')) {
          const endTime = Date.now()
          const responseTime = endTime - startTime

          await performanceMonitor.trackApiEndpoint(
            pathname,
            request.method,
            responseTime,
            response.status,
            userId,
            this.getRequestSize(request),
            this.getResponseSize(response)
          )

          // Track slow API calls separately
          if (responseTime > this.options.slowQueryThreshold) {
            await performanceMonitor.trackMetric(
              'slow_api_call',
              responseTime,
              'ms',
              {
                endpoint: pathname,
                method: request.method,
                status_code: response.status
              },
              userId,
              sessionId
            )
          }
        }

        return response
      } catch (error) {
        const endTime = Date.now()
        const responseTime = endTime - startTime

        // Track failed requests
        if (this.options.trackApiCalls && pathname.startsWith('/api/')) {
          await performanceMonitor.trackApiEndpoint(
            pathname,
            request.method,
            responseTime,
            500,
            userId
          )
        }

        throw error
      }
    }
  }

  /**
   * Create a wrapper for database operations
   */
  createDatabaseWrapper() {
    return {
      wrapQuery: async <T>(
        queryName: string,
        tableName: string,
        queryFn: () => Promise<T>
      ): Promise<T> => {
        if (!this.options.trackDatabaseQueries) {
          return await queryFn()
        }

        const startTime = Date.now()
        let success = true
        let errorMessage: string | undefined
        let result: T

        try {
          result = await queryFn()
          return result
        } catch (error) {
          success = false
          errorMessage = error instanceof Error ? error.message : 'Unknown error'
          throw error
        } finally {
          const endTime = Date.now()
          const executionTime = endTime - startTime

          await performanceMonitor.trackDatabaseQuery(
            queryName,
            tableName,
            executionTime,
            0, // Would need to extract rows affected from result
            success,
            errorMessage
          )
        }
      }
    }
  }

  /**
   * Create a wrapper for user flows
   */
  createUserFlowTracker() {
    const activeFlows = new Map<string, { startTime: number; steps: Array<{ name: string; startTime: number }> }>()

    return {
      startFlow: (flowName: string, userId: string, sessionId: string) => {
        const flowKey = `${userId}_${sessionId}_${flowName}`
        activeFlows.set(flowKey, {
          startTime: Date.now(),
          steps: []
        })
      },

      startStep: (flowName: string, stepName: string, userId: string, sessionId: string) => {
        const flowKey = `${userId}_${sessionId}_${flowName}`
        const flow = activeFlows.get(flowKey)
        
        if (flow) {
          flow.steps.push({
            name: stepName,
            startTime: Date.now()
          })
        }
      },

      endStep: async (
        flowName: string, 
        stepName: string, 
        userId: string, 
        sessionId: string, 
        success: boolean = true,
        metadata: Record<string, any> = {}
      ) => {
        const flowKey = `${userId}_${sessionId}_${flowName}`
        const flow = activeFlows.get(flowKey)
        
        if (flow) {
          const stepIndex = flow.steps.findIndex(step => step.name === stepName)
          if (stepIndex !== -1) {
            const step = flow.steps[stepIndex]
            const stepDuration = Date.now() - step.startTime

            await performanceMonitor.trackUserFlow(
              flowName,
              stepName,
              stepDuration,
              success,
              userId,
              sessionId,
              metadata
            )

            // Remove completed step
            flow.steps.splice(stepIndex, 1)
          }
        }
      },

      endFlow: async (
        flowName: string, 
        userId: string, 
        sessionId: string, 
        success: boolean = true
      ) => {
        const flowKey = `${userId}_${sessionId}_${flowName}`
        const flow = activeFlows.get(flowKey)
        
        if (flow) {
          const totalDuration = Date.now() - flow.startTime

          await performanceMonitor.trackUserFlow(
            flowName,
            'complete_flow',
            totalDuration,
            success,
            userId,
            sessionId,
            { total_steps: flow.steps.length }
          )

          activeFlows.delete(flowKey)
        }
      }
    }
  }

  /**
   * Check if path should be excluded from tracking
   */
  private shouldExcludePath(pathname: string): boolean {
    return this.options.excludePaths.some(excludePath => 
      pathname.startsWith(excludePath)
    )
  }

  /**
   * Extract user ID from request
   */
  private extractUserId(request: NextRequest): string | undefined {
    // Try to get user ID from various sources
    const authHeader = request.headers.get('authorization')
    if (authHeader) {
      // Extract from JWT token if available
      // This is a simplified implementation
      try {
        const token = authHeader.replace('Bearer ', '')
        // In a real implementation, you'd decode the JWT
        // For now, return undefined
        return undefined
      } catch {
        return undefined
      }
    }

    // Try to get from cookie
    const userCookie = request.cookies.get('user_id')
    return userCookie?.value
  }

  /**
   * Extract session ID from request
   */
  private extractSessionId(request: NextRequest): string | undefined {
    const sessionCookie = request.cookies.get('session_id')
    return sessionCookie?.value || request.headers.get('x-session-id') || undefined
  }

  /**
   * Get approximate request size
   */
  private getRequestSize(request: NextRequest): number | undefined {
    const contentLength = request.headers.get('content-length')
    return contentLength ? parseInt(contentLength, 10) : undefined
  }

  /**
   * Get approximate response size
   */
  private getResponseSize(response: NextResponse): number | undefined {
    const contentLength = response.headers.get('content-length')
    return contentLength ? parseInt(contentLength, 10) : undefined
  }
}

// Export default instance
export const performanceMiddleware = new PerformanceMiddleware()

// Export database wrapper for easy use
export const dbWrapper = performanceMiddleware.createDatabaseWrapper()

// Export user flow tracker for easy use
export const userFlowTracker = performanceMiddleware.createUserFlowTracker()