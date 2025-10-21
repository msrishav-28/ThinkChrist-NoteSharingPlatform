import type { LinkPreview } from '@/types'

export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  hits: number
}

export interface CacheStats {
  hits: number
  misses: number
  size: number
  hitRate: number
}

export interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  maxSize?: number // Maximum number of entries
  enableStats?: boolean
}

/**
 * Abstract cache interface for different cache implementations
 */
export abstract class CacheManager<T = any> {
  protected stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    hitRate: 0
  }

  abstract get(key: string): Promise<T | null>
  abstract set(key: string, value: T, options?: CacheOptions): Promise<void>
  abstract delete(key: string): Promise<boolean>
  abstract clear(): Promise<void>
  abstract has(key: string): Promise<boolean>
  abstract size(): Promise<number>

  /**
   * Get multiple values by keys
   */
  async getMany(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>()
    
    await Promise.all(
      keys.map(async (key) => {
        const value = await this.get(key)
        if (value !== null) {
          results.set(key, value)
        }
      })
    )
    
    return results
  }

  /**
   * Set multiple key-value pairs
   */
  async setMany(entries: Map<string, T>, options?: CacheOptions): Promise<void> {
    await Promise.all(
      Array.from(entries.entries()).map(([key, value]) =>
        this.set(key, value, options)
      )
    )
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return {
      ...this.stats,
      hitRate: this.stats.hits + this.stats.misses > 0 
        ? this.stats.hits / (this.stats.hits + this.stats.misses) 
        : 0
    }
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      hitRate: 0
    }
  }

  protected recordHit(): void {
    this.stats.hits++
  }

  protected recordMiss(): void {
    this.stats.misses++
  }

  protected updateSize(newSize: number): void {
    this.stats.size = newSize
  }
}

/**
 * In-memory cache implementation with LRU eviction
 */
export class MemoryCache<T> extends CacheManager<T> {
  private cache = new Map<string, CacheEntry<T>>()
  private accessOrder = new Map<string, number>()
  private accessCounter = 0
  private readonly maxSize: number
  private readonly defaultTtl: number

  constructor(options: CacheOptions = {}) {
    super()
    this.maxSize = options.maxSize || 1000
    this.defaultTtl = options.ttl || 24 * 60 * 60 * 1000 // 24 hours
  }

  async get(key: string): Promise<T | null> {
    const entry = this.cache.get(key)
    
    if (!entry) {
      this.recordMiss()
      return null
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      this.accessOrder.delete(key)
      this.updateSize(this.cache.size)
      this.recordMiss()
      return null
    }

    // Update access order for LRU
    this.accessOrder.set(key, ++this.accessCounter)
    entry.hits++
    this.recordHit()
    
    return entry.data
  }

  async set(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl || this.defaultTtl
    
    // Evict if at max size and key doesn't exist
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU()
    }

    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl,
      hits: 0
    }

    this.cache.set(key, entry)
    this.accessOrder.set(key, ++this.accessCounter)
    this.updateSize(this.cache.size)
  }

  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key)
    this.accessOrder.delete(key)
    this.updateSize(this.cache.size)
    return deleted
  }

  async clear(): Promise<void> {
    this.cache.clear()
    this.accessOrder.clear()
    this.updateSize(0)
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key)
    if (!entry) return false
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      this.accessOrder.delete(key)
      this.updateSize(this.cache.size)
      return false
    }
    
    return true
  }

  async size(): Promise<number> {
    return this.cache.size
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null
    let oldestAccess = Infinity

    for (const [key, accessTime] of Array.from(this.accessOrder)) {
      if (accessTime < oldestAccess) {
        oldestAccess = accessTime
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
      this.accessOrder.delete(oldestKey)
    }
  }

  /**
   * Clean up expired entries
   */
  async cleanup(): Promise<number> {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of Array.from(this.cache)) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
        this.accessOrder.delete(key)
        cleaned++
      }
    }

    this.updateSize(this.cache.size)
    return cleaned
  }

  /**
   * Get cache entries sorted by access frequency
   */
  getPopularEntries(limit: number = 10): Array<{ key: string; hits: number; data: T }> {
    return Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, hits: entry.hits, data: entry.data }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, limit)
  }
}

/**
 * Multi-tier cache with memory and database layers
 */
export class TieredCache<T> extends CacheManager<T> {
  constructor(
    private memoryCache: MemoryCache<T>,
    private databaseCache: CacheManager<T>
  ) {
    super()
  }

  async get(key: string): Promise<T | null> {
    // Try memory cache first
    let value = await this.memoryCache.get(key)
    if (value !== null) {
      this.recordHit()
      return value
    }

    // Try database cache
    value = await this.databaseCache.get(key)
    if (value !== null) {
      // Promote to memory cache
      await this.memoryCache.set(key, value)
      this.recordHit()
      return value
    }

    this.recordMiss()
    return null
  }

  async set(key: string, value: T, options?: CacheOptions): Promise<void> {
    // Set in both caches
    await Promise.all([
      this.memoryCache.set(key, value, options),
      this.databaseCache.set(key, value, options)
    ])
  }

  async delete(key: string): Promise<boolean> {
    const [memoryDeleted, dbDeleted] = await Promise.all([
      this.memoryCache.delete(key),
      this.databaseCache.delete(key)
    ])
    return memoryDeleted || dbDeleted
  }

  async clear(): Promise<void> {
    await Promise.all([
      this.memoryCache.clear(),
      this.databaseCache.clear()
    ])
  }

  async has(key: string): Promise<boolean> {
    return (await this.memoryCache.has(key)) || (await this.databaseCache.has(key))
  }

  async size(): Promise<number> {
    // Return database cache size as it's the authoritative source
    return await this.databaseCache.size()
  }

  /**
   * Get combined statistics from both cache layers
   */
  getCombinedStats(): {
    memory: CacheStats
    database: CacheStats
    combined: CacheStats
  } {
    const memoryStats = this.memoryCache.getStats()
    const databaseStats = this.databaseCache.getStats()
    
    return {
      memory: memoryStats,
      database: databaseStats,
      combined: {
        hits: this.stats.hits,
        misses: this.stats.misses,
        size: this.stats.size,
        hitRate: this.stats.hits + this.stats.misses > 0 
          ? this.stats.hits / (this.stats.hits + this.stats.misses) 
          : 0
      }
    }
  }
}