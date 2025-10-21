import { createClient } from '@/lib/supabase/client'
import type { LinkPreview } from '@/types'

export interface LinkPreviewRecord {
  id: string
  url: string
  title: string
  description: string | null
  thumbnail: string | null
  favicon: string | null
  type: string
  metadata: Record<string, any>
  cached_at: string
  created_at: string
  updated_at: string
}

/**
 * Database operations for link previews
 */
export class LinkPreviewDatabase {
  /**
   * Get a cached link preview by URL
   */
  static async getCachedPreview(url: string): Promise<LinkPreview | null> {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('link_previews')
        .select('*')
        .eq('url', url)
        .single()

      if (error || !data) {
        return null
      }

      return this.recordToLinkPreview(data)
    } catch (error) {
      console.warn('Failed to retrieve cached preview:', error)
      return null
    }
  }

  /**
   * Store or update a link preview in the cache
   */
  static async upsertPreview(url: string, preview: LinkPreview): Promise<void> {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('link_previews')
        .upsert({
          url,
          title: preview.title,
          description: preview.description || null,
          thumbnail: preview.thumbnail || null,
          favicon: preview.favicon || null,
          type: preview.type,
          metadata: preview.metadata || {},
          cached_at: new Date().toISOString()
        }, {
          onConflict: 'url'
        })

      if (error) {
        console.warn('Failed to cache preview:', error)
        throw error
      }
    } catch (error) {
      console.warn('Failed to cache preview:', error)
      throw error
    }
  }

  /**
   * Get multiple cached previews by URLs
   */
  static async getBatchCachedPreviews(urls: string[]): Promise<Map<string, LinkPreview>> {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('link_previews')
        .select('*')
        .in('url', urls)

      if (error) {
        console.warn('Failed to retrieve batch cached previews:', error)
        return new Map()
      }

      const previewMap = new Map<string, LinkPreview>()
      data?.forEach(record => {
        previewMap.set(record.url, this.recordToLinkPreview(record))
      })

      return previewMap
    } catch (error) {
      console.warn('Failed to retrieve batch cached previews:', error)
      return new Map()
    }
  }

  /**
   * Delete expired cache entries
   */
  static async clearExpiredCache(ttlHours: number = 24): Promise<number> {
    try {
      const supabase = createClient()
      const expiredTime = new Date()
      expiredTime.setHours(expiredTime.getHours() - ttlHours)

      const { data, error } = await supabase
        .from('link_previews')
        .delete()
        .lt('cached_at', expiredTime.toISOString())
        .select('id')

      if (error) {
        console.warn('Failed to clear expired cache:', error)
        throw error
      }

      return data?.length || 0
    } catch (error) {
      console.warn('Failed to clear expired cache:', error)
      throw error
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    total: number
    byType: Record<string, number>
    oldestEntry: string | null
    newestEntry: string | null
  }> {
    try {
      const supabase = createClient()
      
      // Get total count and type distribution
      const { data: countData, error: countError } = await supabase
        .from('link_previews')
        .select('type')

      if (countError) {
        throw countError
      }

      // Get oldest and newest entries
      const { data: oldestData } = await supabase
        .from('link_previews')
        .select('cached_at')
        .order('cached_at', { ascending: true })
        .limit(1)
        .single()

      const { data: newestData } = await supabase
        .from('link_previews')
        .select('cached_at')
        .order('cached_at', { ascending: false })
        .limit(1)
        .single()

      // Calculate type distribution
      const byType: Record<string, number> = {}
      countData?.forEach(record => {
        byType[record.type] = (byType[record.type] || 0) + 1
      })

      return {
        total: countData?.length || 0,
        byType,
        oldestEntry: oldestData?.cached_at || null,
        newestEntry: newestData?.cached_at || null
      }
    } catch (error) {
      console.warn('Failed to get cache stats:', error)
      return {
        total: 0,
        byType: {},
        oldestEntry: null,
        newestEntry: null
      }
    }
  }

  /**
   * Delete specific cached preview
   */
  static async deleteCachedPreview(url: string): Promise<void> {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('link_previews')
        .delete()
        .eq('url', url)

      if (error) {
        console.warn('Failed to delete cached preview:', error)
        throw error
      }
    } catch (error) {
      console.warn('Failed to delete cached preview:', error)
      throw error
    }
  }

  /**
   * Search cached previews by title or description
   */
  static async searchCachedPreviews(
    query: string, 
    limit: number = 20
  ): Promise<LinkPreview[]> {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('link_previews')
        .select('*')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .order('cached_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.warn('Failed to search cached previews:', error)
        return []
      }

      return data?.map(record => this.recordToLinkPreview(record)) || []
    } catch (error) {
      console.warn('Failed to search cached previews:', error)
      return []
    }
  }

  /**
   * Get previews by type
   */
  static async getPreviewsByType(
    type: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<LinkPreview[]> {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('link_previews')
        .select('*')
        .eq('type', type)
        .order('cached_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        console.warn('Failed to get previews by type:', error)
        return []
      }

      return data?.map(record => this.recordToLinkPreview(record)) || []
    } catch (error) {
      console.warn('Failed to get previews by type:', error)
      return []
    }
  }

  /**
   * Convert database record to LinkPreview interface
   */
  private static recordToLinkPreview(record: LinkPreviewRecord): LinkPreview {
    return {
      title: record.title,
      description: record.description || '',
      thumbnail: record.thumbnail || undefined,
      favicon: record.favicon || undefined,
      type: record.type as LinkPreview['type'],
      metadata: record.metadata || {},
      cached_at: record.cached_at
    }
  }

  /**
   * Check if cache entry is valid based on TTL
   */
  static isCacheValid(preview: LinkPreview, ttlHours: number = 24): boolean {
    const cacheTime = new Date(preview.cached_at).getTime()
    const now = Date.now()
    const ttlMs = ttlHours * 60 * 60 * 1000
    
    return (now - cacheTime) < ttlMs
  }

  /**
   * Refresh a specific cached preview
   */
  static async refreshCachedPreview(url: string): Promise<void> {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('link_previews')
        .update({ cached_at: new Date().toISOString() })
        .eq('url', url)

      if (error) {
        console.warn('Failed to refresh cached preview:', error)
        throw error
      }
    } catch (error) {
      console.warn('Failed to refresh cached preview:', error)
      throw error
    }
  }
}