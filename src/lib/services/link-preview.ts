import { createClient } from '@/lib/supabase/client'
import type { LinkPreview, ResourceType } from '@/types'
import { LinkPreviewDatabase } from './link-preview-db'
import { YouTubePreviewGenerator } from './preview-generators/youtube'
import { GitHubPreviewGenerator } from './preview-generators/github'
import { GenericPreviewGenerator } from './preview-generators/generic'
import { LinkPreviewErrorHandler, type LinkPreviewError } from './link-preview-error-handler'
import { linkPreviewCache } from './cache/link-preview-cache'

export interface LinkPreviewOptions {
  forceRefresh?: boolean
  timeout?: number
}

export type { LinkPreviewError } from './link-preview-error-handler'

export class LinkPreviewService {
  private static readonly CACHE_TTL_HOURS = 24
  private static readonly DEFAULT_TIMEOUT = 10000

  /**
   * Generate a link preview for the given URL with error handling and fallbacks
   */
  static async generatePreview(
    url: string, 
    options: LinkPreviewOptions = {}
  ): Promise<LinkPreview> {
    try {
      // Validate URL
      this.validateUrl(url)

      // Check enhanced cache first unless force refresh is requested
      if (!options.forceRefresh) {
        const cached = await linkPreviewCache.get(url)
        if (cached) {
          return cached
        }
      }

      // Generate preview with retry logic
      const preview = await LinkPreviewErrorHandler.withRetry(async () => {
        // Generate preview based on type
        if (YouTubePreviewGenerator.isYouTubeUrl(url)) {
          return await YouTubePreviewGenerator.generatePreview(url)
        } else if (GitHubPreviewGenerator.isGitHubUrl(url)) {
          return await GitHubPreviewGenerator.generatePreview(url)
        } else {
          return await GenericPreviewGenerator.generatePreview(url, options.timeout)
        }
      }, {
        maxRetries: 2,
        baseDelay: 1000
      })

      // Cache the successful preview using enhanced cache
      try {
        await linkPreviewCache.set(url, preview)
      } catch (cacheError) {
        // Don't fail the whole operation if caching fails
        console.warn('Failed to cache preview:', cacheError)
      }

      return preview
    } catch (error) {
      const linkPreviewError = LinkPreviewErrorHandler.handleError(error, url)
      
      // Log the error for monitoring
      LinkPreviewErrorHandler.logError(linkPreviewError)

      // Try to return a fallback preview instead of throwing
      return this.createFallbackPreview(url, linkPreviewError)
    }
  }

  /**
   * Detect the type of link based on URL patterns
   */
  static detectLinkType(url: string): ResourceType {
    // Check for YouTube URLs
    if (YouTubePreviewGenerator.isYouTubeUrl(url)) {
      return 'video'
    }
    
    // Check for GitHub URLs
    if (GitHubPreviewGenerator.isGitHubUrl(url)) {
      return 'code'
    }
    
    // Check for direct file links
    if (GenericPreviewGenerator.isDirectFileLink(url)) {
      const contentType = GenericPreviewGenerator.detectContentType(url)
      switch (contentType) {
        case 'document':
          return 'document'
        case 'video':
          return 'video'
        case 'image':
          return 'document' // Treat images as documents for now
        default:
          return 'link'
      }
    }

    return 'link'
  }

  /**
   * Get cached preview from database
   */
  private static async getCachedPreview(url: string): Promise<LinkPreview | null> {
    return LinkPreviewDatabase.getCachedPreview(url)
  }

  /**
   * Cache preview in database
   */
  private static async cachePreview(url: string, preview: LinkPreview): Promise<void> {
    return LinkPreviewDatabase.upsertPreview(url, preview)
  }

  /**
   * Check if cached preview is still valid
   */
  private static isCacheValid(preview: LinkPreview): boolean {
    return LinkPreviewDatabase.isCacheValid(preview, this.CACHE_TTL_HOURS)
  }



  /**
   * Validate URL format
   */
  private static validateUrl(url: string): void {
    try {
      new URL(url)
    } catch {
      throw new Error('Invalid URL format')
    }
  }

  /**
   * Create fallback preview when generation fails
   */
  private static createFallbackPreview(url: string, error?: LinkPreviewError): LinkPreview {
    return LinkPreviewErrorHandler.createFallbackPreview(url, error)
  }

  /**
   * Batch generate previews for multiple URLs with graceful error handling and optimized caching
   */
  static async generateBatchPreviews(
    urls: string[], 
    options: LinkPreviewOptions = {}
  ): Promise<{ url: string; preview: LinkPreview; error?: LinkPreviewError }[]> {
    // First, check cache for all URLs if not forcing refresh
    let cachedPreviews = new Map<string, LinkPreview>()
    let urlsToGenerate = urls

    if (!options.forceRefresh) {
      cachedPreviews = await linkPreviewCache.getMany(urls)
      urlsToGenerate = urls.filter(url => !cachedPreviews.has(url))
    }

    // Generate previews for URLs not in cache
    const generationResults = await Promise.allSettled(
      urlsToGenerate.map(async (url) => {
        try {
          const preview = await this.generatePreviewWithoutCache(url, options)
          return { url, preview }
        } catch (error) {
          const linkPreviewError = LinkPreviewErrorHandler.handleError(error, url)
          const fallbackPreview = this.createFallbackPreview(url, linkPreviewError)
          return { url, preview: fallbackPreview, error: linkPreviewError }
        }
      })
    )

    // Cache newly generated previews
    const newPreviews = new Map<string, LinkPreview>()
    const generatedResults = generationResults.map((result) => {
      if (result.status === 'fulfilled') {
        newPreviews.set(result.value.url, result.value.preview)
        return result.value
      } else {
        const url = 'unknown'
        const error = LinkPreviewErrorHandler.handleError(result.reason, url)
        const fallbackPreview = this.createFallbackPreview(url, error)
        return { url, preview: fallbackPreview, error }
      }
    })

    // Cache all new previews at once
    if (newPreviews.size > 0) {
      try {
        await linkPreviewCache.setMany(newPreviews)
      } catch (cacheError) {
        console.warn('Failed to batch cache previews:', cacheError)
      }
    }

    // Combine cached and generated results
    const allResults: { url: string; preview: LinkPreview; error?: LinkPreviewError }[] = []
    
    for (const url of urls) {
      const cached = cachedPreviews.get(url)
      if (cached) {
        allResults.push({ url, preview: cached })
      } else {
        const generated = generatedResults.find(r => r.url === url)
        if (generated) {
          allResults.push(generated)
        }
      }
    }

    return allResults
  }

  /**
   * Clear expired cache entries
   */
  static async clearExpiredCache(): Promise<number> {
    const maxAgeMs = this.CACHE_TTL_HOURS * 60 * 60 * 1000
    return await linkPreviewCache.invalidateOld(maxAgeMs)
  }

  /**
   * Generate preview without checking cache (internal method)
   */
  private static async generatePreviewWithoutCache(
    url: string, 
    options: LinkPreviewOptions = {}
  ): Promise<LinkPreview> {
    // Generate preview based on type
    if (YouTubePreviewGenerator.isYouTubeUrl(url)) {
      return await YouTubePreviewGenerator.generatePreview(url)
    } else if (GitHubPreviewGenerator.isGitHubUrl(url)) {
      return await GitHubPreviewGenerator.generatePreview(url)
    } else {
      return await GenericPreviewGenerator.generatePreview(url, options.timeout)
    }
  }

  /**
   * Get cache performance metrics
   */
  static async getCacheMetrics() {
    return await linkPreviewCache.getPerformanceMetrics()
  }

  /**
   * Warm cache with frequently accessed URLs
   */
  static async warmCache(urls: string[]): Promise<void> {
    await linkPreviewCache.warmCache(urls)
  }

  /**
   * Preload cache for better performance
   */
  static async preloadCache(urls: string[]): Promise<Map<string, LinkPreview | null>> {
    return await linkPreviewCache.preload(urls)
  }
}