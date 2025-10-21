'use client'

import { FileText, Download, Eye, Calendar, HardDrive, FileType } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LinkPreview, Resource } from '@/types'
import { BasePreview } from './base-preview'
import { cn } from '@/lib/utils'

interface DocumentPreviewProps {
  preview?: LinkPreview
  resource?: Resource
  url?: string
  className?: string
  showMetadata?: boolean
  interactive?: boolean
  onDownload?: () => void
  onView?: () => void
}

export function DocumentPreview({ 
  preview,
  resource,
  url, 
  className, 
  showMetadata = true,
  interactive = true,
  onDownload,
  onView
}: DocumentPreviewProps) {
  // Use resource data if available, otherwise use preview data
  const title = resource?.title || preview?.title || 'Document'
  const description = resource?.description || preview?.description
  const metadata = preview?.metadata || {}
  
  // Get file information
  const fileInfo = getFileInfo(resource, metadata)

  return (
    <div className={cn('max-w-md', className)}>
      {preview ? (
        <BasePreview
          preview={preview}
          url={url}
          showMetadata={false}
          interactive={interactive}
        >
          <DocumentContent 
            fileInfo={fileInfo}
            resource={resource}
            showMetadata={showMetadata}
            onDownload={onDownload}
            onView={onView}
          />
        </BasePreview>
      ) : (
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="text-2xl">
              {getFileIcon(fileInfo.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm leading-tight line-clamp-2">
                {title}
              </h3>
              {description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {description}
                </p>
              )}
            </div>
          </div>
          
          <DocumentContent 
            fileInfo={fileInfo}
            resource={resource}
            showMetadata={showMetadata}
            onDownload={onDownload}
            onView={onView}
          />
        </div>
      )}
    </div>
  )
}

interface DocumentContentProps {
  fileInfo: FileInfo
  resource?: Resource
  showMetadata?: boolean
  onDownload?: () => void
  onView?: () => void
}

function DocumentContent({ 
  fileInfo, 
  resource, 
  showMetadata, 
  onDownload, 
  onView 
}: DocumentContentProps) {
  return (
    <div className="space-y-3">
      {/* File type and format */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-xs">
          <FileType className="h-3 w-3 mr-1" />
          {fileInfo.type.toUpperCase()}
        </Badge>
        
        {fileInfo.format && (
          <Badge variant="outline" className="text-xs">
            {fileInfo.format}
          </Badge>
        )}
      </div>

      {/* File metadata */}
      {showMetadata && (
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          {fileInfo.size && (
            <div className="flex items-center gap-1">
              <HardDrive className="h-3 w-3" />
              <span>{formatFileSize(fileInfo.size)}</span>
            </div>
          )}
          
          {fileInfo.pages && (
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              <span>{fileInfo.pages} pages</span>
            </div>
          )}
          
          {resource?.created_at && (
            <div className="flex items-center gap-1 col-span-2">
              <Calendar className="h-3 w-3" />
              <span>Uploaded {formatDate(resource.created_at)}</span>
            </div>
          )}
        </div>
      )}

      {/* Document stats */}
      {resource && (
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Download className="h-3 w-3" />
            <span>{resource.downloads || 0} downloads</span>
          </div>
          
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            <span>{resource.views || 0} views</span>
          </div>
        </div>
      )}

      {/* Academic metadata */}
      {resource && (
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-xs">
            {resource.department}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {resource.subject}
          </Badge>
          <Badge variant="outline" className="text-xs">
            Sem {resource.semester}
          </Badge>
          {resource.topic && (
            <Badge variant="outline" className="text-xs">
              {resource.topic}
            </Badge>
          )}
        </div>
      )}

      {/* Action buttons */}
      {(onView || onDownload) && (
        <div className="flex gap-2 pt-2 border-t">
          {onView && (
            <Button size="sm" variant="outline" onClick={onView} className="flex-1">
              <Eye className="h-3 w-3 mr-1" />
              View
            </Button>
          )}
          {onDownload && (
            <Button size="sm" onClick={onDownload} className="flex-1">
              <Download className="h-3 w-3 mr-1" />
              Download
            </Button>
          )}
        </div>
      )}

      {/* Content preview (if available) */}
      {fileInfo.textPreview && (
        <div className="bg-muted/50 rounded-md p-2">
          <p className="text-xs text-muted-foreground line-clamp-3">
            {fileInfo.textPreview}
          </p>
        </div>
      )}
    </div>
  )
}

interface FileInfo {
  type: string
  format?: string
  size?: number
  pages?: number
  textPreview?: string
}

function getFileInfo(resource?: Resource, metadata?: Record<string, any>): FileInfo {
  const fileType = resource?.file_type || metadata?.fileType || 'document'
  const extension = resource?.file_name?.split('.').pop()?.toLowerCase() || ''
  
  return {
    type: getFileTypeFromExtension(extension) || 'document',
    format: extension.toUpperCase(),
    size: resource?.file_size || metadata?.size,
    pages: metadata?.pages || metadata?.pageCount,
    textPreview: metadata?.textPreview || metadata?.excerpt
  }
}

function getFileTypeFromExtension(extension: string): string {
  const typeMap: Record<string, string> = {
    'pdf': 'PDF',
    'doc': 'Word',
    'docx': 'Word',
    'ppt': 'PowerPoint',
    'pptx': 'PowerPoint',
    'xls': 'Excel',
    'xlsx': 'Excel',
    'txt': 'Text',
    'rtf': 'RTF',
    'odt': 'OpenDocument',
    'ods': 'Spreadsheet',
    'odp': 'Presentation'
  }
  
  return typeMap[extension] || 'Document'
}

function getFileIcon(type: string): string {
  const iconMap: Record<string, string> = {
    'PDF': '📄',
    'Word': '📝',
    'PowerPoint': '📊',
    'Excel': '📈',
    'Text': '📃',
    'RTF': '📃',
    'OpenDocument': '📄',
    'Spreadsheet': '📊',
    'Presentation': '📊'
  }
  
  return iconMap[type] || '📎'
}

function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

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
  } else {
    return date.toLocaleDateString()
  }
}