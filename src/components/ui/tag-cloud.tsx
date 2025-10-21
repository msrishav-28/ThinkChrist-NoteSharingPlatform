'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TagManagementService, type TagAnalytics } from '@/lib/services/tag-management'
import { cn } from '@/lib/utils'

interface TagCloudProps {
  onTagClick?: (tag: string) => void
  selectedTags?: string[]
  department?: string
  course?: string
  maxTags?: number
  showCounts?: boolean
  className?: string
}

export function TagCloud({
  onTagClick,
  selectedTags = [],
  department,
  course,
  maxTags = 30,
  showCounts = true,
  className
}: TagCloudProps) {
  const [tags, setTags] = useState<TagAnalytics[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTags = async () => {
      setLoading(true)
      setError(null)

      try {
        const analytics = await TagManagementService.getTagAnalytics(maxTags)
        
        // Filter by department/course if specified
        let filteredTags = analytics
        if (department) {
          filteredTags = filteredTags.filter(tag => 
            tag.departments.includes(department)
          )
        }
        if (course) {
          filteredTags = filteredTags.filter(tag => 
            tag.courses.includes(course)
          )
        }

        setTags(filteredTags)
      } catch (err) {
        setError('Failed to load tags')
        console.error('Error fetching tags:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchTags()
  }, [department, course, maxTags])

  const getTagSize = (usage: number, maxUsage: number) => {
    const ratio = usage / maxUsage
    if (ratio > 0.8) return 'text-lg'
    if (ratio > 0.6) return 'text-base'
    if (ratio > 0.4) return 'text-sm'
    return 'text-xs'
  }

  const getTagVariant = (tag: string) => {
    if (selectedTags.includes(tag)) return 'default'
    return 'secondary'
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Popular Tags</CardTitle>
          <CardDescription>Loading tag cloud...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Popular Tags</CardTitle>
          <CardDescription className="text-destructive">{error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (tags.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Popular Tags</CardTitle>
          <CardDescription>No tags found for the current filters</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const maxUsage = Math.max(...tags.map(tag => tag.usage_count))

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Popular Tags</CardTitle>
        <CardDescription>
          {department && course 
            ? `Tags for ${course} in ${department}`
            : department 
            ? `Tags for ${department}`
            : 'Most used tags across all resources'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Button
              key={tag.tag}
              variant="ghost"
              size="sm"
              className={cn(
                "h-auto p-1 hover:bg-accent",
                getTagSize(tag.usage_count, maxUsage)
              )}
              onClick={() => onTagClick?.(tag.tag)}
            >
              <Badge
                variant={getTagVariant(tag.tag)}
                className={cn(
                  "cursor-pointer transition-colors",
                  selectedTags.includes(tag.tag) && "bg-primary text-primary-foreground"
                )}
              >
                {tag.tag}
                {showCounts && (
                  <span className="ml-1 text-xs opacity-70">
                    {tag.usage_count}
                  </span>
                )}
                {tag.trending_score > 0.3 && (
                  <span className="ml-1 text-xs">🔥</span>
                )}
              </Badge>
            </Button>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>Selected</span>
            </div>
            <div className="flex items-center gap-1">
              <span>🔥</span>
              <span>Trending</span>
            </div>
            {showCounts && (
              <div>
                <span>Numbers show usage count</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}