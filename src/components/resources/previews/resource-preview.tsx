'use client'

import { useState } from 'react'
import { LinkPreview, Resource } from '@/types'
import { VideoPreview } from './video-preview'
import { CodePreview } from './code-preview'
import { LinkPreview as GenericLinkPreview } from './link-preview'
import { DocumentPreview } from './document-preview'
import { BasePreview } from './base-preview'
import { PreviewError } from './preview-error'
import { LinkPreviewService } from '@/lib/services/link-preview'
import type { LinkPreviewError } from '@/lib/services/link-preview-error-handler'

interface ResourcePreviewProps {
  preview?: LinkPreview
  resource?: Resource
  url?: string
  className?: string
  showMetadata?: boolean
  interactive?: boolean
  onDownload?: () => void
  onView?: () => void
  onPreviewError?: (error: LinkPreviewError) => void
  showRetryButton?: boolean
}

export function ResourcePreview({
  preview,
  resource,
  url,
  className,
  showMetadata = true,
  interactive = true,
  onDownload,
  onView,
  onPreviewError,
  showRetryButton = true
}: ResourcePreviewProps) {
  const [currentPreview, setCurrentPreview] = useState(preview)
  const [previewError, setPreviewError] = useState<LinkPreviewError | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  // Determine the preview type and URL
  const previewType = currentPreview?.type || resource?.resource_type || 'generic'
  const previewUrl = url || resource?.external_url || resource?.file_url

  // Handle retry functionality
  const handleRetry = async () => {
    if (!previewUrl || isRetrying) return

    setIsRetrying(true)
    setPreviewError(null)

    try {
      const newPreview = await LinkPreviewService.generatePreview(previewUrl, { forceRefresh: true })
      setCurrentPreview(newPreview)
    } catch (error) {
      const linkPreviewError = error as LinkPreviewError
      setPreviewError(linkPreviewError)
      if (onPreviewError) {
        onPreviewError(linkPreviewError)
      }
    } finally {
      setIsRetrying(false)
    }
  }

  // Show error component if there's an error and no fallback preview
  if (previewError && !currentPreview?.metadata?.fallback) {
    return (
      <PreviewError
        error={previewError}
        url={previewUrl}
        className={className}
        onRetry={handleRetry}
        showRetryButton={showRetryButton && !isRetrying}
      />
    )
  }

  // If we have a resource but no preview, and it's a file-based resource
  if (resource && !currentPreview && (resource.file_url || resource.resource_type === 'document')) {
    return (
      <DocumentPreview
        resource={resource}
        url={previewUrl}
        className={className}
        showMetadata={showMetadata}
        interactive={interactive}
        onDownload={onDownload}
        onView={onView}
      />
    )
  }

  // If we don't have a preview, show a basic fallback
  if (!currentPreview) {
    const fallbackPreview: LinkPreview = {
      title: resource?.title || 'Resource',
      description: resource?.description || 'No preview available',
      type: 'generic',
      metadata: { fallback: true },
      cached_at: new Date().toISOString()
    }

    return (
      <BasePreview
        preview={fallbackPreview}
        url={previewUrl}
        className={className}
        showMetadata={showMetadata}
        interactive={interactive}
      />
    )
  }

  // Render the appropriate preview component based on type
  switch (previewType) {
    case 'youtube':
    case 'video':
      return (
        <VideoPreview
          preview={currentPreview}
          url={previewUrl}
          className={className}
          showMetadata={showMetadata}
          interactive={interactive}
        />
      )

    case 'github':
    case 'code':
      return (
        <CodePreview
          preview={currentPreview}
          url={previewUrl}
          className={className}
          showMetadata={showMetadata}
          interactive={interactive}
        />
      )

    case 'document':
      return (
        <DocumentPreview
          preview={currentPreview}
          resource={resource}
          url={previewUrl}
          className={className}
          showMetadata={showMetadata}
          interactive={interactive}
          onDownload={onDownload}
          onView={onView}
        />
      )

    case 'article':
    case 'generic':
    case 'link':
    default:
      return (
        <GenericLinkPreview
          preview={currentPreview}
          url={previewUrl}
          className={className}
          showMetadata={showMetadata}
          interactive={interactive}
        />
      )
  }
}

// Export individual components for direct use
export {
  VideoPreview,
  CodePreview,
  GenericLinkPreview as LinkPreview,
  DocumentPreview,
  BasePreview
}