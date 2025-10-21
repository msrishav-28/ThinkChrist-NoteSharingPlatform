'use client'

import { ExternalLink, Globe, Calendar, User, Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { LinkPreview } from '@/types'
import { BasePreview } from './base-preview'
import { cn } from '@/lib/utils'

interface LinkPreviewProps {
  preview: LinkPreview
  url?: string
  className?: string
  showMetadata?: boolean
  interactive?: boolean
}

export function LinkPreview({ 
  preview, 
  url, 
  className, 
  showMetadata = true,
  interactive = true 
}: LinkPreviewProps) {
  const metadata = preview.metadata || {}

  return (
    <BasePreview
      preview={preview}
      url={url}
      className={cn('max-w-md', className)}
      showMetadata={false}
      interactive={interactive}
    >
      {/* Link-specific content */}
      <div className="space-y-3">
        {/* Site information */}
        <div className="flex items-center gap-2">
          {metadata.siteName && (
            <Badge variant="secondary" className="text-xs">
              <Globe className="h-3 w-3 mr-1" />
              {metadata.siteName}
            </Badge>
          )}
          
          {metadata.contentType && metadata.contentType !== 'website' && (
            <Badge variant="outline" className="text-xs">
              {metadata.contentType}
            </Badge>
          )}
        </div>

        {/* Author information */}
        {metadata.author && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>By {metadata.author}</span>
          </div>
        )}

        {/* Publication dates */}
        {showMetadata && (metadata.publishedTime || metadata.modifiedTime) && (
          <div className="space-y-1 text-xs text-muted-foreground">
            {metadata.publishedTime && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Published {formatDate(metadata.publishedTime)}</span>
              </div>
            )}
            
            {metadata.modifiedTime && metadata.modifiedTime !== metadata.publishedTime && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Updated {formatDate(metadata.modifiedTime)}</span>
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {metadata.tags && metadata.tags.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Tag className="h-3 w-3" />
              <span>Tags</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {metadata.tags.slice(0, 4).map((tag: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {metadata.tags.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{metadata.tags.length - 4} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Domain info */}
        {metadata.domain && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <ExternalLink className="h-3 w-3" />
            <span>{metadata.domain}</span>
          </div>
        )}

        {/* Content type specific information */}
        {metadata.contentType === 'article' && (
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-md p-2">
            <div className="flex items-center gap-1 text-xs text-blue-700 dark:text-blue-300">
              <span>📰 Article</span>
            </div>
          </div>
        )}

        {metadata.contentType === 'document' && (
          <div className="bg-green-50 dark:bg-green-950/20 rounded-md p-2">
            <div className="flex items-center gap-1 text-xs text-green-700 dark:text-green-300">
              <span>📄 Document</span>
            </div>
          </div>
        )}

        {metadata.contentType === 'image' && (
          <div className="bg-purple-50 dark:bg-purple-950/20 rounded-md p-2">
            <div className="flex items-center gap-1 text-xs text-purple-700 dark:text-purple-300">
              <span>🖼️ Image</span>
            </div>
          </div>
        )}

        {/* Fallback indicator */}
        {metadata.fallback && (
          <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-md p-2">
            <div className="flex items-center gap-1 text-xs text-yellow-700 dark:text-yellow-300">
              <span>⚠️ Limited preview available</span>
            </div>
          </div>
        )}

        {/* Reading time estimate (if available) */}
        {metadata.estimatedReadingTime && (
          <div className="text-xs text-muted-foreground">
            📖 {metadata.estimatedReadingTime} min read
          </div>
        )}
      </div>
    </BasePreview>
  )
}

/**
 * Format date in a relative way
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffInDays === 0) {
    return 'today'
  } else if (diffInDays === 1) {
    return 'yesterday'
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`
  } else if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7)
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`
  } else if (diffInDays < 365) {
    const months = Math.floor(diffInDays / 30)
    return `${months} month${months > 1 ? 's' : ''} ago`
  } else {
    return date.toLocaleDateString()
  }
}