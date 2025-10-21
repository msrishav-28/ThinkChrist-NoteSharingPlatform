'use client'

import { Play, Clock, Eye, Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { LinkPreview } from '@/types'
import { BasePreview } from './base-preview'
import { cn } from '@/lib/utils'

interface VideoPreviewProps {
  preview: LinkPreview
  url?: string
  className?: string
  showMetadata?: boolean
  interactive?: boolean
}

export function VideoPreview({ 
  preview, 
  url, 
  className, 
  showMetadata = true,
  interactive = true 
}: VideoPreviewProps) {
  const isYouTube = preview.type === 'youtube'
  const metadata = preview.metadata || {}

  return (
    <BasePreview
      preview={preview}
      url={url}
      className={cn('max-w-sm', className)}
      showMetadata={false}
      interactive={interactive}
    >
      {/* Video-specific content */}
      <div className="space-y-2">
        {/* Play button overlay indicator */}
        {preview.thumbnail && (
          <div className="relative -mt-3 mb-3">
            <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <div className="bg-red-600 rounded-full p-2">
                <Play className="h-4 w-4 text-white fill-white" />
              </div>
            </div>
          </div>
        )}

        {/* Channel info for YouTube */}
        {isYouTube && metadata.channelTitle && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              📺 {metadata.channelTitle}
            </Badge>
          </div>
        )}

        {/* Video stats */}
        {showMetadata && (
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            {metadata.durationFormatted && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{metadata.durationFormatted}</span>
              </div>
            )}
            
            {metadata.viewCount && (
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                <span>{formatViewCount(metadata.viewCount)}</span>
              </div>
            )}
            
            {metadata.publishedAt && (
              <div className="flex items-center gap-1 col-span-2">
                <Calendar className="h-3 w-3" />
                <span>{formatPublishDate(metadata.publishedAt)}</span>
              </div>
            )}
          </div>
        )}

        {/* Tags for YouTube */}
        {isYouTube && metadata.tags && metadata.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {metadata.tags.slice(0, 3).map((tag: string, index: number) => (
              <Badge key={index} variant="outline" className="text-xs">
                #{tag}
              </Badge>
            ))}
            {metadata.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{metadata.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Like count for YouTube */}
        {isYouTube && metadata.likeCount && (
          <div className="text-xs text-muted-foreground">
            👍 {formatViewCount(metadata.likeCount)} likes
          </div>
        )}
      </div>
    </BasePreview>
  )
}

/**
 * Format view count in a human-readable way
 */
function formatViewCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return count.toLocaleString()
}

/**
 * Format publish date in a relative way
 */
function formatPublishDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffInDays === 0) {
    return 'Today'
  } else if (diffInDays === 1) {
    return 'Yesterday'
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`
  } else if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7)
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`
  } else if (diffInDays < 365) {
    const months = Math.floor(diffInDays / 30)
    return `${months} month${months > 1 ? 's' : ''} ago`
  } else {
    const years = Math.floor(diffInDays / 365)
    return `${years} year${years > 1 ? 's' : ''} ago`
  }
}