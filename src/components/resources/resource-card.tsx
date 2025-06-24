'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, Download, ThumbsUp, ThumbsDown, 
  Calendar, User, FileIcon, Eye 
} from 'lucide-react'
import { Resource } from '@/types'
import { formatBytes, formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'

interface ResourceCardProps {
  resource: Resource
  onVote?: () => void
}

export function ResourceCard({ resource, onVote }: ResourceCardProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [voting, setVoting] = useState(false)
  const [userVote, setUserVote] = useState(resource.user_vote)
  const [upvotes, setUpvotes] = useState(resource.upvotes)
  const [downvotes, setDownvotes] = useState(resource.downvotes)
  const supabase = createClient()

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('image')) return '🖼️'
    if (fileType.includes('video')) return '🎥'
    if (fileType.includes('audio')) return '🎵'
    if (fileType.includes('zip') || fileType.includes('rar')) return '📦'
    return '📎'
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
      // If user already voted the same way, remove the vote
      if (userVote === voteType) {
        const { error } = await supabase
          .from('votes')
          .delete()
          .match({ user_id: user.id, resource_id: resource.id })

        if (!error) {
          setUserVote(null)
          if (voteType === 'upvote') {
            setUpvotes(upvotes - 1)
          } else {
            setDownvotes(downvotes - 1)
          }
        }
      } else {
        // Insert or update vote
        const { error } = await supabase
          .from('votes')
          .upsert({
            user_id: user.id,
            resource_id: resource.id,
            vote_type: voteType,
          })

        if (!error) {
          // Update counts
          if (userVote === 'upvote') {
            setUpvotes(upvotes - 1)
            setDownvotes(downvotes + 1)
          } else if (userVote === 'downvote') {
            setDownvotes(downvotes - 1)
            setUpvotes(upvotes + 1)
          } else {
            if (voteType === 'upvote') {
              setUpvotes(upvotes + 1)
            } else {
              setDownvotes(downvotes + 1)
            }
          }
          setUserVote(voteType)
        }
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
    // Track download
    await supabase
      .from('contributions')
      .insert({
        user_id: user?.id,
        type: 'download',
        resource_id: resource.id,
        points_earned: 0,
      })

    // Increment download count
    await supabase
      .from('resources')
      .update({ downloads: resource.downloads + 1 })
      .eq('id', resource.id)

    // Open file in new tab
    window.open(resource.file_url, '_blank')
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-lg line-clamp-2">
              {getFileIcon(resource.file_type)} {resource.title}
            </h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-3 w-3" />
              <span>{resource.uploader?.full_name || 'Anonymous'}</span>
              <span>•</span>
              <Calendar className="h-3 w-3" />
              <span>{formatDate(resource.created_at)}</span>
            </div>
          </div>
          {resource.is_verified && (
            <Badge variant="secondary" className="ml-2">
              Verified
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {resource.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {resource.description}
          </p>
        )}
        
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{resource.department}</Badge>
          <Badge variant="outline">{resource.subject}</Badge>
          <Badge variant="outline">Sem {resource.semester}</Badge>
          {resource.topic && <Badge variant="outline">{resource.topic}</Badge>}
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileIcon className="h-4 w-4" />
            {formatBytes(resource.file_size)}
          </span>
          <span className="flex items-center gap-1">
            <Download className="h-4 w-4" />
            {resource.downloads} downloads
          </span>
        </div>
      </CardContent>
      
      <CardFooter className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={userVote === 'upvote' ? 'default' : 'outline'}
            onClick={() => handleVote('upvote')}
            disabled={voting}
          >
            <ThumbsUp className="h-4 w-4 mr-1" />
            {upvotes}
          </Button>
          <Button
            size="sm"
            variant={userVote === 'downvote' ? 'default' : 'outline'}
            onClick={() => handleVote('downvote')}
            disabled={voting}
          >
            <ThumbsDown className="h-4 w-4 mr-1" />
            {downvotes}
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Link href={`/resources/${resource.id}`}>
            <Button size="sm" variant="ghost">
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
          </Link>
          <Button size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}