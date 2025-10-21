'use client'

import { Star, GitFork, AlertCircle, Calendar, Code, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { LinkPreview } from '@/types'
import { BasePreview } from './base-preview'
import { cn } from '@/lib/utils'

interface CodePreviewProps {
  preview: LinkPreview
  url?: string
  className?: string
  showMetadata?: boolean
  interactive?: boolean
}

export function CodePreview({ 
  preview, 
  url, 
  className, 
  showMetadata = true,
  interactive = true 
}: CodePreviewProps) {
  const isGitHub = preview.type === 'github'
  const metadata = preview.metadata || {}

  return (
    <BasePreview
      preview={preview}
      url={url}
      className={cn('max-w-md', className)}
      showMetadata={false}
      interactive={interactive}
    >
      {/* Code-specific content */}
      <div className="space-y-3">
        {/* Repository stats for GitHub */}
        {isGitHub && (
          <div className="grid grid-cols-3 gap-2 text-xs">
            {metadata.stars !== undefined && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Star className="h-3 w-3" />
                <span>{formatCount(metadata.stars)}</span>
              </div>
            )}
            
            {metadata.forks !== undefined && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <GitFork className="h-3 w-3" />
                <span>{formatCount(metadata.forks)}</span>
              </div>
            )}
            
            {metadata.issues !== undefined && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <AlertCircle className="h-3 w-3" />
                <span>{formatCount(metadata.issues)}</span>
              </div>
            )}
          </div>
        )}

        {/* Language and topics */}
        <div className="flex flex-wrap gap-1">
          {metadata.language && (
            <Badge variant="secondary" className="text-xs">
              <Code className="h-3 w-3 mr-1" />
              {metadata.language}
            </Badge>
          )}
          
          {metadata.topics && metadata.topics.length > 0 && (
            <>
              {metadata.topics.slice(0, 2).map((topic: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {topic}
                </Badge>
              ))}
              {metadata.topics.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{metadata.topics.length - 2}
                </Badge>
              )}
            </>
          )}
        </div>

        {/* License info */}
        {metadata.license && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <FileText className="h-3 w-3" />
            <span>{metadata.license} license</span>
          </div>
        )}

        {/* Repository status indicators */}
        <div className="flex flex-wrap gap-2">
          {metadata.archived && (
            <Badge variant="destructive" className="text-xs">
              Archived
            </Badge>
          )}
          
          {metadata.private && (
            <Badge variant="secondary" className="text-xs">
              Private
            </Badge>
          )}
        </div>

        {/* README excerpt */}
        {metadata.readme_excerpt && (
          <div className="bg-muted/50 rounded-md p-2">
            <p className="text-xs text-muted-foreground line-clamp-3">
              {metadata.readme_excerpt}
            </p>
          </div>
        )}

        {/* Repository dates */}
        {showMetadata && (
          <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground pt-2 border-t">
            {metadata.created_at && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Created {formatDate(metadata.created_at)}</span>
              </div>
            )}
            
            {metadata.updated_at && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Updated {formatDate(metadata.updated_at)}</span>
              </div>
            )}
            
            {metadata.pushed_at && (
              <div className="flex items-center gap-1">
                <Code className="h-3 w-3" />
                <span>Last push {formatDate(metadata.pushed_at)}</span>
              </div>
            )}
          </div>
        )}

        {/* Repository size */}
        {metadata.size && (
          <div className="text-xs text-muted-foreground">
            Repository size: {formatSize(metadata.size)}
          </div>
        )}

        {/* Default branch */}
        {metadata.default_branch && (
          <div className="text-xs text-muted-foreground">
            Default branch: <code className="bg-muted px-1 rounded">{metadata.default_branch}</code>
          </div>
        )}
      </div>
    </BasePreview>
  )
}

/**
 * Format large numbers in a human-readable way
 */
function formatCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return count.toString()
}

/**
 * Format repository size in KB
 */
function formatSize(sizeInKB: number): string {
  if (sizeInKB >= 1024 * 1024) {
    return `${(sizeInKB / (1024 * 1024)).toFixed(1)} GB`
  } else if (sizeInKB >= 1024) {
    return `${(sizeInKB / 1024).toFixed(1)} MB`
  }
  return `${sizeInKB} KB`
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