'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TagCloud } from '@/components/ui/tag-cloud'
import { TagFilters } from './tag-filters'
import { ResourceGrid } from './resource-grid'
import { ArrowLeft, Tag as TagIcon, TrendingUp, Users, BookOpen } from 'lucide-react'
import { TagManagementService, type TagAnalytics } from '@/lib/services/tag-management'
import { DatabaseUtils } from '@/lib/database-utils'
import type { Resource } from '@/types'
import { cn } from '@/lib/utils'

interface TagNavigationProps {
  department?: string
  course?: string
}

export function TagNavigation({ department, course }: TagNavigationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedTag = searchParams.get('tag')
  
  const [tagAnalytics, setTagAnalytics] = useState<TagAnalytics[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [resourcesLoading, setResourcesLoading] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>(
    selectedTag ? [selectedTag] : []
  )

  // Fetch tag analytics
  useEffect(() => {
    const fetchTagAnalytics = async () => {
      setLoading(true)
      try {
        const analytics = await TagManagementService.getTagAnalytics(50)
        
        // Filter by department/course if specified
        let filteredAnalytics = analytics
        if (department) {
          filteredAnalytics = filteredAnalytics.filter(tag => 
            tag.departments.includes(department)
          )
        }
        if (course) {
          filteredAnalytics = filteredAnalytics.filter(tag => 
            tag.courses.includes(course)
          )
        }

        setTagAnalytics(filteredAnalytics)
      } catch (error) {
        console.error('Error fetching tag analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTagAnalytics()
  }, [department, course])

  // Fetch resources when tags change
  useEffect(() => {
    const fetchResources = async () => {
      if (selectedTags.length === 0) {
        setResources([])
        return
      }

      setResourcesLoading(true)
      try {
        const results = await DatabaseUtils.searchResources(
          '', // No text query
          {
            tags: selectedTags,
            departments: department ? [department] : undefined,
            courses: course ? [course] : undefined,
          },
          20
        )
        setResources(results)
      } catch (error) {
        console.error('Error fetching resources:', error)
      } finally {
        setResourcesLoading(false)
      }
    }

    fetchResources()
  }, [selectedTags, department, course])

  const handleTagClick = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag]
    
    setSelectedTags(newTags)
    
    // Update URL
    const params = new URLSearchParams(searchParams.toString())
    if (newTags.length > 0) {
      params.set('tag', newTags[0]) // For simplicity, show first tag in URL
    } else {
      params.delete('tag')
    }
    router.push(`?${params.toString()}`, { scroll: false })
  }

  const getTagsByCategory = () => {
    const trending = tagAnalytics
      .filter(tag => tag.trending_score > 0.3)
      .slice(0, 10)
    
    const popular = tagAnalytics
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, 15)
    
    const departmentSpecific = department 
      ? tagAnalytics.filter(tag => 
          tag.departments.length === 1 && tag.departments[0] === department
        ).slice(0, 10)
      : []

    return { trending, popular, departmentSpecific }
  }

  const { trending, popular, departmentSpecific } = getTagsByCategory()

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <Skeleton key={j} className="h-6 w-16" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TagIcon className="h-6 w-6" />
            Tag Navigation
          </h1>
          <p className="text-muted-foreground">
            Discover resources by browsing tags
            {department && ` in ${department}`}
            {course && ` for ${course}`}
          </p>
        </div>
        
        {selectedTags.length > 0 && (
          <Button
            variant="outline"
            onClick={() => setSelectedTags([])}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Clear Selection
          </Button>
        )}
      </div>

      {/* Tag Categories */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Trending Tags */}
        {trending.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5" />
                Trending Tags
              </CardTitle>
              <CardDescription>
                Tags gaining popularity recently
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {trending.map((tag) => (
                  <Button
                    key={tag.tag}
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1"
                    onClick={() => handleTagClick(tag.tag)}
                  >
                    <Badge
                      variant={selectedTags.includes(tag.tag) ? 'default' : 'secondary'}
                      className={cn(
                        "cursor-pointer transition-colors",
                        selectedTags.includes(tag.tag) && "bg-primary text-primary-foreground"
                      )}
                    >
                      {tag.tag}
                      <span className="ml-1 text-xs">🔥</span>
                    </Badge>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Popular Tags */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Most Popular
            </CardTitle>
            <CardDescription>
              Most frequently used tags
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {popular.slice(0, 12).map((tag) => (
                <Button
                  key={tag.tag}
                  variant="ghost"
                  size="sm"
                  className="h-auto p-1"
                  onClick={() => handleTagClick(tag.tag)}
                >
                  <Badge
                    variant={selectedTags.includes(tag.tag) ? 'default' : 'secondary'}
                    className={cn(
                      "cursor-pointer transition-colors",
                      selectedTags.includes(tag.tag) && "bg-primary text-primary-foreground"
                    )}
                  >
                    {tag.tag}
                    <span className="ml-1 text-xs opacity-70">
                      {tag.usage_count}
                    </span>
                  </Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Department Specific Tags */}
        {departmentSpecific.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5" />
                {department} Specific
              </CardTitle>
              <CardDescription>
                Tags unique to this department
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {departmentSpecific.map((tag) => (
                  <Button
                    key={tag.tag}
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1"
                    onClick={() => handleTagClick(tag.tag)}
                  >
                    <Badge
                      variant={selectedTags.includes(tag.tag) ? 'default' : 'secondary'}
                      className={cn(
                        "cursor-pointer transition-colors",
                        selectedTags.includes(tag.tag) && "bg-primary text-primary-foreground"
                      )}
                    >
                      {tag.tag}
                      <span className="ml-1 text-xs opacity-70">
                        {tag.usage_count}
                      </span>
                    </Badge>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Advanced Tag Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Tag Search</CardTitle>
          <CardDescription>
            Search and filter by multiple tags
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TagFilters
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
            department={department}
            course={course}
          />
        </CardContent>
      </Card>

      {/* Resources for Selected Tags */}
      {selectedTags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Resources for: {selectedTags.map(tag => `#${tag}`).join(', ')}
            </CardTitle>
            <CardDescription>
              {resourcesLoading 
                ? 'Loading resources...' 
                : `${resources.length} resources found`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {resourcesLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            ) : resources.length > 0 ? (
              <ResourceGrid resources={resources} />
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  No resources found for the selected tags.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setSelectedTags([])}
                >
                  Clear filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* All Tags Cloud (when no tags selected) */}
      {selectedTags.length === 0 && (
        <TagCloud
          onTagClick={handleTagClick}
          selectedTags={selectedTags}
          department={department}
          course={course}
          maxTags={50}
          showCounts={true}
        />
      )}
    </div>
  )
}