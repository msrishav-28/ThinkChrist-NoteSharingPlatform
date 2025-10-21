'use client'

import React, { useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Download, 
  Share2, 
  Bookmark, 
  Eye, 
  ThumbsUp, 
  ThumbsDown,
  ExternalLink
} from 'lucide-react'
import { useAuth } from '@/features/auth'
import { useTracker } from '@/context/interaction-tracking-context'
import { createViewDurationTracker, withInteractionTracking } from '@/features/resources/utils'
import type { Resource } from '@/types'

interface ResourceCardWithTrackingProps {
  resource: Resource
  searchQuery?: string
  searchPosition?: number
  source?: 'search' | 'recommendation' | 'collection' | 'dashboard' | 'direct'
  onDownload?: (resource: Resource) => void
  onShare?: (resource: Resource) => void
  onBookmark?: (resource: Resource, isBookmarked: boolean) => void
  onVote?: (resource: Resource, voteType: 'upvote' | 'downvote') => void
}

export function ResourceCardWithTracking({
  resource,
  searchQuery,
  searchPosition,
  source = 'direct',
  onDownload,
  onShare,
  onBookmark,
  onVote
}: ResourceCardWithTrackingProps) {
  const { user } = useAuth()
  const tracker = useTracker()
  const viewTrackerRef = useRef<{ cleanup: () => void } | null>(null)
  const hasTrackedView = useRef(false)

  // Track view when component mounts
  useEffect(() => {
    if (!user?.id || hasTrackedView.current) return

    // Track initial view
    tracker.trackView(resource.id, {
      source,
      searchQuery,
      searchPosition,
      resourceType: resource.resource_type,
      department: resource.department,
      course: resource.course
    })

    // Start view duration tracking
    viewTrackerRef.current = createViewDurationTracker(
      user.id,
      resource.id,
      {
        source,
        resourceType: resource.resource_type,
        department: resource.department,
        course: resource.course
      }
    )

    hasTrackedView.current = true

    return () => {
      viewTrackerRef.current?.cleanup()
    }
  }, [user?.id, resource.id, source, searchQuery, searchPosition, tracker])

  // Enhanced download handler with tracking
  const handleDownload = withInteractionTracking(
    () => {
      onDownload?.(resource)
    },
    () => {
      tracker.trackDownload(resource.id, {
        source,
        downloadMethod: 'direct',
        resourceType: resource.resource_type,
        fileSize: resource.file_size,
        fileType: resource.file_type
      })
    }
  )

  // Enhanced share handler with tracking
  const handleShare = withInteractionTracking(
    () => {
      onShare?.(resource)
    },
    () => {
      tracker.trackShare(resource.id, {
        source,
        shareMethod: 'button',
        resourceType: resource.resource_type
      })
    }
  )

  // Enhanced bookmark handler with tracking
  const handleBookmark = (isBookmarked: boolean) => {
    const enhancedHandler = withInteractionTracking(
      () => {
        onBookmark?.(resource, isBookmarked)
      },
      () => {
        tracker.trackBookmark(resource.id, {
          source,
          bookmarkAction: isBookmarked ? 'add' : 'remove',
          resourceType: resource.resource_type
        })
      }
    )
    
    enhancedHandler()
  }

  // Enhanced vote handler with tracking
  const handleVote = (voteType: 'upvote' | 'downvote') => {
    const enhancedHandler = withInteractionTracking(
      () => {
        onVote?.(resource, voteType)
      },
      () => {
        tracker.trackCustomInteraction(resource.id, 'view', {
          source,
          interactionSubtype: 'vote',
          voteType,
          resourceType: resource.resource_type
        })
      }
    )
    
    enhancedHandler()
  }

  // Track preview clicks
  const handlePreviewClick = () => {
    tracker.trackPreviewClick(resource.id, {
      source,
      previewType: 'card_preview',
      resourceType: resource.resource_type
    })
  }

  // Track external link clicks
  const handleExternalLinkClick = () => {
    tracker.trackCustomInteraction(resource.id, 'view', {
      source,
      interactionSubtype: 'external_link_click',
      externalUrl: resource.external_url,
      resourceType: resource.resource_type
    })
  }

  // Track search result clicks
  const handleSearchResultClick = () => {
    if (searchQuery && searchPosition !== undefined) {
      tracker.trackSearchClick(resource.id, {
        source: 'search',
        searchQuery,
        searchPosition,
        resourceType: resource.resource_type
      })
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getResourceTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return '🎥'
      case 'document':
        return '📄'
      case 'link':
        return '🔗'
      case 'code':
        return '💻'
      case 'article':
        return '📰'
      default:
        return '📁'
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle 
              className="text-lg cursor-pointer hover:text-blue-600 transition-colors"
              onClick={() => {
                handlePreviewClick()
                if (source === 'search') {
                  handleSearchResultClick()
                }
              }}
            >
              <span className="mr-2">{getResourceTypeIcon(resource.resource_type)}</span>
              {resource.title}
            </CardTitle>
            <CardDescription className="mt-1">
              {resource.description}
            </CardDescription>
          </div>
          {resource.external_url && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExternalLinkClick}
              className="ml-2"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant="secondary">{resource.resource_type}</Badge>
          <Badge variant="outline">{resource.department}</Badge>
          <Badge variant="outline">{resource.course}</Badge>
          {resource.difficulty_level && (
            <Badge variant="outline">{resource.difficulty_level}</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Resource metadata */}
        <div className="text-sm text-muted-foreground mb-4 space-y-1">
          <div className="flex items-center justify-between">
            <span>By {resource.uploader?.full_name || 'Unknown'}</span>
            {resource.file_size && (
              <span>{formatFileSize(resource.file_size)}</span>
            )}
          </div>
          {resource.estimated_time && (
            <div>Estimated time: {resource.estimated_time} minutes</div>
          )}
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {resource.views}
            </span>
            <span className="flex items-center gap-1">
              <Download className="h-3 w-3" />
              {resource.downloads}
            </span>
          </div>
        </div>

        {/* Tags */}
        {resource.tags && resource.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {resource.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {resource.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{resource.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleVote('upvote')}
              className="flex items-center gap-1"
            >
              <ThumbsUp className="h-4 w-4" />
              {resource.upvotes}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleVote('downvote')}
              className="flex items-center gap-1"
            >
              <ThumbsDown className="h-4 w-4" />
              {resource.downvotes}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleBookmark(true)}
            >
              <Bookmark className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={handleDownload}
              className="flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}