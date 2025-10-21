import type { LinkPreview } from '@/types'

export interface LinkPreviewError {
  code: 'NETWORK_ERROR' | 'PARSE_ERROR' | 'TIMEOUT' | 'INVALID_URL' | 'API_ERROR' | 'RATE_LIMIT' | 'NOT_FOUND'
  message: string
  originalError?: Error
  url?: string
  retryable: boolean
  retryAfter?: number
}

export interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
}

export class LinkPreviewErrorHandler {
  private static readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  }

  /**
   * Handle errors and create appropriate error objects
   */
  static handleError(error: unknown, url: string): LinkPreviewError {
    if (error instanceof Error) {
      // Network errors
      if (error.message.includes('fetch') || error.message.includes('network')) {
        return {
          code: 'NETWORK_ERROR',
          message: 'Network error occurred while fetching preview',
          originalError: error,
          url,
          retryable: true
        }
      }

      // Timeout errors
      if (error.message.includes('timeout') || error.message.includes('aborted')) {
        return {
          code: 'TIMEOUT',
          message: 'Request timed out while generating preview',
          originalError: error,
          url,
          retryable: true
        }
      }

      // URL validation errors
      if (error.message.includes('Invalid URL') || error.message.includes('URL')) {
        return {
          code: 'INVALID_URL',
          message: `Invalid URL format: ${url}`,
          originalError: error,
          url,
          retryable: false
        }
      }

      // API errors
      if (error.message.includes('API') || error.message.includes('401') || error.message.includes('403')) {
        return {
          code: 'API_ERROR',
          message: 'API error occurred while fetching preview data',
          originalError: error,
          url,
          retryable: false
        }
      }

      // Rate limit errors
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        const retryAfter = this.extractRetryAfter(error.message)
        return {
          code: 'RATE_LIMIT',
          message: 'Rate limit exceeded. Please try again later.',
          originalError: error,
          url,
          retryable: true,
          retryAfter
        }
      }

      // Not found errors
      if (error.message.includes('404') || error.message.includes('not found')) {
        return {
          code: 'NOT_FOUND',
          message: 'Resource not found',
          originalError: error,
          url,
          retryable: false
        }
      }

      // Parse errors
      if (error.message.includes('parse') || error.message.includes('JSON')) {
        return {
          code: 'PARSE_ERROR',
          message: 'Failed to parse response data',
          originalError: error,
          url,
          retryable: true
        }
      }
    }

    // Generic error
    return {
      code: 'NETWORK_ERROR',
      message: 'Unknown error occurred while generating preview',
      originalError: error as Error,
      url,
      retryable: true
    }
  }

  /**
   * Execute function with retry logic
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const retryConfig = { ...this.DEFAULT_RETRY_CONFIG, ...config }
    let lastError: Error

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error
        
        // Don't retry on last attempt
        if (attempt === retryConfig.maxRetries) {
          break
        }

        // Check if error is retryable
        const linkPreviewError = this.handleError(error, '')
        if (!linkPreviewError.retryable) {
          break
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt),
          retryConfig.maxDelay
        )

        // Add jitter to prevent thundering herd
        const jitteredDelay = delay + Math.random() * 1000

        await this.sleep(jitteredDelay)
      }
    }

    throw lastError!
  }

  /**
   * Create fallback preview when all else fails
   */
  static createFallbackPreview(url: string, error?: LinkPreviewError): LinkPreview {
    try {
      const domain = new URL(url).hostname
      return {
        title: domain,
        description: error ? `Preview unavailable: ${error.message}` : `Link to ${domain}`,
        favicon: `https://www.google.com/s2/favicons?domain=${domain}`,
        type: 'generic',
        metadata: {
          domain,
          fallback: true,
          error: error ? {
            code: error.code,
            message: error.message
          } : undefined
        },
        cached_at: new Date().toISOString()
      }
    } catch {
      return {
        title: 'External Link',
        description: error ? `Preview unavailable: ${error.message}` : 'External web content',
        type: 'generic',
        metadata: {
          fallback: true,
          error: error ? {
            code: error.code,
            message: error.message
          } : undefined
        },
        cached_at: new Date().toISOString()
      }
    }
  }

  /**
   * Create graceful degradation preview with limited information
   */
  static createDegradedPreview(url: string, partialData?: Partial<LinkPreview>): LinkPreview {
    try {
      const domain = new URL(url).hostname
      return {
        title: partialData?.title || domain,
        description: partialData?.description || `Content from ${domain}`,
        thumbnail: partialData?.thumbnail,
        favicon: partialData?.favicon || `https://www.google.com/s2/favicons?domain=${domain}`,
        type: partialData?.type || 'generic',
        metadata: {
          ...partialData?.metadata,
          domain,
          degraded: true
        },
        cached_at: new Date().toISOString()
      }
    } catch {
      return {
        title: partialData?.title || 'External Link',
        description: partialData?.description || 'External web content',
        thumbnail: partialData?.thumbnail,
        favicon: partialData?.favicon,
        type: partialData?.type || 'generic',
        metadata: {
          ...partialData?.metadata,
          degraded: true
        },
        cached_at: new Date().toISOString()
      }
    }
  }

  /**
   * Check if error should trigger circuit breaker
   */
  static shouldTriggerCircuitBreaker(error: LinkPreviewError): boolean {
    return error.code === 'RATE_LIMIT' || 
           error.code === 'API_ERROR' ||
           (error.code === 'NETWORK_ERROR' && error.message.includes('503'))
  }

  /**
   * Get user-friendly error message
   */
  static getUserFriendlyMessage(error: LinkPreviewError): string {
    switch (error.code) {
      case 'NETWORK_ERROR':
        return 'Unable to connect to the website. Please check your internet connection.'
      case 'TIMEOUT':
        return 'The website took too long to respond. Please try again later.'
      case 'INVALID_URL':
        return 'The provided URL is not valid.'
      case 'API_ERROR':
        return 'Unable to fetch preview data from the service.'
      case 'RATE_LIMIT':
        return 'Too many requests. Please wait a moment before trying again.'
      case 'NOT_FOUND':
        return 'The requested resource could not be found.'
      case 'PARSE_ERROR':
        return 'Unable to process the website content.'
      default:
        return 'Unable to generate preview for this link.'
    }
  }

  /**
   * Log error for monitoring
   */
  static logError(error: LinkPreviewError): void {
    const logData = {
      code: error.code,
      message: error.message,
      url: error.url,
      retryable: error.retryable,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server'
    }

    // In production, this would send to a logging service
    if (process.env.NODE_ENV === 'development') {
      console.warn('Link Preview Error:', logData)
    }

    // Could integrate with services like Sentry, LogRocket, etc.
    // Sentry.captureException(error.originalError, { extra: logData })
  }

  /**
   * Extract retry-after value from error message
   */
  private static extractRetryAfter(message: string): number | undefined {
    const match = message.match(/retry.*?(\d+)/i)
    return match ? parseInt(match[1]) * 1000 : undefined
  }

  /**
   * Sleep utility for retry delays
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Check if URL is safe to retry
   */
  static isSafeToRetry(url: string, error: LinkPreviewError): boolean {
    // Don't retry invalid URLs
    if (error.code === 'INVALID_URL') {
      return false
    }

    // Don't retry not found errors
    if (error.code === 'NOT_FOUND') {
      return false
    }

    // Don't retry API errors (usually auth issues)
    if (error.code === 'API_ERROR') {
      return false
    }

    // Check for malicious URLs
    try {
      const parsedUrl = new URL(url)
      const hostname = parsedUrl.hostname.toLowerCase()
      
      // Block localhost and private IPs
      if (hostname === 'localhost' || 
          hostname === '127.0.0.1' ||
          hostname.startsWith('192.168.') ||
          hostname.startsWith('10.') ||
          hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
        return false
      }

      return true
    } catch {
      return false
    }
  }
}