'use client'

import React from 'react'
import { AlertCircle, Wifi, RefreshCw, ExternalLink, FileText, Link as LinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface FallbackProps {
  onRetry?: () => void
  message?: string
  showRetry?: boolean
}

/**
 * Generic fallback component for failed operations
 */
export const GenericFallback: React.FC<FallbackProps> = ({
  onRetry,
  message = 'Something went wrong',
  showRetry = true
}) => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
    <p className="text-muted-foreground mb-4">{message}</p>
    {showRetry && onRetry && (
      <Button onClick={onRetry} variant="outline" size="sm">
        <RefreshCw className="h-4 w-4 mr-2" />
        Try Again
      </Button>
    )}
  </div>
)

/**
 * Fallback for when link preview generation fails
 */
export const LinkPreviewFallback: React.FC<{
  url: string
  title?: string
  onRetry?: () => void
}> = ({ url, title, onRetry }) => {
  const domain = React.useMemo(() => {
    try {
      return new URL(url).hostname
    } catch {
      return 'External Link'
    }
  }, [url])

  return (
    <Card className="border-dashed">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">
              {title || 'External Link'}
            </h4>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {domain}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                <AlertCircle className="h-3 w-3 mr-1" />
                Preview unavailable
              </Badge>
              {onRetry && (
                <Button
                  onClick={onRetry}
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              )}
            </div>
          </div>
          <Button
            onClick={() => window.open(url, '_blank')}
            variant="ghost"
            size="sm"
            className="flex-shrink-0"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Fallback for when search fails
 */
export const SearchFallback: React.FC<{
  query?: string
  onRetry?: () => void
  fallbackResults?: any[]
}> = ({ query, onRetry, fallbackResults }) => (
  <div className="space-y-4">
    <Alert>
      <Wifi className="h-4 w-4" />
      <AlertDescription>
        Search is temporarily unavailable.
        {fallbackResults && fallbackResults.length > 0 && ' Showing cached results.'}
      </AlertDescription>
    </Alert>

    {onRetry && (
      <div className="flex justify-center">
        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Search Again
        </Button>
      </div>
    )}

    {fallbackResults && fallbackResults.length > 0 && (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Showing {fallbackResults.length} cached results for &quot;{query}&quot;
        </p>
        {/* Render fallback results here */}
      </div>
    )}
  </div>
)

/**
 * Fallback for when file upload fails
 */
export const UploadFallback: React.FC<{
  fileName?: string
  error?: string
  onRetry?: () => void
  onCancel?: () => void
}> = ({ fileName, error, onRetry, onCancel }) => (
  <Card className="border-destructive">
    <CardHeader className="pb-3">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-destructive" />
        <CardTitle className="text-base">Upload Failed</CardTitle>
      </div>
      {fileName && (
        <CardDescription>
          Failed to upload: {fileName}
        </CardDescription>
      )}
    </CardHeader>
    <CardContent className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription className="text-sm">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        {onRetry && (
          <Button onClick={onRetry} size="sm" className="flex-1">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
        {onCancel && (
          <Button onClick={onCancel} variant="outline" size="sm" className="flex-1">
            Cancel
          </Button>
        )}
      </div>
    </CardContent>
  </Card>
)

/**
 * Fallback for when external API services fail
 */
export const ExternalServiceFallback: React.FC<{
  serviceName: string
  onRetry?: () => void
  fallbackContent?: React.ReactNode
}> = ({ serviceName, onRetry, fallbackContent }) => (
  <Card className="border-dashed">
    <CardContent className="p-6 text-center">
      <Wifi className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
      <h3 className="font-medium mb-2">{serviceName} Unavailable</h3>
      <p className="text-sm text-muted-foreground mb-4">
        The {serviceName} service is temporarily unavailable.
      </p>

      {fallbackContent && (
        <div className="mb-4">
          {fallbackContent}
        </div>
      )}

      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      )}
    </CardContent>
  </Card>
)

/**
 * Loading skeleton fallback
 */
export const LoadingFallback: React.FC<{
  type?: 'card' | 'list' | 'grid' | 'preview'
  count?: number
}> = ({ type = 'card', count = 1 }) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <Card>
            <CardHeader>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full mb-4" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </CardContent>
          </Card>
        )

      case 'list':
        return (
          <div className="flex items-center space-x-4 p-4">
            <Skeleton className="h-12 w-12 rounded" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        )

      case 'grid':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: count }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-32 w-full mb-4" />
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        )

      case 'preview':
        return (
          <div className="border rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-16 w-16 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          </div>
        )

      default:
        return <Skeleton className="h-20 w-full" />
    }
  }

  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>{renderSkeleton()}</div>
      ))}
    </div>
  )
}

/**
 * Network error fallback
 */
export const NetworkErrorFallback: React.FC<{
  onRetry?: () => void
  message?: string
}> = ({
  onRetry,
  message = 'Network connection issue. Please check your internet connection.'
}) => (
    <Card className="border-destructive">
      <CardContent className="p-6 text-center">
        <Wifi className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h3 className="font-medium mb-2">Connection Problem</h3>
        <p className="text-sm text-muted-foreground mb-4">{message}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  )

/**
 * Permission denied fallback
 */
export const PermissionDeniedFallback: React.FC<{
  action?: string
  onGoBack?: () => void
}> = ({ action = 'perform this action', onGoBack }) => (
  <Card>
    <CardContent className="p-6 text-center">
      <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
      <h3 className="font-medium mb-2">Access Denied</h3>
      <p className="text-sm text-muted-foreground mb-4">
        You do not have permission to {action}.
      </p>
      {onGoBack && (
        <Button onClick={onGoBack} variant="outline">
          Go Back
        </Button>
      )}
    </CardContent>
  </Card>
)