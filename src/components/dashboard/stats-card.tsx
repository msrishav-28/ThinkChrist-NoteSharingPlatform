'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, Download, ThumbsUp, Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/features/auth'

export function StatsCard() {
  const { user, profile } = useAuth()
  const [stats, setStats] = useState({
    uploads: 0,
    downloads: 0,
    upvotes: 0,
    points: 0
  })
  const supabase = createClient()

  useEffect(() => {
    if (!user) return

    const fetchStats = async () => {
      try {
        // Get upload count
        const { count: uploads } = await supabase
          .from('resources')
          .select('*', { count: 'exact', head: true })
          .eq('uploaded_by', user.id)

        // Get total downloads of user's resources
        const { data: resources } = await supabase
          .from('resources')
          .select('downloads')
          .eq('uploaded_by', user.id)

        const totalDownloads = resources?.reduce((sum, r) => sum + r.downloads, 0) || 0

        // Get total upvotes of user's resources
        const { data: upvoteData } = await supabase
          .from('resources')
          .select('upvotes')
          .eq('uploaded_by', user.id)

        const totalUpvotes = upvoteData?.reduce((sum, r) => sum + r.upvotes, 0) || 0

        setStats({
          uploads: uploads || 0,
          downloads: totalDownloads,
          upvotes: totalUpvotes,
          points: profile?.points || 0
        })
      } catch (error) {
        console.error('Error fetching stats:', error)
      }
    }

    fetchStats()
  }, [user, profile, supabase])

  const statCards = [
    {
      title: 'Uploads',
      value: stats.uploads,
      icon: Upload,
      description: 'Resources shared'
    },
    {
      title: 'Downloads',
      value: stats.downloads,
      icon: Download,
      description: 'Total downloads'
    },
    {
      title: 'Upvotes',
      value: stats.upvotes,
      icon: ThumbsUp,
      description: 'Community appreciation'
    },
    {
      title: 'Points',
      value: stats.points,
      icon: Trophy,
      description: 'Total points earned'
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}