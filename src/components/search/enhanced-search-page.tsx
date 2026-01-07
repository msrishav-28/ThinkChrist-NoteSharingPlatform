'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { AdvancedSearchBar } from './advanced-search-bar'
import { SearchFilters } from './search-filters'
import { SearchResults } from './search-results'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  X,
  TrendingUp,
  Clock,
  Sparkles
} from 'lucide-react'
import { searchService } from '@/lib/services/search'
import type {
  SearchFilters as SearchFiltersType,
  SearchResults as SearchResultsType,
  SearchSuggestion,
  Resource
} from '@/types'
import { useAuth } from '@/features/auth'
import { cn } from '@/lib/utils'

interface EnhancedSearchPageProps {
  initialQuery?: string
  initialFilters?: SearchFiltersType
  collectionId?: string
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
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  // Popular searches and suggestions
  const [popularSearches, setPopularSearches] = useState<SearchSuggestion[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  // Initialize from URL params
  useEffect(() => {
    const urlQuery = searchParams.get('q') || ''
    const urlFilters: SearchFiltersType = {}

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
    <div className={cn("space-y-8 p-1", className)}>
      {/* Premium Glassmorphic Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-950 p-8 sm:p-12 text-white shadow-2xl"
      >
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20 mix-blend-overlay" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 animate-pulse" />

        <div className="relative z-10 space-y-6 max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sm font-medium mb-2">
            <Sparkles className="h-4 w-4 text-amber-300" />
            <span className="text-white/90">Discover Knowledge</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold font-heading tracking-tight text-white mb-2">
            {collectionId ? 'Search Collection' : 'Find Resources'}
          </h1>

          <p className="text-lg text-indigo-100 max-w-2xl mx-auto mb-8">
            {collectionId
              ? 'Explore resources within this specific collection'
              : 'Access thousands of notes, assignments, and study materials shared by the community.'
            }
          </p>

          <div className="max-w-xl mx-auto">
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
              className="shadow-xl"
            />
          </div>
        </div>
      </motion.div>

      {/* Active Filters Display */}
      <AnimatePresence>
        {activeFilterCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-2 justify-center"
          >
            {filters.resourceTypes?.map(type => (
              <Badge key={type} variant="secondary" className="gap-1 pl-3 pr-1 py-1.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors">
                {type}
                <button
                  className="ml-1 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
                  onClick={() => handleFiltersChange({
                    ...filters,
                    resourceTypes: filters.resourceTypes?.filter(t => t !== type)
                  })}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {filters.departments?.map(dept => (
              <Badge key={dept} variant="secondary" className="gap-1 pl-3 pr-1 py-1.5 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors">
                {dept}
                <button
                  className="ml-1 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
                  onClick={() => handleFiltersChange({
                    ...filters,
                    departments: filters.departments?.filter(d => d !== dept)
                  })}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 text-xs text-muted-foreground hover:text-foreground">
              Clear All
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="grid gap-8 lg:grid-cols-4">
        {/* Filters Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className={cn(
            "lg:col-span-1",
            showFilters ? "block" : "hidden lg:block",
            "bg-white/50 dark:bg-black/20 backdrop-blur-xl rounded-2xl p-6 border border-white/10 h-fit sticky top-6 shadow-sm"
          )}
        >
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-lg font-semibold text-foreground/80">
              <Sparkles className="h-5 w-5 text-indigo-500" />
              <h2>Filters</h2>
            </div>

            <SearchFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              facets={results.facets}
            />

            {/* Popular Searches */}
            {!hasActiveSearch && popularSearches.length > 0 && (
              <div className="pt-6 border-t border-border/50">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-indigo-500" />
                  <h3 className="font-semibold text-sm">Trending</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {popularSearches.map((search, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSearch(search.text)}
                      className="h-auto p-2 text-xs bg-white/50 hover:bg-indigo-50 dark:bg-white/5 dark:hover:bg-indigo-900/20 border-indigo-200/30 transition-all hover:scale-105"
                    >
                      {search.text}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Searches */}
            {!hasActiveSearch && recentSearches.length > 0 && (
              <div className="pt-6 border-t border-border/50">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-purple-500" />
                  <h3 className="font-semibold text-sm">Recent</h3>
                </div>
                <div className="space-y-1">
                  {recentSearches.map((search, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSearch(search)}
                      className="w-full justify-start h-auto p-2 text-xs text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-white/10"
                    >
                      {search}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Results Area */}
        <div className="lg:col-span-3 min-h-[500px]">
          {error && (
            <Card className="p-4 border-destructive bg-destructive/10 text-destructive mb-6">
              <p>{error}</p>
            </Card>
          )}

          {!hasActiveSearch && !loading ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center space-y-6 bg-white/30 dark:bg-black/20 backdrop-blur-sm rounded-3xl border border-dashed border-border"
            >
              <div className="h-24 w-24 rounded-full bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 flex items-center justify-center animate-pulse">
                <Search className="h-10 w-10 text-indigo-500" />
              </div>
              <div className="space-y-2 max-w-md">
                <h3 className="text-xl font-bold">Start your discovery</h3>
                <p className="text-muted-foreground">
                  Search across thousands of resources, filter by department, or explore trending topics to find exactly what you need.
                </p>
              </div>
            </motion.div>
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