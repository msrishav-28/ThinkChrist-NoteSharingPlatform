'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Users,
  BookOpen,
  Tag as TagIcon
} from 'lucide-react'
import { useTagAnalytics } from '@/lib/hooks/use-tags'
import { TagManagementService, type TagAnalytics } from '@/lib/services/tag-management'
import { getDepartments } from '@/features/auth/utils'
import { cn } from '@/lib/utils'

interface TagUsageTrend {
  tag: string
  usage_count: number
  recent_usage: number
  growth_rate: number
}

export function TagAnalyticsDashboard() {
  const { analytics, loading, error } = useTagAnalytics()
  const [selectedDepartment, setSelectedDepartment] = useState<string>('')
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [filteredAnalytics, setFilteredAnalytics] = useState<TagAnalytics[]>([])

  useEffect(() => {
    let filtered = analytics
    
    if (selectedDepartment) {
      filtered = filtered.filter(tag => 
        tag.departments.includes(selectedDepartment)
      )
    }

    setFilteredAnalytics(filtered)
  }, [analytics, selectedDepartment])

  const getTopTags = (count: number = 10) => {
    return filteredAnalytics
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, count)
  }

  const getTrendingTags = (count: number = 10) => {
    return filteredAnalytics
      .filter(tag => tag.trending_score > 0.1)
      .sort((a, b) => b.trending_score - a.trending_score)
      .slice(0, count)
  }

  const getDepartmentDistribution = () => {
    const deptCounts: { [key: string]: number } = {}
    
    filteredAnalytics.forEach(tag => {
      tag.departments.forEach(dept => {
        deptCounts[dept] = (deptCounts[dept] || 0) + tag.usage_count
      })
    })

    return Object.entries(deptCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
  }

  const getTagGrowthRate = (tag: TagAnalytics): number => {
    if (tag.usage_count === 0) return 0
    return (tag.recent_usage / tag.usage_count) * 100
  }

  const getGrowthColor = (growthRate: number) => {
    if (growthRate > 50) return 'text-green-600'
    if (growthRate > 25) return 'text-blue-600'
    if (growthRate > 10) return 'text-yellow-600'
    return 'text-gray-600'
  }

  const getUsageIntensity = (usage: number, maxUsage: number) => {
    const ratio = usage / maxUsage
    if (ratio > 0.8) return 'bg-red-500'
    if (ratio > 0.6) return 'bg-orange-500'
    if (ratio > 0.4) return 'bg-yellow-500'
    if (ratio > 0.2) return 'bg-blue-500'
    return 'bg-gray-300'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">{error}</div>
        </CardContent>
      </Card>
    )
  }

  const topTags = getTopTags()
  const trendingTags = getTrendingTags()
  const departmentDistribution = getDepartmentDistribution()
  const maxUsage = Math.max(...filteredAnalytics.map(tag => tag.usage_count))
  
  const totalTags = filteredAnalytics.length
  const totalUsage = filteredAnalytics.reduce((sum, tag) => sum + tag.usage_count, 0)
  const avgUsagePerTag = totalTags > 0 ? Math.round(totalUsage / totalTags) : 0
  const activeTags = filteredAnalytics.filter(tag => tag.recent_usage > 0).length

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Tag Analytics
          </h2>
          <p className="text-muted-foreground">
            Insights into tag usage and trends across the platform
          </p>
        </div>
        
        <div className="flex gap-4">
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Departments</SelectItem>
              {getDepartments().map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={timeRange} onValueChange={(value: '7d' | '30d' | '90d') => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 days</SelectItem>
              <SelectItem value="30d">30 days</SelectItem>
              <SelectItem value="90d">90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tags</CardTitle>
            <TagIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTags}</div>
            <p className="text-xs text-muted-foreground">
              {selectedDepartment ? `in ${selectedDepartment}` : 'across platform'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsage}</div>
            <p className="text-xs text-muted-foreground">
              tag applications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Usage</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgUsagePerTag}</div>
            <p className="text-xs text-muted-foreground">
              per tag
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tags</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTags}</div>
            <p className="text-xs text-muted-foreground">
              used recently
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Tags */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Most Used Tags
            </CardTitle>
            <CardDescription>
              Tags with highest usage count
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topTags.map((tag, index) => (
                <div key={tag.tag} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium text-muted-foreground w-6">
                      #{index + 1}
                    </div>
                    <Badge variant="outline">{tag.tag}</Badge>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium">{tag.usage_count}</div>
                    <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all",
                          getUsageIntensity(tag.usage_count, maxUsage)
                        )}
                        style={{
                          width: `${(tag.usage_count / maxUsage) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Trending Tags */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Trending Tags
            </CardTitle>
            <CardDescription>
              Tags gaining popularity recently
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {trendingTags.map((tag, index) => (
                <div key={tag.tag} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium text-muted-foreground w-6">
                      #{index + 1}
                    </div>
                    <Badge variant="outline">{tag.tag}</Badge>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "text-sm font-medium",
                      getGrowthColor(getTagGrowthRate(tag))
                    )}>
                      +{Math.round(getTagGrowthRate(tag))}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {tag.recent_usage}/{tag.usage_count}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Distribution */}
      {!selectedDepartment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Department Distribution
            </CardTitle>
            <CardDescription>
              Tag usage across different departments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {departmentDistribution.map(([dept, count]) => (
                <div key={dept} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="font-medium">{dept}</div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium">{count}</div>
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{
                          width: `${(count / Math.max(...departmentDistribution.map(([, c]) => c))) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tag Cloud Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TagIcon className="h-5 w-5" />
            Tag Usage Heatmap
          </CardTitle>
          <CardDescription>
            Visual representation of tag popularity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {filteredAnalytics.slice(0, 50).map((tag) => {
              const size = Math.max(12, Math.min(24, (tag.usage_count / maxUsage) * 20 + 12))
              const opacity = Math.max(0.4, tag.usage_count / maxUsage)
              
              return (
                <Badge
                  key={tag.tag}
                  variant={tag.trending_score > 0.3 ? 'default' : 'secondary'}
                  className="transition-all hover:scale-110"
                  style={{
                    fontSize: `${size}px`,
                    opacity
                  }}
                >
                  {tag.tag}
                  {tag.trending_score > 0.3 && (
                    <TrendingUp className="h-3 w-3 ml-1" />
                  )}
                </Badge>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}