'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// Resource card skeleton
export function ResourceCardSkeleton({ variant = 'default' }: { variant?: 'default' | 'compact' | 'detailed' }) {
  const isCompact = variant === 'compact'
  const isDetailed = variant === 'detailed'

  return (
    <Card className={cn("animate-pulse", isCompact && "h-auto")}>
      {/* Preview skeleton for non-compact variants */}
      {!isCompact && (
        <div className="relative">
          <Skeleton className={cn("w-full rounded-t-lg", isDetailed ? "h-80" : "h-48")} />
          <div className="absolute top-4 left-4">
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
      )}
      
      <CardHeader className={cn("pb-3", isCompact && "pb-2 pt-4")}>
        <div className="space-y-3">
          {/* Type and verification badges */}
          <div className="flex items-center gap-2">
            {isCompact && <Skeleton className="h-4 w-4" />}
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
          
          {/* Title */}
          <div className="space-y-2">
            <Skeleton className={cn("h-6 w-full", isCompact && "h-5")} />
            <Skeleton className={cn("h-6 w-3/4", isCompact && "h-5")} />
          </div>
          
          {/* Author and date */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-3" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20 hidden sm:block" />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className={cn("space-y-3", isCompact && "py-3")}>
        {/* Description */}
        {!isCompact && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}
        
        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-5 w-18" />
        </div>
        
        {/* Enhanced metadata */}
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
        </div>
        
        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-14" />
        </div>
        
        {/* Stats */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-18" />
        </div>
      </CardContent>
      
      {/* Footer with buttons */}
      <div className={cn("flex items-center justify-between p-6 pt-0", isCompact && "px-4 pb-3")}>
        <div className="flex items-center gap-2">
          <Skeleton className={cn("h-8 w-16", isCompact && "h-7 w-14")} />
          <Skeleton className={cn("h-8 w-16", isCompact && "h-7 w-14")} />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className={cn("h-8 w-16", isCompact && "h-7 w-12")} />
          <Skeleton className={cn("h-8 w-20", isCompact && "h-7 w-16")} />
        </div>
      </div>
    </Card>
  )
}

// Resource grid skeleton
export function ResourceGridSkeleton({ 
  count = 6, 
  variant = 'default',
  layout = 'grid'
}: { 
  count?: number
  variant?: 'default' | 'compact' | 'detailed'
  layout?: 'grid' | 'list' | 'masonry'
}) {
  const gridClasses = cn(
    "gap-4",
    layout === 'grid' && variant === 'compact' && "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6",
    layout === 'grid' && variant === 'default' && "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    layout === 'grid' && variant === 'detailed' && "grid grid-cols-1 lg:grid-cols-2",
    layout === 'list' && "flex flex-col",
    layout === 'masonry' && "columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4"
  )

  return (
    <div className={gridClasses}>
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className={cn(layout === 'masonry' && "break-inside-avoid mb-4")}
        >
          <ResourceCardSkeleton variant={variant} />
        </div>
      ))}
    </div>
  )
}

// Collection card skeleton
export function CollectionCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-3" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-14" />
        </div>
        
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
      </CardContent>
    </Card>
  )
}

// Search results skeleton
export function SearchResultsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Search stats */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-8 w-32" />
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-20" />
      </div>
      
      {/* Results */}
      <ResourceGridSkeleton count={9} />
    </div>
  )
}

// Dashboard skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="space-y-4">
          <Skeleton className="h-6 w-40" />
          <ResourceGridSkeleton count={3} variant="compact" />
        </div>
      </div>
    </div>
  )
}

// Loading spinner with text
export function LoadingSpinner({ 
  text = 'Loading...', 
  size = 'default' 
}: { 
  text?: string
  size?: 'sm' | 'default' | 'lg'
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    default: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  return (
    <div className="flex items-center justify-center gap-3 py-8">
      <div className={cn("animate-spin rounded-full border-2 border-muted border-t-primary", sizeClasses[size])} />
      <span className="text-muted-foreground">{text}</span>
    </div>
  )
}

// Page loading overlay
export function PageLoadingOverlay({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-card p-6 rounded-lg shadow-lg border">
        <LoadingSpinner text={text} size="lg" />
      </div>
    </div>
  )
}