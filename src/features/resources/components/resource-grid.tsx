'use client'

import { Resource } from '@/types'
import { ResourceCard } from './resource-card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface ResourceGridProps {
  resources: Resource[]
  loading?: boolean
  onResourceClick?: (resource: Resource) => void
  variant?: 'default' | 'compact' | 'detailed'
  layout?: 'grid' | 'list' | 'masonry'
  showPreviews?: boolean
  showMetadata?: boolean
  className?: string
}

export function ResourceGrid({ 
  resources, 
  loading, 
  onResourceClick,
  variant = 'default',
  layout = 'grid',
  showPreviews = true,
  showMetadata = true,
  className
}: ResourceGridProps) {
  
  // Loading skeleton
  if (loading) {
    const skeletonCount = variant === 'compact' ? 12 : 6
    const skeletonHeight = variant === 'compact' ? 'h-32' : variant === 'detailed' ? 'h-96' : 'h-64'
    
    return (
      <div className={cn(
        "grid gap-4",
        layout === 'grid' && variant === 'compact' && "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6",
        layout === 'grid' && variant === 'default' && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        layout === 'grid' && variant === 'detailed' && "grid-cols-1 lg:grid-cols-2",
        layout === 'list' && "grid-cols-1",
        className
      )}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className={cn("w-full rounded-lg", skeletonHeight)} />
            {variant === 'detailed' && (
              <>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </>
            )}
          </div>
        ))}
      </div>
    )
  }

  // Empty state
  if (resources.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
          <svg className="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">No resources found</h3>
        <p className="text-muted-foreground">Try adjusting your search criteria or browse different categories.</p>
      </div>
    )
  }

  // Grid layout classes based on variant and layout
  const gridClasses = cn(
    "gap-4",
    // Grid layouts
    layout === 'grid' && variant === 'compact' && "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6",
    layout === 'grid' && variant === 'default' && "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    layout === 'grid' && variant === 'detailed' && "grid grid-cols-1 lg:grid-cols-2",
    // List layout
    layout === 'list' && "flex flex-col",
    // Masonry layout (fallback to grid for now)
    layout === 'masonry' && "columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4",
    className
  )

  return (
    <div className={gridClasses}>
      {resources.map((resource) => (
        <div 
          key={resource.id} 
          onClick={() => onResourceClick?.(resource)}
          className={cn(
            "cursor-pointer",
            layout === 'masonry' && "break-inside-avoid mb-4"
          )}
        >
          <ResourceCard
            resource={resource}
            variant={variant}
            showPreview={showPreviews}
            showMetadata={showMetadata}
            className={cn(
              layout === 'list' && "flex-row",
              "transition-all duration-200"
            )}
          />
        </div>
      ))}
    </div>
  )
}