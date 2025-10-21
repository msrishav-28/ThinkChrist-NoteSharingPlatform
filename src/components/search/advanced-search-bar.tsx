'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, X, Filter, Clock, Tag, BookOpen, Building } from 'lucide-react'
import { searchService } from '@/lib/services/search'
import type { SearchSuggestion } from '@/lib/services/search'
import { cn } from '@/lib/utils'

interface AdvancedSearchBarProps {
  onSearch: (query: string, suggestions?: SearchSuggestion[]) => void
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void
  placeholder?: string
  className?: string
  showFilters?: boolean
  onToggleFilters?: () => void
  initialQuery?: string
}

export function AdvancedSearchBar({
  onSearch,
  onSuggestionSelect,
  placeholder = "Search resources, courses, tags...",
  className,
  showFilters = true,
  onToggleFilters,
  initialQuery = ''
}: AdvancedSearchBarProps) {
  const [query, setQuery] = useState(initialQuery)
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isLoading, setIsLoading] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recent-searches')
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved))
      } catch (error) {
        console.error('Error loading recent searches:', error)
      }
    }
  }, [])

  // Save recent searches to localStorage
  const saveRecentSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return
    
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem('recent-searches', JSON.stringify(updated))
  }, [recentSearches])

  // Debounced suggestion fetching
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([])
      return
    }

    setIsLoading(true)
    try {
      const results = await searchService.getSuggestions(searchQuery, 8)
      setSuggestions(results)
    } catch (error) {
      console.error('Error fetching suggestions:', error)
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Handle input change with debouncing
  const handleInputChange = (value: string) => {
    setQuery(value)
    setSelectedIndex(-1)
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value)
    }, 300)
  }

  // Handle search execution
  const handleSearch = (searchQuery?: string) => {
    const finalQuery = searchQuery || query
    if (!finalQuery.trim()) return

    saveRecentSearch(finalQuery)
    setShowSuggestions(false)
    onSearch(finalQuery, suggestions)
  }

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text)
    setShowSuggestions(false)
    onSuggestionSelect?.(suggestion)
    handleSearch(suggestion.text)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return

    const totalSuggestions = suggestions.length + recentSearches.length

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < totalSuggestions - 1 ? prev + 1 : -1
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > -1 ? prev - 1 : totalSuggestions - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0) {
          if (selectedIndex < recentSearches.length) {
            handleSearch(recentSearches[selectedIndex])
          } else {
            const suggestionIndex = selectedIndex - recentSearches.length
            handleSuggestionSelect(suggestions[suggestionIndex])
          }
        } else {
          handleSearch()
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setSelectedIndex(-1)
        break
    }
  }

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Clear search
  const clearSearch = () => {
    setQuery('')
    setSuggestions([])
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  // Get icon for suggestion type
  const getSuggestionIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'tag':
        return <Tag className="h-4 w-4" />
      case 'course':
        return <BookOpen className="h-4 w-4" />
      case 'department':
        return <Building className="h-4 w-4" />
      case 'query':
        return <Search className="h-4 w-4" />
      default:
        return <Search className="h-4 w-4" />
    }
  }

  return (
    <div className={cn("relative w-full", className)} role="search">
      <div className="relative flex items-center">
        <div className="relative flex-1">
          <Search 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" 
            aria-hidden="true"
          />
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            className="pl-10 pr-20"
            data-search-input
            aria-label="Search resources"
            aria-describedby="search-instructions"
            aria-expanded={showSuggestions}
            aria-autocomplete="list"
            aria-controls={showSuggestions ? "search-suggestions" : undefined}
            role="combobox"
          />
          <div id="search-instructions" className="sr-only">
            Use arrow keys to navigate suggestions, Enter to select, Escape to close
          </div>
          {query && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-12 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-2 ml-2">
          <Button
            onClick={() => handleSearch()}
            size="sm"
            className="px-4"
            aria-label="Execute search"
          >
            <Search className="h-4 w-4 mr-1" aria-hidden="true" />
            Search
          </Button>
          
          {showFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleFilters}
              className="px-3"
              aria-label="Toggle search filters"
            >
              <Filter className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (query.length >= 2 || recentSearches.length > 0) && (
        <Card 
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-1 z-50 max-h-80 overflow-y-auto"
          id="search-suggestions"
          role="listbox"
          aria-label="Search suggestions"
        >
          <div className="p-2">
            {/* Recent Searches */}
            {recentSearches.length > 0 && query.length < 2 && (
              <div className="mb-2">
                <div className="flex items-center gap-2 px-2 py-1 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  Recent searches
                </div>
                {recentSearches.map((recent, index) => (
                  <button
                    key={`recent-${index}`}
                    onClick={() => handleSearch(recent)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors",
                      "flex items-center gap-2 focus:outline-none focus:bg-accent",
                      selectedIndex === index && "bg-accent"
                    )}
                    role="option"
                    aria-selected={selectedIndex === index}
                    id={`suggestion-${index}`}
                  >
                    <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <span>{recent}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div>
                {query.length >= 2 && recentSearches.length > 0 && (
                  <div className="border-t pt-2 mt-2">
                    <div className="px-2 py-1 text-sm text-muted-foreground">
                      Suggestions
                    </div>
                  </div>
                )}
                
                {suggestions.map((suggestion, index) => {
                  const adjustedIndex = index + recentSearches.length
                  return (
                    <button
                      key={`suggestion-${index}`}
                      onClick={() => handleSuggestionSelect(suggestion)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors",
                        "flex items-center gap-2 focus:outline-none focus:bg-accent",
                        selectedIndex === adjustedIndex && "bg-accent"
                      )}
                      role="option"
                      aria-selected={selectedIndex === adjustedIndex}
                      id={`suggestion-${adjustedIndex}`}
                    >
                      <span aria-hidden="true">{getSuggestionIcon(suggestion.type)}</span>
                      <span className="flex-1">{suggestion.text}</span>
                      <Badge 
                        variant="secondary" 
                        className="text-xs"
                        aria-label={`Type: ${suggestion.type}`}
                      >
                        {suggestion.type}
                      </Badge>
                      {suggestion.count && (
                        <span 
                          className="text-xs text-muted-foreground"
                          aria-label={`${suggestion.count} results`}
                        >
                          {suggestion.count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Loading state */}
            {isLoading && (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                Loading suggestions...
              </div>
            )}

            {/* No suggestions */}
            {query.length >= 2 && !isLoading && suggestions.length === 0 && (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No suggestions found
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}