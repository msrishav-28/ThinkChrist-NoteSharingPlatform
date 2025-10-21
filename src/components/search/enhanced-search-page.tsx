'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AdvancedSearchBar } from './advanced-search-bar'
import { SearchFilters } from './search-filters'
import { SearchResults } from './search-results'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Search, 
  Filter, 
  X, 
  BookOpen, 
  TrendingUp,
  Clock,
  Sparkles
} from 'lucide-react'
import { searchService } from '@/lib/services/search'
import type { 
  SearchFilters as SearchFiltersType, 
  SearchResults as SearchResultsType,
  SearchSuggestion,
  Resource,
  Collection
} from '@/types'
import { useAuth } from '@/features/auth'
import { cn } from '@/lib/utils'

interface EnhancedSearchPageProps {
  initialQuery?: string
  initialFilters?: SearchFiltersType
  collectionId?: string // For searching within a specific collection
  className?: string
}

export function EnhancedSearchPage({
  initialQuery = '',
  initialFilters = {},
  collectionId,
  className
}: EnhancedSearchPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  // Search state
  const [query, setQuery] = useState(initialQuery)
  const [filters, setFilters] = useState<SearchFiltersType>(initialFilters)
  const [results, setResults] = useState<SearchResultsType>({
    resources: [],
    total: 0,
    facets: {
      resourceTypes: {},
      departments: {},
      courses: {},
      tags: {},
      difficulty: {}
    }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // UI state
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [activeTab, setActiveTab] = useState('all')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  // Popular searches and suggestions
  const [popularSearches, setPopularSearches] = useState<SearchSuggestion[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  // Initialize from URL params
  useEffect(() => {
    const urlQuery = searchParams.get('q') || ''
    const urlFilters: SearchFiltersType = {}
    
    // Parse filters from URL
    const resourceTypes = searchParams.get('types')?.split(',')
    const departments = searchParams.get('departments')?.split(',')
    const courses = searchParams.get('courses')?.split(',')
    const tags = searchParams.get('tags')?.split(',')
    
    if (resourceTypes?.length) urlFilters.resourceTypes = resourceTypes as any
    if (departments?.length) urlFilters.departments = departments
    if (courses?.length) urlFilters.courses = courses
    if (tags?.length) urlFilters.tags = tags

    setQuery(urlQuery)
    setFilters(urlFilters)

    if (urlQuery || Object.keys(urlFilters).length > 0) {
      performSearch(urlQuery, urlFilters, 1)
    }
  }, [searchParams])

  // Load popular searches on mount
  useEffect(() => {
    loadPopularSearches()
    loadRecentSearches()
  }, [])

  // Perform search
  const performSearch = useCallback(async (
    searchQuery: string, 
    searchFilters: SearchFiltersType = {}, 
    pageNum: number = 1,
    append: boolean = false
  ) => {
    if (!searchQuery.trim() && Object.keys(searchFilters).length === 0) {
      setResults({ 
        resources: [], 
        total: 0, 
        facets: {
          resourceTypes: {},
          departments: {},
          courses: {},
          tags: {},
          difficulty: {}
        }
      })
      return
    }

    setLoading(true)
    setError(null)

    try {
      let searchResults: SearchResultsType

      if (collectionId) {
        // Search within collection
        const resources = await searchService.searchInCollection(
          collectionId,
          searchQuery,
          searchFilters
        )
        searchResults = {
          resources,
          total: resources.length,
          facets: {
            resourceTypes: {},
            departments: {},
            courses: {},
            tags: {},
            difficulty: {}
          }
        }
      } else {
        // Global search
        searchResults = await searchService.search(
          searchQuery,
          searchFilters,
          {
            limit: 20,
            offset: (pageNum - 1) * 20,
            userId: user?.id,
            trackAnalytics: true
          }
        )
      }

      if (append) {
        setResults(prev => ({
          ...searchResults,
          resources: [...prev.resources, ...searchResults.resources]
        }))
      } else {
        setResults(searchResults)
      }

      setHasMore(searchResults.resources.length === 20 && searchResults.total > pageNum * 20)
      
      // Update URL
      updateURL(searchQuery, searchFilters)
      
      // Save to recent searches
      if (searchQuery.trim()) {
        saveRecentSearch(searchQuery)
      }

    } catch (err) {
      console.error('Search error:', err)
      setError('Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [collectionId, user?.id])

  // Handle search from search bar
  const handleSearch = (searchQuery: string, suggestions?: SearchSuggestion[]) => {
    setQuery(searchQuery)
    setPage(1)
    performSearch(searchQuery, filters, 1)
  }

  // Handle filter changes
  const handleFiltersChange = (newFilters: SearchFiltersType) => {
    setFilters(newFilters)
    setPage(1)
    performSearch(query, newFilters, 1)
  }

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'tag') {
      const newFilters = {
        ...filters,
        tags: [...(filters.tags || []), suggestion.text]
      }
      setFilters(newFilters)
      performSearch(query, newFilters, 1)
    } else if (suggestion.type === 'department') {
      const newFilters = {
        ...filters,
        departments: [...(filters.departments || []), suggestion.text]
      }
      setFilters(newFilters)
      performSearch(query, newFilters, 1)
    } else if (suggestion.type === 'course') {
      const newFilters = {
        ...filters,
        courses: [...(filters.courses || []), suggestion.text]
      }
      setFilters(newFilters)
      performSearch(query, newFilters, 1)
    } else {
      handleSearch(suggestion.text)
    }
  }

  // Handle result click for analytics
  const handleResultClick = async (resource: Resource, position: number) => {
    if (user?.id && query) {
      try {
        await searchService.trackSearchResultClick(
          user.id,
          resource.id,
          query,
          position
        )
      } catch (error) {
        console.error('Error tracking result click:', error)
      }
    }
    
    // Navigate to resource
    router.push(`/resources/${resource.id}`)
  }

  // Load more results
  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    performSearch(query, filters, nextPage, true)
  }

  // Clear all filters and search
  const clearAll = () => {
    setQuery('')
    setFilters({})
    setResults({ 
      resources: [], 
      total: 0, 
      facets: {
        resourceTypes: {},
        departments: {},
        courses: {},
        tags: {},
        difficulty: {}
      }
    })
    router.push('/search')
  }

  // Helper functions
  const updateURL = (searchQuery: string, searchFilters: SearchFiltersType) => {
    const params = new URLSearchParams()
    
    if (searchQuery) params.set('q', searchQuery)
    if (searchFilters.resourceTypes?.length) {
      params.set('types', searchFilters.resourceTypes.join(','))
    }
    if (searchFilters.departments?.length) {
      params.set('departments', searchFilters.departments.join(','))
    }
    if (searchFilters.courses?.length) {
      params.set('courses', searchFilters.courses.join(','))
    }
    if (searchFilters.tags?.length) {
      params.set('tags', searchFilters.tags.join(','))
    }

    const newURL = params.toString() ? `/search?${params.toString()}` : '/search'
    router.replace(newURL, { scroll: false })
  }

  const loadPopularSearches = async () => {
    try {
      const popular = await searchService.getPopularSearchTerms(8)
      setPopularSearches(popular)
    } catch (error) {
      console.error('Error loading popular searches:', error)
    }
  }

  const loadRecentSearches = () => {
    const saved = localStorage.getItem('recent-searches')
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved))
      } catch (error) {
        console.error('Error loading recent searches:', error)
      }
    }
  }

  const saveRecentSearch = (searchQuery: string) => {
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem('recent-searches', JSON.stringify(updated))
  }

  // Get active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.resourceTypes?.length) count += filters.resourceTypes.length
    if (filters.departments?.length) count += filters.departments.length
    if (filters.courses?.length) count += filters.courses.length
    if (filters.tags?.length) count += filters.tags.length
    if (filters.difficulty?.length) count += filters.difficulty.length
    if (filters.dateRange) count += 1
    return count
  }, [filters])

  const hasActiveSearch = query.trim() || activeFilterCount > 0

  return (
    <div className={cn("space-y-6", className)}>
      {/* Search Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {collectionId ? 'Search Collection' : 'Search Resources'}
            </h1>
            <p className="text-muted-foreground">
              {collectionId 
                ? 'Find resources within this collection'
                : 'Discover academic resources, courses, and materials'
              }
            </p>
          </div>
          
          {hasActiveSearch && (
            <Button variant="outline" onClick={clearAll}>
              <X className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>

        {/* Search Bar */}
        <AdvancedSearchBar
          onSearch={handleSearch}
          onSuggestionSelect={handleSuggestionSelect}
          initialQuery={query}
          showFilters={true}
          onToggleFilters={() => setShowFilters(!showFilters)}
          placeholder={collectionId 
            ? "Search within collection..." 
            : "Search resources, courses, tags..."
          }
        />

        {/* Active Filters Display */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.resourceTypes?.map(type => (
              <Badge key={type} variant="secondary" className="gap-1">
                {type}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => handleFiltersChange({
                    ...filters,
                    resourceTypes: filters.resourceTypes?.filter(t => t !== type)
                  })}
                />
              </Badge>
            ))}
            {filters.departments?.map(dept => (
              <Badge key={dept} variant="secondary" className="gap-1">
                {dept}
                <X 
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleFiltersChange({
                    ...filters,
                    departments: filters.departments?.filter(d => d !== dept)
                  })}
                />
              </Badge>
            ))}
            {filters.tags?.map(tag => (
              <Badge key={tag} variant="secondary" className="gap-1">
                #{tag}
                <X 
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleFiltersChange({
                    ...filters,
                    tags: filters.tags?.filter(t => t !== tag)
                  })}
                />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Filters Sidebar */}
        <div className={cn(
          "lg:col-span-1",
          showFilters ? "block" : "hidden lg:block"
        )}>
          <div className="sticky top-6 space-y-4">
            <SearchFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              facets={results.facets}
            />

            {/* Popular Searches */}
            {!hasActiveSearch && popularSearches.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold text-sm">Popular Searches</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {popularSearches.map((search, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSearch(search.text)}
                      className="h-auto p-2 text-xs"
                    >
                      {search.text}
                    </Button>
                  ))}
                </div>
              </Card>
            )}

            {/* Recent Searches */}
            {!hasActiveSearch && recentSearches.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold text-sm">Recent Searches</h3>
                </div>
                <div className="space-y-1">
                  {recentSearches.map((search, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSearch(search)}
                      className="w-full justify-start h-auto p-2 text-xs"
                    >
                      {search}
                    </Button>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Results Area */}
        <div className="lg:col-span-3">
          {error && (
            <Card className="p-4 border-destructive">
              <p className="text-destructive">{error}</p>
            </Card>
          )}

          {!hasActiveSearch && !loading ? (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Start searching</h3>
              <p className="text-muted-foreground">
                Enter keywords or use filters to find resources
              </p>
            </div>
          ) : (
            <SearchResults
              query={query}
              results={results}
              loading={loading}
              onLoadMore={hasMore ? handleLoadMore : undefined}
              onResultClick={handleResultClick}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          )}
        </div>
      </div>
    </div>
  )
}