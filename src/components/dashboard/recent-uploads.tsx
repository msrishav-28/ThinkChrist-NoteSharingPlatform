'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/features/auth'
import { Resource } from '@/types'
import { formatDate } from '@/lib/utils'

export function RecentUploads() {
  const { user } = useAuth()
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchRecentUploads() {
      if (!user) return

      try {
        const { data, error } = await supabase
          .from('resources')
          .select('*')
          .eq('uploaded_by', user.id)
          .order('created_at', { ascending: false })
          .limit(5)

        if (!error && data) {
          setResources(data)
        }
      } catch (error) {
        console.error('Error fetching recent uploads:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRecentUploads()
  }, [user, supabase])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Uploads</CardTitle>
        <Link href="/resources?filter=my-uploads">
          <Button variant="ghost" size="sm">
            View All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="mx-auto h-12 w-12 mb-3 opacity-50" />
            <p>No uploads yet</p>
            <Link href="/resources/upload">
              <Button variant="link" size="sm" className="mt-2">
                Upload your first resource
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {resources.map((resource) => (
              <div
                key={resource.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium line-clamp-1">{resource.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(resource.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {resource.downloads} downloads
                  </Badge>
                  <Link href={`/resources/${resource.id}`}>
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}