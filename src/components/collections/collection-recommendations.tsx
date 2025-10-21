'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Lightbulb, TrendingUp, Users, Sparkles, 
  ExternalLink, RefreshCw, Eye, ArrowRight,
  FolderOpen, Clock, User, Folder
} from 'lucide-react'
import { useToast } from '@/lib/hooks/use-toast'
import { useAuth } from '@/features/auth'
import { collectionTemplatesService } from '@/lib/services/collection-templates-service'
import type { CollectionRecommendation } from '@/lib/services/collection-templates-service'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface CollectionRecommendationsProps {
  onRecommendationSelect?: (recommendation: CollectionRecommendation) => void
  className?: string
  maxRecommendations?: number
}

export function CollectionRecommendations({ 
  onRecommendationSelect, 
  className,
  maxRecommendations = 6
}: CollectionRecommendationsProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [recommendations, setRecommendations] = useState<CollectionRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadRecommendations = async () => {
    if (!user) return

    try {
      const recs = await collectionTemplatesService.getCollectionRecommendations(
        user.id, 
        maxRecommendations
      )
      setRecommendations(recs)
    } catch (error) {
      console.error('Error loading recommendations:', error)
      toast({
        title: 'Error',
        description: 'Failed to load recommendations',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadRecommendations()
  }, [user?.id])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadRecommendations()
  }

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'Folder':
        return <Folder className="h-4 w-4 text-blue-600" />
      case 'similar_collection':
        return <FolderOpen className="h-4 w-4 text-green-600" />
      case 'trending':
        return <TrendingUp className="h-4 w-4 text-orange-600" />
      case 'personalized':
        return <Sparkles className="h-4 w-4 text-purple-600" />
      default:
        return <Lightbulb className="h-4 w-4 text-gray-600" />
    }
  }

  const getRecommendationTypeLabel = (type: string) => {
    switch (type) {
      case 'Folder':
        return 'Template'
      case 'similar_collection':
        return 'Similar Collection'
      case 'trending':
        return 'Trending'
      case 'personalized':
        return 'For You'
      default:
        return 'Recommendation'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-blue-600'
    if (confidence >= 0.4) return 'text-orange-600'
    return 'text-gray-600'
  }

  if (!user) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Lightbulb className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to see personalized recommendations
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="mt-2 text-sm text-muted-foreground">Loading recommendations...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (recommendations.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Recommendations
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Lightbulb className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              No recommendations available right now
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Try creating some collections or interacting with resources to get personalized suggestions
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Recommendations for You
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {recommendations.map((recommendation) => (
          <RecommendationCard
            key={recommendation.id}
            recommendation={recommendation}
            onSelect={() => onRecommendationSelect?.(recommendation)}
          />
        ))}
      </CardContent>
    </Card>
  )
}

interface RecommendationCardProps {
  recommendation: CollectionRecommendation
  onSelect?: () => void
}

function RecommendationCard({ recommendation, onSelect }: RecommendationCardProps) {
  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'Folder':
        return <Folder className="h-4 w-4 text-blue-600" />
      case 'similar_collection':
        return <FolderOpen className="h-4 w-4 text-green-600" />
      case 'trending':
        return <TrendingUp className="h-4 w-4 text-orange-600" />
      case 'personalized':
        return <Sparkles className="h-4 w-4 text-purple-600" />
      default:
        return <Lightbulb className="h-4 w-4 text-gray-600" />
    }
  }

  const getRecommendationTypeLabel = (type: string) => {
    switch (type) {
      case 'Folder':
        return 'Template'
      case 'similar_collection':
        return 'Similar Collection'
      case 'trending':
        return 'Trending'
      case 'personalized':
        return 'For You'
      default:
        return 'Recommendation'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-blue-600'
    if (confidence >= 0.4) return 'text-orange-600'
    return 'text-gray-600'
  }

  const handleAction = () => {
    if (recommendation.type === 'template') {
      // Handle template selection
      onSelect?.()
    } else if (recommendation.type === 'similar_collection' || recommendation.type === 'trending') {
      // Navigate to collection
      const collectionId = recommendation.data.collection_id
      if (collectionId) {
        window.open(`/collections/${collectionId}`, '_blank')
      }
    } else {
      onSelect?.()
    }
  }

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {getRecommendationIcon(recommendation.type)}
          <Badge variant="outline" className="text-xs">
            {getRecommendationTypeLabel(recommendation.type)}
          </Badge>
          <div className={cn(
            "text-xs font-medium",
            getConfidenceColor(recommendation.confidence)
          )}>
            {Math.round(recommendation.confidence * 100)}% match
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          <Clock className="inline h-3 w-3 mr-1" />
          {formatDistanceToNow(new Date(recommendation.created_at), { addSuffix: true })}
        </div>
      </div>
      
      <h4 className="font-medium mb-1">{recommendation.title}</h4>
      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
        {recommendation.description}
      </p>
      
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground italic">
          {recommendation.reason}
        </p>
        
        <Button size="sm" variant="outline" onClick={handleAction}>
          {recommendation.type === 'template' ? (
            <>
              <Folder className="mr-2 h-4 w-4" />
              Use Template
            </>
          ) : (
            <>
              <Eye className="mr-2 h-4 w-4" />
              View Collection
            </>
          )}
        </Button>
      </div>
      
      {/* Additional data display */}
      {recommendation.data.Folder && (
        <div className="mt-3 pt-3 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{recommendation.data.Folder.structure.sections.length} sections</span>
            <span>•</span>
            <span>{recommendation.data.Folder.usage_count} uses</span>
            <span>•</span>
            <span>{recommendation.data.Folder.category}</span>
          </div>
        </div>
      )}
      
      {recommendation.data.collection && (
        <div className="mt-3 pt-3 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>by {recommendation.data.collection.creator?.full_name || 'Anonymous'}</span>
            {recommendation.data.collection.resources?.[0]?.count && (
              <>
                <span>•</span>
                <span>{recommendation.data.collection.resources[0].count} resources</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Compact version for sidebars or smaller spaces
export function CollectionRecommendationsCompact({ 
  className,
  maxRecommendations = 3
}: {
  className?: string
  maxRecommendations?: number
}) {
  const { user } = useAuth()
  const [recommendations, setRecommendations] = useState<CollectionRecommendation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const loadRecommendations = async () => {
      try {
        const recs = await collectionTemplatesService.getCollectionRecommendations(
          user.id, 
          maxRecommendations
        )
        setRecommendations(recs)
      } catch (error) {
        console.error('Error loading recommendations:', error)
      } finally {
        setLoading(false)
      }
    }

    loadRecommendations()
  }, [user?.id, maxRecommendations])

  if (!user || loading || recommendations.length === 0) {
    return null
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-4 w-4" />
          Quick Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {recommendations.slice(0, maxRecommendations).map((recommendation) => (
          <div key={recommendation.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer">
            <div className="flex-shrink-0">
              {recommendation.type === 'template' ? (
                <Folder className="h-4 w-4 text-blue-600" />
              ) : (
                <FolderOpen className="h-4 w-4 text-green-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{recommendation.title}</p>
              <p className="text-xs text-muted-foreground truncate">{recommendation.reason}</p>
            </div>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
