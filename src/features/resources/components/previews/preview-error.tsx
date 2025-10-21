'use client'

import { AlertCircle, RefreshCw, ExternalLink } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LinkPreviewError } from '@/lib/services/link-preview-error-handler'
import { cn } from '@/lib/utils'

interface PreviewErrorProps {
  error: LinkPreviewError
  url?: string
  className?: string
  onRetry?: () => void
  showRetryButton?: boolean
}

export function PreviewError({ 
  error, 
  url, 
  className, 
  onRetry, 
  showRetryButton = true 
}: PreviewErrorProps) {
  const handleOpenUrl = () => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  const getErrorIcon = () => {
    switch (error.code) {
      case 'NETWORK_ERROR':
        return '🌐'
      case 'TIMEOUT':
        return '⏱️'
      case 'INVALID_URL':
        return '🔗'
      case 'API_ERROR':
        return '🔧'
      case 'RATE_LIMIT':
        return '⏳'
      case 'NOT_FOUND':
        return '❓'
      case 'PARSE_ERROR':
        return '📄'
      default:
        return '⚠️'
    }
  }

  const getErrorColor = () => {
    switch (error.code) {
      case 'NETWORK_ERROR':
      case 'TIMEOUT':
        return 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800'
      case 'INVALID_URL':
      case 'NOT_FOUND':
        return 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
      case 'API_ERROR':
      case 'PARSE_ERROR':
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800'
      case 'RATE_LIMIT':
        return 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800'
      default:
        return 'bg-gray-50 border-gray-200 dark:bg-gray-950/20 dark:border-gray-800'
    }
  }

  const getUserFriendlyMessage = () => {
    switch (error.code) {
      case 'NETWORK_ERROR':
        return 'Unable to connect to the website'
      case 'TIMEOUT':
        return 'The website took too long to respond'
      case 'INVALID_URL':
        return 'Invalid web address'
      case 'API_ERROR':
        return 'Service temporarily unavailable'
      case 'RATE_LIMIT':
        return 'Too many requests - please wait'
      case 'NOT_FOUND':
        return 'Content not found'
      case 'PARSE_ERROR':
        return 'Unable to process content'
      default:
        return 'Preview unavailable'
    }
  }

  const getRetryMessage = () => {
    if (!error.retryable) {
      return null
    }

    if (error.retryAfter) {
      const seconds = Math.ceil(error.retryAfter / 1000)
      return `Try again in ${seconds} seconds`
    }

    return 'You can try again'
  }

  return (
    <Card className={cn('max-w-sm', getErrorColor(), className)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Error Icon */}
          <div className="text-2xl flex-shrink-0">
            {getErrorIcon()}
          </div>

          {/* Error Content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Error Title */}
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Preview Error</span>
            </div>

            {/* Error Message */}
            <p className="text-sm text-muted-foreground">
              {getUserFriendlyMessage()}
            </p>

            {/* Error Code Badge */}
            <Badge variant="outline" className="text-xs">
              {error.code.replace('_', ' ')}
            </Badge>

            {/* Retry Information */}
            {getRetryMessage() && (
              <p className="text-xs text-muted-foreground">
                {getRetryMessage()}
              </p>
            )}

            {/* URL Display */}
            {url && (
              <div className="text-xs text-muted-foreground truncate">
                {new URL(url).hostname}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              {showRetryButton && error.retryable && onRetry && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={onRetry}
                  className="text-xs h-7"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              )}
              
              {url && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleOpenUrl}
                  className="text-xs h-7"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Open Link
                </Button>
              )}
            </div>

            {/* Development Info */}
            {process.env.NODE_ENV === 'development' && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer">Debug Info</summary>
                <pre className="mt-1 text-xs bg-muted/50 p-2 rounded overflow-auto">
                  {JSON.stringify(error, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}