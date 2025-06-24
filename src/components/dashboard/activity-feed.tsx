'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Upload, Download, ThumbsUp, Award } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { formatDate } from '@/lib/utils'

interface Activity {
  id: string
  type: 'upload' | 'vote' | 'download' | 'badge'
  points_earned: number
  created_at: string
  resource?: {
    title: string
  }
}

export function ActivityFeed() {
  const { user } = useAuth()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchActivities() {
      if (!user) return

      try {
        const { data, error } = await supabase
          .from('contributions')
          .select(`
            *,
            resource:resources(title)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)

        if (!error && data) {
          setActivities(data as any)
        }
      } catch (error) {
        console.error('Error fetching activities:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchActivities()
  }, [user, supabase])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'upload':
        return Upload
      case 'download':
        return Download
      case 'vote':
        return ThumbsUp
      case 'badge':
        return Award
      default:
        return Upload
    }
  }

  const getActivityMessage = (activity: Activity) => {
    switch (activity.type) {
      case 'upload':
        return `Uploaded "${activity.resource?.title}"`
      case 'download':
        return `Downloaded a resource`
      case 'vote':
        return `Voted on "${activity.resource?.title}"`
      default:
        return 'Activity'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No recent activity</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => {
              const Icon = getActivityIcon(activity.type)
              return (
                <div
                  key={activity.id}
                  className="flex items-center gap-3 p-3 rounded-lg border"
                >
                  <div className="p-2 rounded-full bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{getActivityMessage(activity)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(activity.created_at)}
                    </p>
                  </div>
                  {activity.points_earned > 0 && (
                    <Badge variant="secondary">
                      +{activity.points_earned} pts
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}