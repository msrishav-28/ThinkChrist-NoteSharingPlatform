/**
 * Comprehensive Error Handling Service
 * Provides centralized error handling, logging, and user-friendly error messages
 */

import { toast } from '@/lib/hooks/use-toast'

export interface ErrorContext {
  component?: string
  action?: string
  userId?: string
  resourceId?: string
  additionalData?: Record<string, any>
}

export interface ErrorReport {
  id: string
  message: string
  stack?: string
  context: ErrorContext
  timestamp: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  userAgent?: string
  url?: string
}

export class ErrorHandlingService {
  private static errorQueue: ErrorReport[] = []
  private static maxQueueSize = 100

  /**
   * Handle and report errors with appropriate user feedback
   */
  static handleError(
    error: Error | string,
    context: ErrorContext = {},
    options: {
      showToast?: boolean
      severity?: ErrorReport['severity']
      fallbackMessage?: string
    } = {}
  ): string {
    const {
      showToast = true,
      severity = 'medium',
      fallbackMessage = 'An unexpected error occurred'
    } = options

    const errorMessage = typeof error === 'string' ? error : error.message
    const errorStack = typeof error === 'string' ? undefined : error.stack

    // Generate error ID
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create error report
    const errorReport: ErrorReport = {
      id: errorId,
      message: errorMessage,
      stack: errorStack,
      context,
      timestamp: new Date().toISOString(),
      severity,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined
    }

    // Log error
    this.logError(errorReport)

    // Queue error for reporting
    this.queueError(errorReport)

    // Show user-friendly message
    if (showToast) {
      const userMessage = this.getUserFriendlyMessage(errorMessage, context)
      toast({
        title: 'Error',
        description: userMessage,
        variant: 'destructive',
      })
    }

    return errorId
  }

  /**
   * Handle API errors with specific handling for common cases
   */
  static handleApiError(
    error: any,
    context: ErrorContext = {},
    options: {
      showToast?: boolean
      fallbackMessage?: string
    } = {}
  ): string {
    const { showToast = true, fallbackMessage } = options

    let message = fallbackMessage || 'An error occurred while processing your request'
    let severity: ErrorReport['severity'] = 'medium'

    // Handle Supabase errors
    if (error?.code) {
      switch (error.code) {
        case 'PGRST116': // No rows returned
          message = 'The requested resource was not found'
          severity = 'low'
          break
        case '23505': // Unique violation
          message = 'This item already exists'
          severity = 'low'
          break
        case '23503': // Foreign key violation
          message = 'Cannot perform this action due to related data'
          severity = 'medium'
          break
        case '42501': // Insufficient privilege
          message = 'You do not have permission to perform this action'
          severity = 'medium'
          break
        case 'PGRST301': // Row level security violation
          message = 'Access denied'
          severity = 'medium'
          break
        default:
          message = error.message || message
      }
    } else if (error?.message) {
      message = error.message
    }

    return this.handleError(error, context, {
      showToast,
      severity,
      fallbackMessage: message
    })
  }

  /**
   * Handle external service failures with graceful fallbacks
   */
  static handleExternalServiceError(
    serviceName: string,
    error: any,
    context: ErrorContext = {},
    fallbackAction?: () => void
  ): string {
    const message = `${serviceName} service is temporarily unavailable`
    
    const errorId = this.handleError(error, {
      ...context,
      component: `${serviceName}Service`
    }, {
      showToast: true,
      severity: 'medium',
      fallbackMessage: message
    })

    // Execute fallback action if provided
    if (fallbackAction) {
      try {
        fallbackAction()
      } catch (fallbackError) {
        console.error('Fallback action failed:', fallbackError)
      }
    }

    return errorId
  }

  /**
   * Handle upload errors with specific guidance
   */
  static handleUploadError(
    error: any,
    context: ErrorContext = {}
  ): string {
    let message = 'Failed to upload file'
    let severity: ErrorReport['severity'] = 'medium'

    if (error?.message) {
      const errorMsg = error.message.toLowerCase()
      
      if (errorMsg.includes('file too large') || errorMsg.includes('size')) {
        message = 'File is too large. Please choose a smaller file (max 50MB)'
        severity = 'low'
      } else if (errorMsg.includes('type') || errorMsg.includes('format')) {
        message = 'File type not supported. Please choose a different file'
        severity = 'low'
      } else if (errorMsg.includes('network') || errorMsg.includes('connection')) {
        message = 'Network error. Please check your connection and try again'
        severity = 'medium'
      } else if (errorMsg.includes('storage') || errorMsg.includes('bucket')) {
        message = 'Storage service unavailable. Please try again later'
        severity = 'high'
      } else if (errorMsg.includes('permission') || errorMsg.includes('unauthorized')) {
        message = 'You do not have permission to upload files'
        severity = 'medium'
      }
    }

    return this.handleError(error, {
      ...context,
      action: 'upload'
    }, {
      showToast: true,
      severity,
      fallbackMessage: message
    })
  }

  /**
   * Handle search errors with fallback options
   */
  static handleSearchError(
    error: any,
    context: ErrorContext = {},
    fallbackResults?: any[]
  ): string {
    const message = 'Search is temporarily unavailable'
    
    const errorId = this.handleError(error, {
      ...context,
      action: 'search'
    }, {
      showToast: true,
      severity: 'medium',
      fallbackMessage: message
    })

    // Could implement fallback search logic here
    if (fallbackResults) {
      toast({
        title: 'Search Limited',
        description: 'Showing cached results due to search service issues',
        variant: 'default',
      })
    }

    return errorId
  }

  /**
   * Get user-friendly error message
   */
  private static getUserFriendlyMessage(
    errorMessage: string,
    context: ErrorContext
  ): string {
    const lowerMessage = errorMessage.toLowerCase()

    // Network errors
    if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
      return 'Network connection issue. Please check your internet connection and try again.'
    }

    // Authentication errors
    if (lowerMessage.includes('unauthorized') || lowerMessage.includes('authentication')) {
      return 'Please sign in to continue.'
    }

    // Permission errors
    if (lowerMessage.includes('permission') || lowerMessage.includes('forbidden')) {
      return 'You do not have permission to perform this action.'
    }

    // Validation errors
    if (lowerMessage.includes('validation') || lowerMessage.includes('invalid')) {
      return 'Please check your input and try again.'
    }

    // Server errors
    if (lowerMessage.includes('server') || lowerMessage.includes('internal')) {
      return 'Server error. Please try again in a few moments.'
    }

    // Context-specific messages
    if (context.action === 'upload') {
      return 'Failed to upload file. Please try again.'
    }

    if (context.action === 'search') {
      return 'Search failed. Please try again.'
    }

    if (context.component === 'LinkPreview') {
      return 'Unable to generate link preview. The link will still work.'
    }

    // Default fallback
    return errorMessage.length > 100 
      ? 'An unexpected error occurred. Please try again.'
      : errorMessage
  }

  /**
   * Log error to console and external services
   */
  private static logError(errorReport: ErrorReport): void {
    // Console logging
    console.group(`🚨 Error [${errorReport.severity.toUpperCase()}] - ${errorReport.id}`)
    console.error('Message:', errorReport.message)
    console.error('Context:', errorReport.context)
    if (errorReport.stack) {
      console.error('Stack:', errorReport.stack)
    }
    console.groupEnd()

    // In production, you would send to external logging service
    // Example: Sentry, LogRocket, DataDog, etc.
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(new Error(errorReport.message), {
      //   tags: { errorId: errorReport.id, severity: errorReport.severity },
      //   contexts: { errorReport }
      // })
    }
  }

  /**
   * Queue error for batch reporting
   */
  private static queueError(errorReport: ErrorReport): void {
    this.errorQueue.push(errorReport)

    // Maintain queue size
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift()
    }

    // In a real app, you might batch send these to your backend
    // For now, we'll just store them locally
    if (typeof window !== 'undefined') {
      try {
        const existingErrors = JSON.parse(
          localStorage.getItem('error_reports') || '[]'
        )
        existingErrors.push(errorReport)
        
        // Keep only last 50 errors in localStorage
        const recentErrors = existingErrors.slice(-50)
        localStorage.setItem('error_reports', JSON.stringify(recentErrors))
      } catch (e) {
        console.warn('Failed to store error report in localStorage:', e)
      }
    }
  }

  /**
   * Get recent error reports (for debugging)
   */
  static getRecentErrors(): ErrorReport[] {
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem('error_reports') || '[]')
      } catch (e) {
        console.warn('Failed to retrieve error reports:', e)
      }
    }
    return []
  }

  /**
   * Clear error reports
   */
  static clearErrorReports(): void {
    this.errorQueue = []
    if (typeof window !== 'undefined') {
      localStorage.removeItem('error_reports')
    }
  }

  /**
   * Create a safe async wrapper that handles errors
   */
  static createSafeAsyncWrapper<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context: ErrorContext = {},
    options: {
      fallbackValue?: R
      showToast?: boolean
      onError?: (error: any) => void
    } = {}
  ) {
    return async (...args: T): Promise<R | undefined> => {
      try {
        return await fn(...args)
      } catch (error) {
        const errorId = this.handleError(error as Error, context, {
          showToast: options.showToast ?? true
        })

        if (options.onError) {
          options.onError(error)
        }

        return options.fallbackValue
      }
    }
  }

  /**
   * Retry wrapper with exponential backoff
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    options: {
      maxRetries?: number
      baseDelay?: number
      maxDelay?: number
      context?: ErrorContext
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      context = {}
    } = options

    let lastError: any

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error

        if (attempt === maxRetries) {
          // Final attempt failed
          this.handleError(error as Error, {
            ...context,
            additionalData: { attempt: attempt + 1, maxRetries }
          })
          throw error
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError
  }
}