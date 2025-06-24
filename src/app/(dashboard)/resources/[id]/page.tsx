'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Download, ThumbsUp, ThumbsDown, Calendar, 
  User, FileIcon, ArrowLeft, Flag 
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Resource } from '@/types'
import { formatBytes, formatDate } from '@/lib/utils'
import { useToast } from '@/lib/hooks/use-toast'
import { useAuth } from '@/lib/hooks/use-auth'

export default function ResourceViewPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [resource, setResource] = useState<Resource | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchResource()
  }, [params.id])

  const fetchResource = async () => {
    try {
      const { data, error } = await supabase
        .from('resources')
        .select(`
          *,
          uploader:users!uploaded_by(id, full_name, department)
        `)
        .eq('id', params.id)
        .single()

      if (error) throw error
      
      // Get user vote if logged in
      if (user) {
        const { data: vote } = await supabase
          .from('votes')
          .select('vote_type')
          .match({ user_id: user.id, resource_id: params.id })
          .single()
        
        if (vote) {
          data.user_vote = vote.vote_type
        }
      }
      
      setResource(data)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load resource',
        variant: 'destructive',
      })
      router.push('/resources')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!resource) return

    // Track download
    if (user) {
      await supabase
        .from('contributions')
        .insert({
          user_id: user.id,
          type: 'download',
          resource_id: resource.id,
          points_earned: 0,
        })
    }

    // Increment download count
    await supabase
      .from('resources')
      .update({ downloads: resource.downloads + 1 })
      .eq('id', resource.id)

    // Open file
    window.open(resource.file_url, '_blank')
    
    // Update local state
    setResource({ ...resource, downloads: resource.downloads + 1 })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" disabled>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Resources
        </Button>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!resource) return null

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Button 
        variant="ghost" 
        onClick={() => router.back()}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Resources
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{resource.title}</CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {resource.uploader?.full_name || 'Anonymous'}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(resource.created_at)}
                </span>
                <span className="flex items-center gap-1">
                  <FileIcon className="h-4 w-4" />
                  {formatBytes(resource.file_size)}
                </span>
              </div>
            </div>
            {resource.is_verified && (
              <Badge variant="secondary" className="ml-2">
                Verified
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {resource.description && (
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground">{resource.description}</p>
            </div>
          )}

          <div>
            <h3 className="font-semibold mb-2">Details</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Department</span>
                <span className="font-medium">{resource.department}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Course</span>
                <span className="font-medium">{resource.course}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Semester</span>
                <span className="font-medium">Semester {resource.semester}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Subject</span>
                <span className="font-medium">{resource.subject}</span>
              </div>
              {resource.topic && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Topic</span>
                  <span className="font-medium">{resource.topic}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">File Type</span>
                <span className="font-medium uppercase">
                  {resource.file_type.split('/').pop() || 'Unknown'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant={resource.user_vote === 'upvote' ? 'default' : 'outline'}
                size="sm"
                className="flex-1 sm:flex-initial"
              >
                <ThumbsUp className="h-4 w-4 mr-1" />
                {resource.upvotes} Upvotes
              </Button>
              <Button
                variant={resource.user_vote === 'downvote' ? 'default' : 'outline'}
                size="sm"
                className="flex-1 sm:flex-initial"
              >
                <ThumbsDown className="h-4 w-4 mr-1" />
                {resource.downvotes} Downvotes
              </Button>
            </div>
            
            <div className="flex items-center gap-2 sm:ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast({
                  title: 'Feature coming soon',
                  description: 'Report functionality will be available soon',
                })}
              >
                <Flag className="h-4 w-4 mr-1" />
                Report
              </Button>
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1" />
                Download ({resource.downloads})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Related Resources Section - Coming Soon */}
      <Card>
        <CardHeader>
          <CardTitle>Related Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Related resources feature coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}