'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuth } from '@/features/auth'
import { usePreferences } from '@/features/user-management/hooks'
import { Resource } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { 
  TrendingUp, 
  Clock, 
  Users, 
  BookOpen,
  FileText,
  Video,
  Link,
  Code,
  Download,
  Eye,
  ThumbsUp,
  Loader2
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const resourceTypeIcons = {
  document: FileText,
  video: Video,
  link: Link,
  code: Code,
  article: BookOpen
}

interface FeedItem extends Resource {
  feed_reason: 'trending' | 'recent' | 'department' | 'course' | 'following'
  feed_score: number
}

export function PersonalizedFeed() {
  const { user, profile } = useAuth()
  const { preferences } = usePreferences()
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('for-you')
  const supabase = createClient()

  const loadFeedItems = useCallback(async () => {
    if (!user || !profile) return

    setLoading(true)
    try {
      let query = supabase
        .from('resources')
        .select(`
          *,
          users!resources_uploaded_by_fkey(full_name)
        `)
        .neq('uploaded_by', user.id) // Don't show user's own resources
        .order('created_at', { ascending: false })
        .limit(20)

      let items: Resource[] = []

      switch (activeTab) {
        case 'for-you':
          // Personalized feed based on user's department, courses, and interactions
          const { data: personalizedData } = await query
            .eq('department', profile.department)

          items = personalizedData || []
          break

        case 'trending':
          // Trending resources based on recent activity
          const { data: trendingData } = await query
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .order('upvotes', { ascending: false })

          items = trendingData || []
          break

        case 'recent':
          // Most recent resources
          const { data: recentData } = await query

          items = recentData || []
          break

        case 'department':
          // Resources from user's department
          const { data: departmentData } = await query
            .eq('department', profile.department)

          items = departmentData || []
          break

        default:
          items = []
      }

      // Add feed metadata
      const feedItems: FeedItem[] = items.map(item => ({
        ...item,
        feed_reason: getFeedReason(item, profile),
        feed_score: calculateFeedScore(item, profile)
      }))

      // Sort by feed score for personalized tab
      if (activeTab === 'for-you') {
        feedItems.sort((a, b) => b.feed_score - a.feed_score)
      }

      setFeedItems(feedItems)
    } catch (error) {
      console.error('Error loading feed items:', error)
      setFeedItems([])
    } finally {
      setLoading(false)
    }
  }, [user, profile, activeTab, supabase])

  useEffect(() => {
    if (user && profile) {
      loadFeedItems()
    }
  }, [user, profile, activeTab, loadFeedItems])

  const getFeedReason = (resource: Resource, userProfile: any): FeedItem['feed_reason'] => {
    if (resource.department === userProfile.department) {
      return 'department'
    }
    
    // Check if resource is trending (high engagement in last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const resourceDate = new Date(resource.created_at)
    if (resourceDate > weekAgo && resource.upvotes > 5) {
      return 'trending'
    }
    
    return 'recent'
  }

  const calculateFeedScore = (resource: Resource, userProfile: any): number => {
    let score = 0
    
    // Base score for recency (newer = higher score)
    const ageInDays = (Date.now() - new Date(resource.created_at).getTime()) / (24 * 60 * 60 * 1000)
    score += Math.max(0, 1 - (ageInDays / 30)) * 0.3 // Decay over 30 days
    
    // Department match bonus
    if (resource.department === userProfile.department) {
      score += 0.4
      
      // Course match bonus (if available)
      if (resource.course && resource.course === resource.course) {
        score += 0.3
      }
    }
    
    // Engagement score
    const engagementScore = (resource.upvotes * 2 + resource.downloads + resource.views * 0.1) / 100
    score += Math.min(0.5, engagementScore)
    
    // Difficulty level preference (assume intermediate is preferred)
    if (resource.difficulty_level === 'intermediate') {
      score += 0.1
    }
    
    return Math.min(1, score)
  }

  const handleResourceClick = (resourceId: string) => {
    // Track interaction for recommendations
    // This would be handled by the parent component or a global interaction tracker
    window.location.href = `/resources/${resourceId}`
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Personalized Feed
        </CardTitle>
        <CardDescription>
          Content curated based on your interests and activity
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="for-you" className="text-xs">For You</TabsTrigger>
            <TabsTrigger value="trending" className="text-xs">Trending</TabsTrigger>
            <TabsTrigger value="recent" className="text-xs">Recent</TabsTrigger>
            <TabsTrigger value="department" className="text-xs">Department</TabsTrigger>
          </TabsList>
          
          <div className="mt-4">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                    <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                    <div className="flex gap-2">
                      <div className="h-5 bg-muted animate-pulse rounded w-16" />
                      <div className="h-5 bg-muted animate-pulse rounded w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : feedItems.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">No content available</p>
                <p className="text-sm text-muted-foreground">
                  {activeTab === 'for-you' 
                    ? 'Start interacting with resources to get personalized recommendations'
                    : 'Check back later for new content'
                  }
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-4 pr-4">
                  {feedItems.map((item) => {
                    const ResourceIcon = resourceTypeIcons[item.resource_type] || FileText
                    
                    return (
                      <div
                        key={item.id}
                        className="border rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => handleResourceClick(item.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <ResourceIcon className="h-4 w-4 text-primary" />
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm leading-tight mb-1 line-clamp-2">
                              {item.title}
                            </h4>
                            
                            {item.description && (
                              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                {item.description}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="secondary" className="text-xs">
                                {item.department}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {item.course}
                              </Badge>
                              {item.difficulty_level && (
                                <Badge 
                                  variant={
                                    item.difficulty_level === 'beginner' ? 'default' :
                                    item.difficulty_level === 'intermediate' ? 'secondary' : 'destructive'
                                  }
                                  className="text-xs"
                                >
                                  {item.difficulty_level}
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <ThumbsUp className="h-3 w-3" />
                                  <span>{item.upvotes}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Download className="h-3 w-3" />
                                  <span>{item.downloads}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Eye className="h-3 w-3" />
                                  <span>{item.views}</span>
                                </div>
                              </div>
                              
                              <div className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                              </div>
                            </div>

                            {item.tags && item.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {item.tags.slice(0, 3).map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
                                    {tag}
                                  </Badge>
                                ))}
                                {item.tags.length > 3 && (
                                  <Badge variant="outline" className="text-xs px-1 py-0">
                                    +{item.tags.length - 3}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </Tabs>
      </CardContent>
    </Card>
  )
}
 