'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, Clock, AlertCircle } from 'lucide-react'
import { LinkPreview } from '@/types'
import { cn } from '@/lib/utils'

interface BasePreviewProps {
  preview: LinkPreview
  url?: string
  className?: string
  showMetadata?: boolean
  interactive?: boolean
  children?: React.ReactNode
}

export function BasePreview({ 
  preview, 
  url, 
  className, 
  showMetadata = true,
  interactive = true,
  children 
}: BasePreviewProps) {
  const handleClick = () => {
    if (interactive && url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <Card 
      className={cn(
        'overflow-hidden transition-all duration-200',
        interactive && 'hover:shadow-md cursor-pointer',
        className
      )}
      onClick={handleClick}
    >
      <CardContent className="p-0">
        {/* Thumbnail Section */}
        {preview.thumbnail && (
          <div className="relative aspect-video bg-muted">
            <img
              src={preview.thumbnail}
              alt={preview.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Hide image if it fails to load
                e.currentTarget.style.display = 'none'
              }}
            />
            {preview.metadata?.fallback && (
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="text-xs">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Limited Preview
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Content Section */}
        <div className="p-4 space-y-3">
          {/* Header with favicon and title */}
          <div className="flex items-start gap-3">
            {preview.favicon && (
              <img
                src={preview.favicon}
                alt=""
                className="w-4 h-4 mt-0.5 flex-shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm leading-tight line-clamp-2">
                {preview.title}
              </h3>
              {preview.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {preview.description}
                </p>
              )}
            </div>
            {interactive && (
              <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
          </div>

          {/* Type Badge */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {preview.type.charAt(0).toUpperCase() + preview.type.slice(1)}
            </Badge>
            {preview.metadata?.domain && (
              <span className="text-xs text-muted-foreground">
                {preview.metadata.domain}
              </span>
            )}
          </div>

          {/* Custom content from children */}
          {children}

          {/* Metadata Section */}
          {showMetadata && preview.metadata && (
            <div className="pt-2 border-t">
              {preview.metadata.durationFormatted && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{preview.metadata.durationFormatted}</span>
                </div>
              )}
              
              {preview.metadata.viewCount && (
                <div className="text-xs text-muted-foreground mt-1">
                  {preview.metadata.viewCount.toLocaleString()} views
                </div>
              )}

              {preview.metadata.stars && (
                <div className="text-xs text-muted-foreground mt-1">
                  ⭐ {preview.metadata.stars.toLocaleString()} stars
                </div>
              )}

              {preview.metadata.language && (
                <div className="text-xs text-muted-foreground mt-1">
                  Language: {preview.metadata.language}
                </div>
              )}
            </div>
          )}

          {/* Cache info for debugging */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-muted-foreground opacity-50">
              Cached: {new Date(preview.cached_at).toLocaleString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}