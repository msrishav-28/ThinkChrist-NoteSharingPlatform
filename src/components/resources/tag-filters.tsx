'use client'

import { useState, useEffect } from 'react'
import { X, Filter, Tag as TagIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { TagCloud } from '@/components/ui/tag-cloud'
import { useTags } from '@/lib/hooks/use-tags'
import { cn } from '@/lib/utils'

interface TagFiltersProps {
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
  department?: string
  course?: string
  className?: string
}

export function TagFilters({
  selectedTags,
  onTagsChange,
  department,
  course,
  className
}: TagFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  const { existingTags, searchTags } = useTags({
    department,
    course
  })

  useEffect(() => {
    if (searchQuery.trim()) {
      searchTags(searchQuery)
    } else {
      searchTags('')
    }
  }, [searchQuery, searchTags])

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag))
    } else {
      onTagsChange([...selectedTags, tag])
    }
  }

  const clearAllTags = () => {
    onTagsChange([])
  }

  const filteredExistingTags = existingTags.filter(tag => 
    !selectedTags.includes(tag) &&
    tag.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className={className}>
      {/* Selected Tags Display */}
      {selectedTags.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TagIcon className="h-4 w-4" />
              <span className="text-sm font-medium">Active Filters</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllTags}
              className="h-auto p-1 text-xs"
            >
              Clear all
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <Badge
                key={tag}
                variant="default"
                className="flex items-center gap-1 cursor-pointer"
                onClick={() => handleTagToggle(tag)}
              >
                {tag}
                <X className="h-3 w-3" />
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Tag Browser */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Browse Tags
            </div>
            <span className="text-xs text-muted-foreground">
              {isOpen ? 'Hide' : 'Show'}
            </span>
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-4 mt-4">
          {/* Tag Search */}
          <div>
            <Input
              placeholder="Search tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Search Results */}
          {searchQuery && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Search Results</CardTitle>
                <CardDescription className="text-xs">
                  {filteredExistingTags.length} tags found
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {filteredExistingTags.slice(0, 20).map((tag) => (
                    <Button
                      key={tag}
                      variant="outline"
                      size="sm"
                      className="h-auto p-1"
                      onClick={() => handleTagToggle(tag)}
                    >
                      <Badge variant="secondary" className="cursor-pointer">
                        {tag}
                      </Badge>
                    </Button>
                  ))}
                  {filteredExistingTags.length === 0 && searchQuery && (
                    <p className="text-sm text-muted-foreground">
                      No tags found matching "{searchQuery}"
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Popular Tags Cloud */}
          {!searchQuery && (
            <TagCloud
              onTagClick={handleTagToggle}
              selectedTags={selectedTags}
              department={department}
              course={course}
              maxTags={25}
              showCounts={true}
            />
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}