'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useRecommendations } from '@/hooks/use-recommendations'
import { 
  BookOpen, 
  Video, 
  Link, 
  Code, 
  FileText, 
  TrendingUp, 
  Users, 
  Target,
  Eye,
  Download,
  ThumbsUp
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const resourceTypeIcons = {
  document: FileText,
  video: Video,
  link: Link,
  code: Code,
  article: BookOpen
}

const reasonLabels = {
  collaborative_filtering: 'Similar users liked',
  content_based: 'Matches your interests',
  popularity: 'Trending in your department',
  department_match: 'From your department',
  course_match: 'From your course'
}

const reasonIcons = {
  collaborative_filtering: Users,
  content_based: Target,
  popularity: TrendingUp,
  department_match: BookOpen,
  course_match: BookOpen
}

export function Recommendations() {
  const { 
    recommendations, 
    loading, 
    error, 
    loadRecommendations, 
    trackInteraction 
  } = useRecommendations({ limit: 6 })

  const handleResourceClick = async (resourceId: string) => {
    await trackInteraction(resourceId, 'view', { source: 'recommendations' })
  }

  const handleDownload = async (resourceId: string, fileUrl?: string) => {
    if (!fileUrl) return

    await trackInteraction(resourceId, 'download', { source: 'recommendations' })
    window.open(fileUrl, '_blank')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Recommended for You
        </CardTitle>
        <CardDescription>
          Personalized content based on your interests and activity
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadRecommendations} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="text-center py-8">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">No recommendations yet</p>
            <p className="text-sm text-muted-foreground">
              Start interacting with resources to get personalized recommendations
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map((recommendation) => {
              const { resource, score, reasons } = recommendation
              const ResourceIcon = resourceTypeIcons[resource.resource_type] || FileText
              const primaryReason = reasons[0] as keyof typeof reasonLabels
              const ReasonIcon = reasonIcons[primaryReason] || Target

              return (
                <div
                  key={resource.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleResourceClick(resource.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <ResourceIcon className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm leading-tight mb-1 line-clamp-2">
                            {resource.title}
                          </h4>
                          
                          {resource.description && (
                            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                              {resource.description}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="text-xs">
                              {resource.department}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {resource.course}
                            </Badge>
                            {resource.difficulty_level && (
                              <Badge 
                                variant={
                                  resource.difficulty_level === 'beginner' ? 'default' :
                                  resource.difficulty_level === 'intermediate' ? 'secondary' : 'destructive'
                                }
                                className="text-xs"
                              >
                                {resource.difficulty_level}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <ReasonIcon className="h-3 w-3" />
                              <span>{reasonLabels[primaryReason]}</span>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <ThumbsUp className="h-3 w-3" />
                                <span>{resource.upvotes}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Download className="h-3 w-3" />
                                <span>{resource.downloads}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                <span>{resource.views}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(resource.created_at), { addSuffix: true })}
                          </div>
                          
                          {resource.file_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDownload(resource.id, resource.file_url)
                              }}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                          )}
                        </div>
                      </div>

                      {resource.tags && resource.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {resource.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
                              {tag}
                            </Badge>
                          ))}
                          {resource.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              +{resource.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            <div className="pt-2 border-t">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-xs"
                onClick={loadRecommendations}
              >
                Refresh Recommendations
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}