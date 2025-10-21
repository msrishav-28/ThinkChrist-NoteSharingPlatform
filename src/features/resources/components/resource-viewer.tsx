'use client'

import { useState, useEffect } from 'react'
import { Resource } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Download, ThumbsUp, ThumbsDown, Eye, Share2, 
  Calendar, User, Clock, BarChart3, Tag, 
  ExternalLink, FileText, Play, Code, 
  Link as LinkIcon, Newspaper, CheckCircle,
  ArrowLeft, Bookmark, Flag
} from 'lucide-react'
import { formatBytes, formatDate, cn } from '@/lib/utils'
import { useToast } from '@/lib/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/features/auth'
import { ResourcePreview } from './previews'
import Link from 'next/link'

interface ResourceViewerProps {
  resource: Resource
  onBack?: () => void
  onVote?: () => void
  className?: string
}

export function ResourceViewer({ resource, onBack, onVote, className }: ResourceViewerProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [voting, setVoting] = useState(false)
  const [userVote, setUserVote] = useState(resource.user_vote)
  const [upvotes, setUpvotes] = useState(resource.upvotes)
  const [downvotes, setDownvotes] = useState(resource.downvotes)
  const [views, setViews] = useState(resource.views)
  const supabase = createClient()

  const getResourceIcon = (resourceType: string) => {
    switch (resourceType) {
      case 'video': return <Play className="h-5 w-5 text-red-500" />
      case 'link': return <LinkIcon className="h-5 w-5 text-blue-500" />
      case 'code': return <Code className="h-5 w-5 text-green-500" />
      case 'article': return <Newspaper className="h-5 w-5 text-purple-500" />
      default: return <FileText className="h-5 w-5 text-gray-500" />
    }
  }

  const getResourceTypeLabel = (resourceType: string) => {
    switch (resourceType) {
      case 'video': return 'Video'
      case 'link': return 'Link'
      case 'code': return 'Code Repository'
      case 'article': return 'Article'
      default: return 'Document'
    }
  }

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const handleVote = async (voteType: 'upvote' | 'downvote') => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to vote',
        variant: 'destructive',
      })
      return
    }

    setVoting(true)
    
    try {
      if (userVote === voteType) {
        await supabase.from('votes').delete().match({ user_id: user.id, resource_id: resource.id })
        setUserVote(null)
        if (voteType === 'upvote') setUpvotes(upvotes - 1)
        else setDownvotes(downvotes - 1)
      } else {
        await supabase.from('votes').upsert({
          user_id: user.id,
          resource_id: resource.id,
          vote_type: voteType,
        })
        
        if (userVote === 'upvote') {
          setUpvotes(upvotes - 1)
          setDownvotes(downvotes + 1)
        } else if (userVote === 'downvote') {
          setDownvotes(downvotes - 1)
          setUpvotes(upvotes + 1)
        } else {
          if (voteType === 'upvote') setUpvotes(upvotes + 1)
          else setDownvotes(downvotes + 1)
        }
        setUserVote(voteType)
      }
      
      if (onVote) onVote()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to vote. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setVoting(false)
    }
  }

  const handleDownload = async () => {
    const url = resource.external_url || resource.file_url
    if (url) window.open(url, '_blank')
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast({
        title: 'Link copied',
        description: 'Resource link copied to clipboard',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy link',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className={cn("max-w-4xl mx-auto space-y-6", className)}>
      {onBack && (
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to resources
        </Button>
      )}

      <Card>
        {(resource.link_preview || resource.external_url || resource.file_url) && (
          <div className="relative">
            <ResourcePreview
              preview={resource.link_preview}
              resource={resource}
              className="w-full h-64 md:h-80 object-cover rounded-t-lg"
              showMetadata={false}
              interactive={true}
            />
            <div className="absolute top-4 left-4">
              <Badge variant="secondary" className="flex items-center gap-2">
                {getResourceIcon(resource.resource_type)}
                {getResourceTypeLabel(resource.resource_type)}
              </Badge>
            </div>
          </div>
        )}

        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {resource.is_verified && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Verified
                  </Badge>
                )}
                {resource.difficulty_level && (
                  <Badge className={cn("text-xs", getDifficultyColor(resource.difficulty_level))}>
                    <BarChart3 className="h-3 w-3 mr-1" />
                    {resource.difficulty_level}
                  </Badge>
                )}
                {resource.estimated_time && (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {resource.estimated_time} min
                  </Badge>
                )}
              </div>
              
              <CardTitle className="text-2xl md:text-3xl leading-tight">
                {resource.title}
              </CardTitle>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{resource.uploader?.full_name || 'Anonymous'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(resource.created_at)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {resource.description && (
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground leading-relaxed">
                {resource.description}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3">Academic Details</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground w-20">Department:</span>
                  <Badge variant="outline">{resource.department}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground w-20">Subject:</span>
                  <Badge variant="outline">{resource.subject}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground w-20">Semester:</span>
                  <Badge variant="outline">Semester {resource.semester}</Badge>
                </div>
                {resource.topic && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-20">Topic:</span>
                    <Badge variant="outline">{resource.topic}</Badge>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Resource Stats</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Views</span>
                  <span className="font-medium">{views}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Downloads</span>
                  <span className="font-medium">{resource.downloads}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Rating</span>
                  <span className="font-medium">{upvotes - downvotes}</span>
                </div>
                {resource.file_size && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">File Size</span>
                    <span className="font-medium">{formatBytes(resource.file_size)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {resource.tags && resource.tags.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {resource.tags.map(tag => (
                  <Badge 
                    key={tag} 
                    variant="outline" 
                    className="hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-3">
              <Button
                variant={userVote === 'upvote' ? 'default' : 'outline'}
                onClick={() => handleVote('upvote')}
                disabled={voting}
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                {upvotes}
              </Button>
              <Button
                variant={userVote === 'downvote' ? 'default' : 'outline'}
                onClick={() => handleVote('downvote')}
                disabled={voting}
              >
                <ThumbsDown className="h-4 w-4 mr-2" />
                {downvotes}
              </Button>
            </div>
            
            <div className="flex items-center gap-3">
              {resource.external_url && (
                <Link href={resource.external_url} target="_blank">
                  <Button variant="outline">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Link
                  </Button>
                </Link>
              )}
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}