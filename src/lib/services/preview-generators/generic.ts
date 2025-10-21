import type { LinkPreview } from '@/types'

export interface WebPageMetadata {
  title?: string
  description?: string
  image?: string
  favicon?: string
  siteName?: string
  type?: string
  url?: string
  author?: string
  publishedTime?: string
  modifiedTime?: string
  tags?: string[]
}

export class GenericPreviewGenerator {
  private static readonly DEFAULT_TIMEOUT = 10000
  private static readonly MAX_CONTENT_LENGTH = 1024 * 1024 // 1MB
  
  /**
   * Generate preview for generic web page
   */
  static async generatePreview(url: string, timeout = this.DEFAULT_TIMEOUT): Promise<LinkPreview> {
    try {
      // Validate URL
      const parsedUrl = new URL(url)
      
      // For now, create a basic preview since we can't do server-side scraping in this environment
      // In a real implementation, this would fetch and parse the HTML
      const metadata = await this.extractMetadataFromUrl(url, timeout)
      
      return this.createPreviewFromMetadata(url, metadata)
    } catch (error) {
      console.warn('Failed to generate generic preview:', error)
      return this.createFallbackPreview(url)
    }
  }

  /**
   * Extract metadata from URL (placeholder implementation)
   * In a real implementation, this would fetch and parse HTML content
   */
  private static async extractMetadataFromUrl(
    url: string, 
    timeout: number
  ): Promise<WebPageMetadata> {
    // This is a placeholder implementation
    // In a real app, you would:
    // 1. Fetch the HTML content with proper headers and timeout
    // 2. Parse the HTML to extract meta tags
    // 3. Look for Open Graph, Twitter Card, and standard meta tags
    // 4. Extract favicon and other relevant information
    
    const domain = new URL(url).hostname
    
    // For demonstration, return basic metadata based on domain
    return {
      title: this.generateTitleFromDomain(domain),
      description: `Content from ${domain}`,
      favicon: `https://www.google.com/s2/favicons?domain=${domain}`,
      siteName: domain,
      url: url,
      type: 'website'
    }
  }

  /**
   * Create preview from extracted metadata
   */
  private static createPreviewFromMetadata(url: string, metadata: WebPageMetadata): LinkPreview {
    const domain = new URL(url).hostname
    
    return {
      title: metadata.title || metadata.siteName || domain,
      description: metadata.description || `Content from ${domain}`,
      thumbnail: metadata.image,
      favicon: metadata.favicon || `https://www.google.com/s2/favicons?domain=${domain}`,
      type: 'generic',
      metadata: {
        domain,
        siteName: metadata.siteName,
        author: metadata.author,
        publishedTime: metadata.publishedTime,
        modifiedTime: metadata.modifiedTime,
        tags: metadata.tags || [],
        originalUrl: url,
        contentType: metadata.type || 'website'
      },
      cached_at: new Date().toISOString()
    }
  }

  /**
   * Create fallback preview when extraction fails
   */
  private static createFallbackPreview(url: string): LinkPreview {
    try {
      const domain = new URL(url).hostname
      return {
        title: domain,
        description: `Link to ${domain}`,
        favicon: `https://www.google.com/s2/favicons?domain=${domain}`,
        type: 'generic',
        metadata: {
          domain,
          fallback: true,
          originalUrl: url
        },
        cached_at: new Date().toISOString()
      }
    } catch {
      return {
        title: 'External Link',
        description: 'External web content',
        type: 'generic',
        metadata: {
          fallback: true,
          originalUrl: url
        },
        cached_at: new Date().toISOString()
      }
    }
  }

  /**
   * Generate a reasonable title from domain name
   */
  private static generateTitleFromDomain(domain: string): string {
    // Remove www. prefix
    const cleanDomain = domain.replace(/^www\./, '')
    
    // Split by dots and take the main part
    const parts = cleanDomain.split('.')
    const mainPart = parts[0]
    
    // Capitalize first letter
    return mainPart.charAt(0).toUpperCase() + mainPart.slice(1)
  }

  /**
   * Detect content type from URL
   */
  static detectContentType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase()
    
    const typeMap: Record<string, string> = {
      // Documents
      'pdf': 'document',
      'doc': 'document',
      'docx': 'document',
      'ppt': 'document',
      'pptx': 'document',
      'xls': 'document',
      'xlsx': 'document',
      
      // Images
      'jpg': 'image',
      'jpeg': 'image',
      'png': 'image',
      'gif': 'image',
      'svg': 'image',
      'webp': 'image',
      
      // Videos
      'mp4': 'video',
      'avi': 'video',
      'mov': 'video',
      'wmv': 'video',
      'flv': 'video',
      'webm': 'video',
      
      // Audio
      'mp3': 'audio',
      'wav': 'audio',
      'ogg': 'audio',
      'flac': 'audio',
      
      // Archives
      'zip': 'archive',
      'rar': 'archive',
      'tar': 'archive',
      'gz': 'archive'
    }
    
    return typeMap[extension || ''] || 'website'
  }

  /**
   * Check if URL is likely to be a direct file link
   */
  static isDirectFileLink(url: string): boolean {
    const fileExtensions = [
      'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx',
      'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp',
      'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm',
      'mp3', 'wav', 'ogg', 'flac',
      'zip', 'rar', 'tar', 'gz'
    ]
    
    const extension = url.split('.').pop()?.toLowerCase()
    return fileExtensions.includes(extension || '')
  }

  /**
   * Get file size from URL (if possible)
   */
  static async getFileSize(url: string): Promise<number | null> {
    try {
      const response = await fetch(url, { method: 'HEAD' })
      const contentLength = response.headers.get('content-length')
      return contentLength ? parseInt(contentLength) : null
    } catch {
      return null
    }
  }

  /**
   * Format file size in human readable format
   */
  static formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let size = bytes
    let unitIndex = 0
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  /**
   * Extract domain information
   */
  static getDomainInfo(url: string): {
    domain: string
    subdomain?: string
    tld: string
    isWww: boolean
  } | null {
    try {
      const parsedUrl = new URL(url)
      const hostname = parsedUrl.hostname
      const parts = hostname.split('.')
      
      if (parts.length < 2) return null
      
      const isWww = hostname.startsWith('www.')
      const domain = isWww ? parts.slice(1).join('.') : hostname
      const tld = parts[parts.length - 1]
      const subdomain = parts.length > 2 && !isWww ? parts[0] : undefined
      
      return {
        domain: domain.replace(/^www\./, ''),
        subdomain,
        tld,
        isWww
      }
    } catch {
      return null
    }
  }

  /**
   * Check if URL is safe to fetch
   */
  static isSafeUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url)
      
      // Only allow HTTP and HTTPS
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return false
      }
      
      // Block localhost and private IPs
      const hostname = parsedUrl.hostname.toLowerCase()
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