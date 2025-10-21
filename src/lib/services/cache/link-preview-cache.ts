import type { LinkPreview } from '@/types'
import { LinkPreviewDatabase } from '../link-preview-db'
import { CacheManager, MemoryCache, TieredCache, type CacheOptions } from './cache-manager'

/**
 * Database cache implementation for link previews
 */
class DatabaseLinkPreviewCache extends CacheManager<LinkPreview> {
  async get(key: string): Promise<LinkPreview | null> {
    try {
      const preview = await LinkPreviewDatabase.getCachedPreview(key)
      if (preview) {
        this.recordHit()
        return preview
      }
      this.recordMiss()
      return null
    } catch (error) {
      this.recordMiss()
      return null
    }
  }

  async set(key: string, value: LinkPreview, options?: CacheOptions): Promise<void> {
    try {
      await LinkPreviewDatabase.upsertPreview(key, value)
      this.updateSize(await this.size())
    } catch (error) {
      console.warn('Failed to cache preview in database:', error)
      throw error
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      await LinkPreviewDatabase.deleteCachedPreview(key)
      this.updateSize(await this.size())
      return true
    } catch (error) {
      console.warn('Failed to delete cached preview:', error)
      return false
    }
  }

  async clear(): Promise<void> {
    // This would require a method to clear all previews - not implemented for safety
    throw new Error('Clear all operation not supported for database cache')
  }

  async has(key: string): Promise<boolean> {
    const preview = await this.get(key)
    return preview !== null
  }

  async size(): Promise<number> {
    try {
      const stats = await LinkPreviewDatabase.getCacheStats()
      return stats.total
    } catch (error) {
      return 0
    }
  }

  async getMany(keys: string[]): Promise<Map<string, LinkPreview>> {
    try {
      const previews = await LinkPreviewDatabase.getBatchCachedPreviews(keys)
      keys.forEach(key => {
        if (previews.has(key)) {
          this.recordHit()
        } else {
          this.recordMiss()
        }
      })
      return previews
    } catch (error) {
      keys.forEach(() => this.recordMiss())
      return new Map()
    }
  }
}

/**
 * Enhanced link preview cache with multi-tier caching and performance optimizations
 */
export class LinkPreviewCache {
  private cache: TieredCache<LinkPreview>
  private memoryCache: MemoryCache<LinkPreview>
  private databaseCache: DatabaseLinkPreviewCache
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(options: {
    memoryTtl?: number
    memoryMaxSize?: number
    enableAutoCleanup?: boolean
    cleanupIntervalMs?: number
  } = {}) {
    const {
      memoryTtl = 30 * 60 * 1000, // 30 minutes for memory cache
      memoryMaxSize = 500,
      enableAutoCleanup = true,
      cleanupIntervalMs = 5 * 60 * 1000 // 5 minutes
    } = options

    this.memoryCache = new MemoryCache<LinkPreview>({
      ttl: memoryTtl,
      maxSize: memoryMaxSize
    })

    this.databaseCache = new DatabaseLinkPreviewCache()
    this.cache = new TieredCache(this.memoryCache, this.databaseCache)

    if (enableAutoCleanup) {
      this.startAutoCleanup(cleanupIntervalMs)
    }
  }

  /**
   * Get a cached link preview with intelligent cache warming
   */
  async get(url: string): Promise<LinkPreview | null> {
    return await this.cache.get(url)
  }

  /**
   * Cache a link preview with optimized storage
   */
  async set(url: string, preview: LinkPreview, options?: CacheOptions): Promise<void> {
    // Optimize preview data before caching
    const optimizedPreview = this.optimizePreviewForCache(preview)
    await this.cache.set(url, optimizedPreview, options)
  }

  /**
   * Get multiple previews efficiently
   */
  async getMany(urls: string[]): Promise<Map<string, LinkPreview>> {
    // Try memory cache first for all URLs
    const memoryResults = await this.memoryCache.getMany(urls)
    const missingUrls = urls.filter(url => !memoryResults.has(url))

    if (missingUrls.length === 0) {
      return memoryResults
    }

    // Get missing ones from database
    const databaseResults = await this.databaseCache.getMany(missingUrls)
    
    // Promote database hits to memory cache
    if (databaseResults.size > 0) {
      await this.memoryCache.setMany(databaseResults)
    }

    // Combine results
    const combinedResults = new Map([...Array.from(memoryResults), ...Array.from(databaseResults)])
    return combinedResults
  }

  /**
   * Cache multiple previews efficiently
   */
  async setMany(previews: Map<string, LinkPreview>, options?: CacheOptions): Promise<void> {
    // Optimize all previews
    const optimizedPreviews = new Map()
    for (const [url, preview] of Array.from(previews)) {
      optimizedPreviews.set(url, this.optimizePreviewForCache(preview))
    }

    await this.cache.setMany(optimizedPreviews, options)
  }

  /**
   * Delete a cached preview
   */
  async delete(url: string): Promise<boolean> {
    return await this.cache.delete(url)
  }

  /**
   * Check if a preview is cached and valid
   */
  async has(url: string): Promise<boolean> {
    return await this.cache.has(url)
  }

  /**
   * Get cache statistics and performance metrics
   */
  getStats() {
    return this.cache.getCombinedStats()
  }

  /**
   * Get popular cached previews for analytics
   */
  getPopularPreviews(limit: number = 10) {
    return this.memoryCache.getPopularEntries(limit)
  }

  /**
   * Warm cache with frequently accessed URLs
   */
  async warmCache(urls: string[]): Promise<void> {
    // Get previews that are already in database but not in memory
    const databaseResults = await this.databaseCache.getMany(urls)
    
    if (databaseResults.size > 0) {
      await this.memoryCache.setMany(databaseResults)
    }
  }

  /**
   * Invalidate cache entries older than specified age
   */
  async invalidateOld(maxAgeMs: number): Promise<number> {
    const cutoffTime = Date.now() - maxAgeMs
    
    // Clean memory cache
    const memoryCleanedCount = await this.memoryCache.cleanup()
    
    // Clean database cache
    const dbCleanedCount = await LinkPreviewDatabase.clearExpiredCache(maxAgeMs / (60 * 60 * 1000))
    
    return memoryCleanedCount + dbCleanedCount
  }

  /**
   * Preload cache with batch of URLs
   */
  async preload(urls: string[]): Promise<Map<string, LinkPreview | null>> {
    const results = new Map<string, LinkPreview | null>()
    
    // Check what's already cached
    const cached = await this.getMany(urls)
    
    for (const url of urls) {
      results.set(url, cached.get(url) || null)
    }
    
    return results
  }

  /**
   * Get cache hit rate and performance metrics
   */
  async getPerformanceMetrics(): Promise<{
    hitRate: number
    memoryHitRate: number
    databaseHitRate: number
    averageResponseTime: number
    cacheSize: number
    memorySize: number
  }> {
    const stats = this.getStats()
    const cacheSize = await this.cache.size()
    const memorySize = await this.memoryCache.size()

    return {
      hitRate: stats.combined.hitRate,
      memoryHitRate: stats.memory.hitRate,
      databaseHitRate: stats.database.hitRate,
      averageResponseTime: 0, // Would need to track timing
      cacheSize,
      memorySize
    }
  }

  /**
   * Optimize preview data for efficient caching
   */
  private optimizePreviewForCache(preview: LinkPreview): LinkPreview {
    return {
      ...preview,
      // Truncate long descriptions to save memory
      description: preview.description?.length > 500 
        ? preview.description.substring(0, 500) + '...' 
        : preview.description,
      // Remove unnecessary metadata for caching
      metadata: {
        ...preview.metadata,
        // Keep only essential metadata
        duration: preview.metadata?.duration,
        author: preview.metadata?.author,
        publishedAt: preview.metadata?.publishedAt
      }
    }
  }

  /**
   * Start automatic cleanup of expired entries
   */
  private startAutoCleanup(intervalMs: number): void {
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.memoryCache.cleanup()
        // Optionally clean database cache less frequently
        if (Math.random() < 0.1) { // 10% chance each cleanup cycle
          await LinkPreviewDatabase.clearExpiredCache(24) // 24 hours
        }
      } catch (error) {
        console.warn('Cache cleanup failed:', error)
      }
    }, intervalMs)
  }

  /**
   * Stop automatic cleanup
   */
  stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  /**
   * Destroy cache and cleanup resources
   */
  async destroy(): Promise<void> {
    this.stopAutoCleanup()
    await this.memoryCache.clear()
  }
}

// Export singleton instance
export const linkPreviewCache = new LinkPreviewCache()