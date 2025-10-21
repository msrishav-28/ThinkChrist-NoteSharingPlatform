'use client'

import { useState, useEffect } from 'react'
import { ResourceCard } from '@/features/resources'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc, 
  Grid, 
  List,
  Clock,
  TrendingUp,
  Download,
  ThumbsUp
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Resource, SearchResults as SearchResultsType } from '@/types'
import type { RankedResource } from '@/lib/services/search-ranking'
import { searchService } from '@/lib/services/search'
import { cn } from '@/lib/utils'

interface SearchResultsProps {
  query: string
  results: SearchResultsType
  loading: boolean
  onLoadMore?: () => void
  onResultClick?: (resource: Resource, position: number) => void
  className?: string
  viewMode?: 'grid' | 'list'
  onViewModeChange?: (mode: 'grid' | 'list') => void
}

interface SortOption {
  value: string
  label: string
  icon: React.ReactNode
}

export function SearchResults({
  query,
  results,
  loading,
  onLoadMore,
  onResultClick,
  className,
  viewMode = 'grid',
  onViewModeChange
}: SearchResultsProps) {
  const [sortBy, setSortBy] = useState('relevance')
  const [sortedResults, setSortedResults] = useState<Resource[]>([])
  const [showRankingInfo, setShowRankingInfo] = useState(false)
  
  // Generate unique IDs for accessibility
  const resultsId = 'search-results'
  const statusId = 'search-status'
  const sortId = 'search-sort'

  const sortOptions: SortOption[] = [
    { value: 'relevance', label: 'Relevance', icon: <Search className="h-4 w-4" /> },
    { value: 'recent', label: 'Most Recent', icon: <Clock className="h-4 w-4" /> },
    { value: 'popular', label: 'Most Popular', icon: <TrendingUp className="h-4 w-4" /> },
    { value: 'downloads', label: 'Most Downloaded', icon: <Download className="h-4 w-4" /> },
    { value: 'upvotes', label: 'Most Upvoted', icon: <ThumbsUp className="h-4 w-4" /> }
  ]

  // Sort results based on selected option
  useEffect(() => {
    let sorted = [...results.resources]
    
    switch (sortBy) {
      case 'recent':
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'popular':
        sorted.sort((a, b) => (b.views + b.downloads) - (a.views + a.downloads))
        break
      case 'downloads':
        sorted.sort((a, b) => b.downloads - a.downloads)
        break
      case 'upvotes':
        sorted.sort((a, b) => b.upvotes - a.upvotes)
        break
      case 'relevance':
      default:
        // Keep original order for relevance (already sorted by search service with ranking)
        break
    }
    
    setSortedResults(sorted)
  }, [results.resources, sortBy])

  // Check if results have ranking information
  const hasRankingInfo = results.resources.some(resource => 
    'rankingScore' in resource && 'rankingFactors' in resource
  )

  // Highlight search terms in text
  const highlightText = (text: string, searchQuery: string): React.ReactNode => {
    if (!searchQuery.trim() || !text) return text

    const terms = searchQuery.trim().split(/\s+/).filter(term => term.length > 1)
    if (terms.length === 0) return text

    let highlightedText = text
    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi')
      highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">$1</mark>')
    })

    return <span dangerouslySetInnerHTML={{ __html: highlightedText }} />
  }

  // Handle result click with analytics
  const handleResultClick = (resource: Resource, position: number) => {
    onResultClick?.(resource, position)
  }

  if (loading) {
    return (
      <div className={cn("space-y-4", className)} role="region" aria-label="Search results loading">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div 
          className={cn(
            "grid gap-4",
            viewMode === 'grid' ? "md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
          )}
          aria-label="Loading search results"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4" aria-label={`Loading result ${i + 1}`}>
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-full mb-2" />
              <Skeleton className="h-3 w-2/3" />
            </Card>
          ))}
        </div>
        <div className="sr-only" aria-live="polite">
          Loading search results...
        </div>
      </div>
    )
  }

  if (!results.resources.length && !loading) {
    return (
      <div 
        className={cn("text-center py-12", className)} 
        role="region" 
        aria-label="No search results"
      >
        <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
        <h3 className="text-lg font-semibold mb-2">No results found</h3>
        <p className="text-muted-foreground mb-4">
          {query ? `No resources found for "${query}"` : 'Try adjusting your search terms or filters'}
        </p>
        <div className="flex flex-wrap gap-2 justify-center" role="list" aria-label="Search suggestions">
          <Badge variant="outline" role="listitem">Try different keywords</Badge>
          <Badge variant="outline" role="listitem">Check spelling</Badge>
          <Badge variant="outline" role="listitem">Use fewer filters</Badge>
        </div>
        <div className="sr-only" aria-live="polite">
          {query ? `No search results found for ${query}` : 'No search results found'}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)} role="region" aria-labelledby={statusId}>
      {/* Results Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div 
            id={statusId}
            className="text-sm text-muted-foreground"
            aria-live="polite"
            aria-atomic="true"
          >
            {results.total.toLocaleString()} result{results.total !== 1 ? 's' : ''}
            {query && (
              <span> for <span className="font-medium">&quot;{query}&quot;</span></span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2" role="toolbar" aria-label="Search result controls">
          {/* Sort Options */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger 
              className="w-40"
              aria-label="Sort search results"
              id={sortId}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true">{option.icon}</span>
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Ranking Info Toggle */}
          {hasRankingInfo && (
            <Button
              variant={showRankingInfo ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowRankingInfo(!showRankingInfo)}
              aria-pressed={showRankingInfo}
              aria-label={`${showRankingInfo ? 'Hide' : 'Show'} ranking information`}
            >
              <TrendingUp className="h-4 w-4 mr-2" aria-hidden="true" />
              Ranking Info
            </Button>
          )}

          {/* View Mode Toggle */}
          {onViewModeChange && (
            <div className="flex border rounded-md" role="group" aria-label="View mode">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('grid')}
                className="rounded-r-none"
                aria-pressed={viewMode === 'grid'}
                aria-label="Grid view"
              >
                <Grid className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('list')}
                className="rounded-l-none"
                aria-pressed={viewMode === 'list'}
                aria-label="List view"
              >
                <List className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Results Grid/List */}
      <div 
        id={resultsId}
        className={cn(
          "grid gap-4",
          viewMode === 'grid' 
            ? "md:grid-cols-2 lg:grid-cols-3" 
            : "grid-cols-1"
        )}
        role="list"
        aria-label={`Search results in ${viewMode} view`}
      >
        {sortedResults.map((resource, index) => {
          const rankedResource = resource as RankedResource
          const hasRanking = 'rankingScore' in rankedResource && 'rankingFactors' in rankedResource

          return (
            <div 
              key={resource.id} 
              onClick={() => handleResultClick(resource, index)}
              role="listitem"
              aria-posinset={index + 1}
              aria-setsize={sortedResults.length}
            >
              <div className="relative">
                <ResourceCard
                  resource={{
                    ...resource,
                    // Apply highlighting to title and description
                    title: typeof highlightText(resource.title, query) === 'string' 
                      ? resource.title 
                      : resource.title,
                    description: resource.description || ''
                  }}
                  onVote={() => {}}
                  showHighlighting={true}
                  highlightQuery={query}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
                    viewMode === 'list' && "flex-row"
                  )}
                />
                
                {/* Ranking Information Overlay */}
                {hasRanking && showRankingInfo && (
                  <div 
                    className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm border rounded-lg p-2 text-xs space-y-1 min-w-[120px]"
                    role="tooltip"
                    aria-label="Ranking information"
                  >
                    <div className="font-medium">Ranking Score</div>
                    <div className="text-muted-foreground">
                      {(rankedResource.rankingScore * 100).toFixed(1)}%
                    </div>
                    <div className="space-y-0.5 text-[10px]">
                      <div>Relevance: {(rankedResource.rankingFactors.relevanceScore * 100).toFixed(0)}%</div>
                      <div>Popularity: {(rankedResource.rankingFactors.popularityScore * 100).toFixed(0)}%</div>
                      <div>Quality: {(rankedResource.rankingFactors.qualityScore * 100).toFixed(0)}%</div>
                      <div>CTR: {(rankedResource.rankingFactors.clickThroughScore * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                )}

                {/* Position Badge */}
                <div 
                  className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full"
                  aria-label={`Result position ${index + 1}`}
                >
                  #{index + 1}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Load More Button */}
      {onLoadMore && results.resources.length < results.total && (
        <div className="text-center pt-6">
          <Button 
            onClick={onLoadMore} 
            variant="outline"
            aria-label={`Load more results. Currently showing ${results.resources.length} of ${results.total} results`}
          >
            Load More Results
          </Button>
        </div>
      )}

      {/* Results Summary */}
      {results.resources.length > 0 && (
        <div 
          className="text-center text-sm text-muted-foreground pt-4 border-t"
          aria-live="polite"
          aria-atomic="true"
        >
          Showing {results.resources.length} of {results.total.toLocaleString()} results
        </div>
      )}

      {/* Screen reader announcement for result updates */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {results.resources.length > 0 && (
          `Search completed. Found ${results.total} results${query ? ` for ${query}` : ''}. Results are sorted by ${sortBy}.`
        )}
      </div>
    </div>
  )
}

// Enhanced Resource Card with highlighting support
interface HighlightedResourceCardProps {
  resource: Resource
  query: string
  onVote: () => void
  onClick?: () => void
  className?: string
}

export function HighlightedResourceCard({
  resource,
  query,
  onVote,
  onClick,
  className
}: HighlightedResourceCardProps) {
  const highlightText = (text: string): React.ReactNode => {
    if (!query.trim() || !text) return text

    const terms = query.trim().split(/\s+/).filter(term => term.length > 1)
    if (terms.length === 0) return text

    let highlightedText = text
    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi')
      highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">$1</mark>')
    })

    return <span dangerouslySetInnerHTML={{ __html: highlightedText }} />
  }

  return (
    <Card className={cn("p-4 cursor-pointer hover:shadow-md transition-all", className)} onClick={onClick}>
      <div className="space-y-3">
        <div>
          <h3 className="font-semibold line-clamp-2">
            {highlightText(resource.title)}
          </h3>
          {resource.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {highlightText(resource.description)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="text-xs">
            {resource.resource_type}
          </Badge>
          <span>•</span>
          <span>{resource.department}</span>
          <span>•</span>
          <span>{resource.course}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <ThumbsUp className="h-3 w-3" />
              {resource.upvotes}
            </span>
            <span className="flex items-center gap-1">
              <Download className="h-3 w-3" />
              {resource.downloads}
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              onVote()
            }}
          >
            Vote
          </Button>
        </div>
      </div>
    </Card>
  )
}