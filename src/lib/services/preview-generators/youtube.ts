import type { LinkPreview } from '@/types'
import { config } from '@/shared/config'
import { CircuitBreakerManager } from '../circuit-breaker'
import { monitoredAPICall } from '../api-monitoring-middleware'

export interface YouTubeVideoInfo {
  id: string
  title: string
  description: string
  thumbnails: {
    default: { url: string; width: number; height: number }
    medium: { url: string; width: number; height: number }
    high: { url: string; width: number; height: number }
    maxres?: { url: string; width: number; height: number }
  }
  channelTitle: string
  publishedAt: string
  duration: string
  viewCount: string
  likeCount?: string
  tags?: string[]
}

export interface YouTubeAPIQuota {
  dailyLimit: number
  currentUsage: number
  resetTime: Date
}

export interface YouTubeAPIError {
  code: number
  message: string
  errors?: Array<{
    domain: string
    reason: string
    message: string
  }>
}

export class YouTubePreviewGenerator {
  private static readonly API_BASE_URL = 'https://www.googleapis.com/youtube/v3'
  private static readonly QUOTA_COST_PER_REQUEST = 1 // Cost for videos.list API call
  private static readonly MAX_RETRIES = 3
  private static readonly RETRY_DELAY_MS = 1000

  // In-memory quota tracking (in production, this should be stored in Redis/database)
  private static quotaUsage = new Map<string, YouTubeAPIQuota>()

  /**
   * Generate preview for YouTube video using YouTube Data API
   */
  static async generatePreview(url: string): Promise<LinkPreview> {
    const videoId = this.extractVideoId(url)
    if (!videoId) {
      throw new Error('Invalid YouTube URL')
    }

    try {
      // Try to get video info from API if key is available
      const apiKey = process.env.YOUTUBE_API_KEY
      if (apiKey && this.canMakeAPICall(apiKey)) {
        const videoInfo = await monitoredAPICall('youtube', () =>
          this.fetchVideoInfoWithRetry(videoId, apiKey)
        )
        this.updateQuotaUsage(apiKey)
        return this.createPreviewFromAPI(videoInfo)
      } else {
        // Fallback to basic preview without API or when quota exceeded
        console.warn('YouTube API unavailable or quota exceeded, using fallback preview')
        return this.createBasicPreview(videoId, url)
      }
    } catch (error) {
      console.warn('Failed to fetch YouTube video info:', error)
      // Fallback to basic preview
      return this.createBasicPreview(videoId, url)
    }
  }

  /**
   * Check if we can make an API call without exceeding quota
   */
  private static canMakeAPICall(apiKey: string): boolean {
    const quota = this.quotaUsage.get(apiKey)
    if (!quota) {
      // Initialize quota tracking for new API key
      this.quotaUsage.set(apiKey, {
        dailyLimit: 10000, // Default YouTube API quota
        currentUsage: 0,
        resetTime: this.getNextResetTime()
      })
      return true
    }

    // Check if quota has reset
    if (new Date() >= quota.resetTime) {
      quota.currentUsage = 0
      quota.resetTime = this.getNextResetTime()
    }

    // Check if we have quota remaining
    return quota.currentUsage + this.QUOTA_COST_PER_REQUEST <= quota.dailyLimit
  }

  /**
   * Update quota usage after successful API call
   */
  private static updateQuotaUsage(apiKey: string): void {
    const quota = this.quotaUsage.get(apiKey)
    if (quota) {
      quota.currentUsage += this.QUOTA_COST_PER_REQUEST
    }
  }

  /**
   * Get next quota reset time (midnight Pacific Time)
   */
  private static getNextResetTime(): Date {
    const now = new Date()
    const resetTime = new Date(now)
    resetTime.setUTCHours(8, 0, 0, 0) // 8 AM UTC = Midnight Pacific Time

    // If it's already past reset time today, set for tomorrow
    if (now >= resetTime) {
      resetTime.setUTCDate(resetTime.getUTCDate() + 1)
    }

    return resetTime
  }

  /**
   * Fetch video info with retry logic
   */
  private static async fetchVideoInfoWithRetry(videoId: string, apiKey: string): Promise<YouTubeVideoInfo> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await this.fetchVideoInfo(videoId, apiKey)
      } catch (error) {
        lastError = error as Error

        // Don't retry on certain errors
        if (error instanceof Error) {
          if (error.message.includes('quota') ||
            error.message.includes('not found') ||
            error.message.includes('private')) {
            throw error
          }
        }

        // Wait before retrying (exponential backoff)
        if (attempt < this.MAX_RETRIES) {
          await this.delay(this.RETRY_DELAY_MS * Math.pow(2, attempt - 1))
        }
      }
    }

    throw lastError || new Error('Max retries exceeded')
  }

  /**
   * Delay utility for retry logic
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Extract video ID from various YouTube URL formats
   */
  static extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) {
        return match[1]
      }
    }

    return null
  }

  /**
   * Fetch video information from YouTube Data API with circuit breaker
   */
  private static async fetchVideoInfo(videoId: string, apiKey: string): Promise<YouTubeVideoInfo> {
    const circuitBreaker = CircuitBreakerManager.getBreaker('youtube-api')

    return circuitBreaker.execute(async () => {
      // ... existing imports

      // ... inside call
      const response = await fetch(
        `${this.API_BASE_URL}/videos?id=${videoId}&key=${apiKey}&part=snippet,statistics,contentDetails`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': `${config.app.name.replace(/\s+/g, '-')}/1.0`
          },
          signal: AbortSignal.timeout(10000) // 10 second timeout
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)

        if (response.status === 403) {
          // Check if it's a quota error
          if (errorData?.error?.errors?.some((e: any) => e.reason === 'quotaExceeded')) {
            throw new Error('YouTube API quota exceeded')
          }
          throw new Error('YouTube API access forbidden - check API key permissions')
        }

        if (response.status === 429) {
          throw new Error('YouTube API rate limit exceeded')
        }

        if (response.status === 400) {
          throw new Error('Invalid YouTube API request - check video ID')
        }

        if (response.status >= 500) {
          throw new Error(`YouTube API server error: ${response.status}`)
        }

        throw new Error(`YouTube API error: ${response.status} - ${errorData?.error?.message || 'Unknown error'}`)
      }

      const data = await response.json()

      if (!data.items || data.items.length === 0) {
        throw new Error('Video not found or is private')
      }

      const item = data.items[0]

      // Validate required fields
      if (!item.snippet?.title) {
        throw new Error('Invalid video data received from YouTube API')
      }

      return {
        id: videoId,
        title: item.snippet.title,
        description: item.snippet.description || '',
        thumbnails: item.snippet.thumbnails || {},
        channelTitle: item.snippet.channelTitle || 'Unknown Channel',
        publishedAt: item.snippet.publishedAt || new Date().toISOString(),
        duration: item.contentDetails?.duration || 'PT0S',
        viewCount: item.statistics?.viewCount || '0',
        likeCount: item.statistics?.likeCount,
        tags: item.snippet.tags || []
      }
    })
  }

  /**
   * Create preview from YouTube API data
   */
  private static createPreviewFromAPI(videoInfo: YouTubeVideoInfo): LinkPreview {
    // Get the best available thumbnail
    const thumbnail = videoInfo.thumbnails.maxres?.url ||
      videoInfo.thumbnails.high?.url ||
      videoInfo.thumbnails.medium?.url ||
      videoInfo.thumbnails.default?.url

    // Parse duration from ISO 8601 format (PT4M13S -> 4:13)
    const duration = this.parseDuration(videoInfo.duration)

    // Truncate description if too long
    const description = videoInfo.description.length > 200
      ? videoInfo.description.substring(0, 200) + '...'
      : videoInfo.description

    return {
      title: videoInfo.title,
      description: `${description}\n\nChannel: ${videoInfo.channelTitle}${duration ? ` • Duration: ${duration}` : ''}`,
      thumbnail,
      favicon: 'https://www.youtube.com/favicon.ico',
      type: 'youtube',
      metadata: {
        videoId: videoInfo.id,
        channelTitle: videoInfo.channelTitle,
        publishedAt: videoInfo.publishedAt,
        durationRaw: videoInfo.duration,
        viewCount: parseInt(videoInfo.viewCount),
        likeCount: videoInfo.likeCount ? parseInt(videoInfo.likeCount) : undefined,
        tags: videoInfo.tags || [],
        durationFormatted: duration ?? undefined
      },
      cached_at: new Date().toISOString()
    }
  }

  /**
   * Create basic preview without API (fallback)
   */
  private static createBasicPreview(videoId: string, url: string): LinkPreview {
    return {
      title: 'YouTube Video',
      description: 'Video content from YouTube',
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      favicon: 'https://www.youtube.com/favicon.ico',
      type: 'youtube',
      metadata: {
        videoId,
        url,
        fallback: true
      },
      cached_at: new Date().toISOString()
    }
  }

  /**
   * Parse ISO 8601 duration to human readable format
   */
  private static parseDuration(isoDuration: string): string | null {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
    if (!match) return null

    const hours = parseInt(match[1] || '0')
    const minutes = parseInt(match[2] || '0')
    const seconds = parseInt(match[3] || '0')

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }
  }

  /**
   * Validate YouTube URL
   */
  static isYouTubeUrl(url: string): boolean {
    return /(?:youtube\.com|youtu\.be)/.test(url)
  }

  /**
   * Get video URL from video ID
   */
  static getVideoUrl(videoId: string): string {
    return `https://www.youtube.com/watch?v=${videoId}`
  }

  /**
   * Get embed URL from video ID
   */
  static getEmbedUrl(videoId: string): string {
    return `https://www.youtube.com/embed/${videoId}`
  }

  /**
   * Get thumbnail URL for video ID
   */
  static getThumbnailUrl(videoId: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'high'): string {
    const qualityMap = {
      default: 'default',
      medium: 'mqdefault',
      high: 'hqdefault',
      maxres: 'maxresdefault'
    }

    return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`
  }

  /**
   * Get current quota usage for monitoring
   */
  static getQuotaUsage(apiKey?: string): YouTubeAPIQuota | null {
    if (!apiKey) {
      apiKey = process.env.YOUTUBE_API_KEY
    }

    if (!apiKey) {
      return null
    }

    return this.quotaUsage.get(apiKey) || null
  }

  /**
   * Reset quota usage (for testing or manual reset)
   */
  static resetQuotaUsage(apiKey?: string): void {
    if (!apiKey) {
      apiKey = process.env.YOUTUBE_API_KEY
    }

    if (apiKey) {
      this.quotaUsage.delete(apiKey)
    }
  }

  /**
   * Get all quota usage for monitoring dashboard
   */
  static getAllQuotaUsage(): Map<string, YouTubeAPIQuota> {
    return new Map(this.quotaUsage)
  }

  /**
   * Check if YouTube API is configured
   */
  static isAPIConfigured(): boolean {
    return !!process.env.YOUTUBE_API_KEY
  }

  /**
   * Validate API key format
   */
  static validateAPIKey(apiKey: string): boolean {
    // YouTube API keys are typically 39 characters long and alphanumeric with dashes/underscores
    return /^[A-Za-z0-9_-]{35,45}$/.test(apiKey)
  }

  /**
   * Test API connectivity
   */
  static async testAPIConnection(apiKey?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const testKey = apiKey || process.env.YOUTUBE_API_KEY
      if (!testKey) {
        return { success: false, error: 'No API key provided' }
      }

      // Test with a known public video
      const testVideoId = 'dQw4w9WgXcQ' // Rick Roll - should always be available
      await monitoredAPICall('youtube', () =>
        this.fetchVideoInfo(testVideoId, testKey)
      )

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}