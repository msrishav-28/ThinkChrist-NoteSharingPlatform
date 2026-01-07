'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  FileText, Download, ThumbsUp, ThumbsDown,
  Calendar, User, FileIcon, Eye, Play, Code,
  Link as LinkIcon, Newspaper, Clock, BarChart3,
  CheckCircle, Star, ExternalLink
} from 'lucide-react'
import { Resource } from '@/types'
import { formatBytes, formatDate, cn } from '@/lib/utils'
import { useToast } from '@/lib/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/features/auth'
import { ResourcePreview } from './previews'
import { BackwardCompatibilityService } from '@/shared/utils/backward-compatibility'
import { ErrorHandlingService } from '@/lib/services/error-handling'
import { ResourceErrorBoundary } from '@/components/common/error-boundary'

interface ResourceCardProps {
  resource: Resource
  onVote?: () => void
  showHighlighting?: boolean
  highlightQuery?: string
  className?: string
  variant?: 'default' | 'compact' | 'detailed'
  showPreview?: boolean
  showMetadata?: boolean
}

export function ResourceCard({
  resource: rawResource,
  onVote,
  showHighlighting = false,
  highlightQuery = '',
  className,
  variant = 'default',
  showPreview = true,
  showMetadata = true
}: ResourceCardProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [voting, setVoting] = useState(false)

  // Ensure backward compatibility by transforming legacy resources
  const resource = BackwardCompatibilityService.transformLegacyResource(rawResource)

  const [userVote, setUserVote] = useState(resource.user_vote)
  const [upvotes, setUpvotes] = useState(resource.upvotes)
  const [downvotes, setDownvotes] = useState(resource.downvotes)
  const supabase = createClient()

  // Generate unique IDs for accessibility
  const cardId = `resource-card-${resource.id}`
  const titleId = `resource-title-${resource.id}`
  const descriptionId = `resource-description-${resource.id}`
  const metadataId = `resource-metadata-${resource.id}`

  const getResourceIcon = (resourceType: string, fileType?: string) => {
    switch (resourceType) {
      case 'video':
        return <Play className="h-4 w-4 text-red-500" />
      case 'link':
        return <LinkIcon className="h-4 w-4 text-blue-500" />
      case 'code':
        return <Code className="h-4 w-4 text-green-500" />
      case 'article':
        return <Newspaper className="h-4 w-4 text-purple-500" />
      case 'document':
      default:
        if (fileType?.includes('pdf')) return <FileText className="h-4 w-4 text-red-600" />
        if (fileType?.includes('image')) return <FileIcon className="h-4 w-4 text-orange-500" />
        if (fileType?.includes('video')) return <Play className="h-4 w-4 text-red-500" />
        if (fileType?.includes('audio')) return <FileIcon className="h-4 w-4 text-pink-500" />
        return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  const getResourceTypeLabel = (resourceType: string) => {
    switch (resourceType) {
      case 'video': return 'Video'
      case 'link': return 'Link'
      case 'code': return 'Code'
      case 'article': return 'Article'
      case 'document': return 'Document'
      default: return 'Resource'
    }
  }

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  // Highlight search terms in text - using secure sanitization
  const highlightText = (text: string): React.ReactNode => {
    if (!showHighlighting || !highlightQuery.trim() || !text) return text

    // Import dynamically to avoid circular dependencies
    const { highlightSearchTerms } = require('@/lib/security/sanitize')
    const highlightedHtml = highlightSearchTerms(text, highlightQuery)

    return <span dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
  }

  const handleVote = async (voteType: 'upvote' | 'downvote') => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to vote',
        variant: 'destructive',
      })
      return
    }

    setVoting(true)

    try {
      // If user already voted the same way, remove the vote
      if (userVote === voteType) {
        const { error } = await supabase
          .from('votes')
          .delete()
          .match({ user_id: user.id, resource_id: resource.id })

        if (!error) {
          setUserVote(null)
          if (voteType === 'upvote') {
            setUpvotes(upvotes - 1)
          } else {
            setDownvotes(downvotes - 1)
          }
        }
      } else {
        // Insert or update vote
        const { error } = await supabase
          .from('votes')
          .upsert({
            user_id: user.id,
            resource_id: resource.id,
            vote_type: voteType,
          })

        if (!error) {
          // Update counts
          if (userVote === 'upvote') {
            setUpvotes(upvotes - 1)
            setDownvotes(downvotes + 1)
          } else if (userVote === 'downvote') {
            setDownvotes(downvotes - 1)
            setUpvotes(upvotes + 1)
          } else {
            if (voteType === 'upvote') {
              setUpvotes(upvotes + 1)
            } else {
              setDownvotes(downvotes + 1)
            }
          }
          setUserVote(voteType)
        }
      }

      if (onVote) onVote()
    } catch (error) {
      ErrorHandlingService.handleApiError(error, {
        component: 'ResourceCard',
        action: 'vote',
        userId: user?.id,
        resourceId: resource.id
      })
    } finally {
      setVoting(false)
    }
  }

  const handleDownload = async () => {
    try {
      // Track download
      await supabase
        .from('contributions')
        .insert({
          user_id: user?.id,
          type: 'download',
          resource_id: resource.id,
          points_earned: 0,
        })

      // Increment download count
      await supabase
        .from('resources')
        .update({ downloads: resource.downloads + 1 })
        .eq('id', resource.id)

      // Open appropriate URL based on resource type
      const url = resource.external_url || resource.file_url
      if (url) {
        window.open(url, '_blank')
      } else {
        throw new Error('No download URL available')
      }
    } catch (error) {
      ErrorHandlingService.handleError(error as Error, {
        component: 'ResourceCard',
        action: 'download',
        userId: user?.id,
        resourceId: resource.id
      }, {
        showToast: true,
        fallbackMessage: 'Unable to download resource. Please try again.'
      })
    }
  }

  const isCompact = variant === 'compact'
  const isDetailed = variant === 'detailed'

  return (
    <ResourceErrorBoundary>
      <Card
        className={cn(
          "group hover:shadow-lg transition-all duration-200 hover:scale-[1.02]",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          isCompact && "h-auto",
          className
        )}
        role="article"
        aria-labelledby={titleId}
        aria-describedby={resource.description ? descriptionId : metadataId}
        id={cardId}
      >
        {/* Preview Section - Only show for non-compact variants */}
        {showPreview && !isCompact && (resource.link_preview || resource.external_url) && (
          <div className="relative overflow-hidden rounded-t-lg">
            <ResourcePreview
              preview={resource.link_preview}
              resource={resource}
              className="w-full h-48 object-cover"
              showMetadata={false}
              interactive={false}
            />
            <div className="absolute top-2 left-2">
              <Badge
                variant="secondary"
                className="flex items-center gap-1"
                aria-label={`Resource type: ${getResourceTypeLabel(resource.resource_type)}`}
              >
                <span aria-hidden="true">{getResourceIcon(resource.resource_type, resource.file_type)}</span>
                {getResourceTypeLabel(resource.resource_type)}
              </Badge>
            </div>
            {resource.external_url && (
              <div className="absolute top-2 right-2">
                <Badge
                  variant="outline"
                  className="bg-white/90 backdrop-blur-sm"
                  aria-label="External link"
                >
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </Badge>
              </div>
            )}
          </div>
        )}

        <CardHeader className={cn("pb-3", isCompact && "pb-2 pt-4")}>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {(isCompact || !showPreview) && (
                  <span aria-hidden="true">
                    {getResourceIcon(resource.resource_type, resource.file_type)}
                  </span>
                )}
                <Badge
                  variant="outline"
                  className="text-xs"
                  aria-label={`Resource type: ${getResourceTypeLabel(resource.resource_type)}`}
                >
                  {getResourceTypeLabel(resource.resource_type)}
                </Badge>
                {resource.is_verified && (
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1"
                    aria-label="Verified resource"
                  >
                    <CheckCircle className="h-3 w-3" aria-hidden="true" />
                    Verified
                  </Badge>
                )}
              </div>
              <h3
                id={titleId}
                className={cn(
                  "font-semibold line-clamp-2 group-hover:text-primary transition-colors",
                  isCompact ? "text-base" : "text-lg"
                )}
              >
                {highlightText(resource.title)}
              </h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                <span className="truncate">
                  <span className="sr-only">Uploaded by: </span>
                  {resource.uploader?.full_name || 'Anonymous'}
                </span>
                <span className="hidden sm:inline" aria-hidden="true">•</span>
                <Calendar className="h-3 w-3 flex-shrink-0 hidden sm:inline" aria-hidden="true" />
                <span className="hidden sm:inline">
                  <span className="sr-only">Upload date: </span>
                  {formatDate(resource.created_at)}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className={cn("space-y-3", isCompact && "py-3")}>
          {resource.description && !isCompact && (
            <p
              id={descriptionId}
              className="text-sm text-muted-foreground line-clamp-2"
            >
              {highlightText(resource.description)}
            </p>
          )}

          {/* Enhanced Metadata Section */}
          {showMetadata && (
            <div id={metadataId} className="space-y-3">
              {/* Academic Info */}
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Academic information">
                <Badge
                  variant="outline"
                  className="text-xs"
                  aria-label={`Department: ${resource.department}`}
                >
                  {resource.department}
                </Badge>
                <Badge
                  variant="outline"
                  className="text-xs"
                  aria-label={`Subject: ${resource.subject}`}
                >
                  {resource.subject}
                </Badge>
                <Badge
                  variant="outline"
                  className="text-xs"
                  aria-label={`Semester: ${resource.semester}`}
                >
                  Sem {resource.semester}
                </Badge>
                {resource.topic && (
                  <Badge
                    variant="outline"
                    className="text-xs"
                    aria-label={`Topic: ${resource.topic}`}
                  >
                    {resource.topic}
                  </Badge>
                )}
              </div>

              {/* Enhanced Metadata */}
              {(resource.difficulty_level || resource.estimated_time) && (
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Resource properties">
                  {resource.difficulty_level && (
                    <Badge
                      className={cn("text-xs", getDifficultyColor(resource.difficulty_level))}
                      aria-label={`Difficulty level: ${resource.difficulty_level}`}
                    >
                      <BarChart3 className="h-3 w-3 mr-1" aria-hidden="true" />
                      {resource.difficulty_level}
                    </Badge>
                  )}
                  {resource.estimated_time && (
                    <Badge
                      variant="outline"
                      className="text-xs"
                      aria-label={`Estimated time: ${resource.estimated_time} minutes`}
                    >
                      <Clock className="h-3 w-3 mr-1" aria-hidden="true" />
                      {resource.estimated_time}min
                    </Badge>
                  )}
                </div>
              )}

              {/* Tags */}
              {resource.tags && resource.tags.length > 0 && (
                <div className="flex flex-wrap gap-1" role="group" aria-label="Resource tags">
                  {resource.tags.slice(0, isCompact ? 2 : 4).map(tag => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-xs hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer focus:ring-2 focus:ring-ring focus:ring-offset-1"
                      tabIndex={0}
                      role="button"
                      aria-label={`Tag: ${tag}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          // Handle tag click
                        }
                      }}
                    >
                      #{tag}
                    </Badge>
                  ))}
                  {resource.tags.length > (isCompact ? 2 : 4) && (
                    <Badge
                      variant="outline"
                      className="text-xs"
                      aria-label={`${resource.tags.length - (isCompact ? 2 : 4)} more tags available`}
                    >
                      +{resource.tags.length - (isCompact ? 2 : 4)} more
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Stats Section */}
          <div
            className={cn(
              "flex items-center gap-3 text-sm text-muted-foreground",
              isCompact && "gap-2 text-xs"
            )}
            role="group"
            aria-label="Resource statistics"
          >
            {resource.file_size && (
              <span className="flex items-center gap-1" aria-label={`File size: ${formatBytes(resource.file_size)}`}>
                <FileIcon className={cn("h-4 w-4", isCompact && "h-3 w-3")} aria-hidden="true" />
                <span className="hidden sm:inline">{formatBytes(resource.file_size)}</span>
              </span>
            )}
            <span className="flex items-center gap-1" aria-label={`${resource.downloads} downloads`}>
              <Download className={cn("h-4 w-4", isCompact && "h-3 w-3")} aria-hidden="true" />
              <span>{resource.downloads}</span>
              <span className="hidden sm:inline">downloads</span>
            </span>
            <span className="flex items-center gap-1" aria-label={`${resource.views} views`}>
              <Eye className={cn("h-4 w-4", isCompact && "h-3 w-3")} aria-hidden="true" />
              <span>{resource.views}</span>
              <span className="hidden sm:inline">views</span>
            </span>
            {(upvotes > 0 || downvotes > 0) && (
              <span className="flex items-center gap-1" aria-label={`Net score: ${upvotes - downvotes}`}>
                <Star className={cn("h-4 w-4", isCompact && "h-3 w-3")} aria-hidden="true" />
                <span>{upvotes - downvotes}</span>
              </span>
            )}
          </div>
        </CardContent>

        <CardFooter className={cn(
          "flex items-center justify-between gap-2",
          isCompact && "pt-2 pb-3 px-4"
        )}>
          <div className="flex items-center gap-1.5" role="group" aria-label="Voting actions">
            <Button
              size={isCompact ? "sm" : "sm"}
              variant={userVote === 'upvote' ? 'default' : 'outline'}
              onClick={() => handleVote('upvote')}
              disabled={voting}
              className={cn(isCompact && "h-8 px-2")}
              aria-label={`Upvote resource. Current upvotes: ${upvotes}${userVote === 'upvote' ? '. You have upvoted this resource' : ''}`}
              aria-pressed={userVote === 'upvote'}
            >
              <ThumbsUp className={cn("h-4 w-4", isCompact ? "mr-1" : "mr-1")} aria-hidden="true" />
              <span className={cn(isCompact && "text-xs")}>{upvotes}</span>
            </Button>
            <Button
              size={isCompact ? "sm" : "sm"}
              variant={userVote === 'downvote' ? 'default' : 'outline'}
              onClick={() => handleVote('downvote')}
              disabled={voting}
              className={cn(isCompact && "h-8 px-2")}
              aria-label={`Downvote resource. Current downvotes: ${downvotes}${userVote === 'downvote' ? '. You have downvoted this resource' : ''}`}
              aria-pressed={userVote === 'downvote'}
            >
              <ThumbsDown className={cn("h-4 w-4", isCompact ? "mr-1" : "mr-1")} aria-hidden="true" />
              <span className={cn(isCompact && "text-xs")}>{downvotes}</span>
            </Button>
          </div>

          <div className="flex items-center gap-1.5" role="group" aria-label="Resource actions">
            <Link href={`/resources/${resource.id}`}>
              <Button
                size={isCompact ? "sm" : "sm"}
                variant="ghost"
                className={cn(isCompact && "h-8 px-2")}
                aria-label={`View details for ${resource.title}`}
              >
                <Eye className={cn("h-4 w-4", !isCompact && "mr-1")} aria-hidden="true" />
                {!isCompact && <span>View</span>}
              </Button>
            </Link>
            <Button
              size={isCompact ? "sm" : "sm"}
              onClick={handleDownload}
              className={cn(isCompact && "h-8 px-2")}
              aria-label={`Download ${resource.title}`}
            >
              <Download className={cn("h-4 w-4", !isCompact && "mr-1")} aria-hidden="true" />
              {!isCompact && <span>Download</span>}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </ResourceErrorBoundary>
  )
}