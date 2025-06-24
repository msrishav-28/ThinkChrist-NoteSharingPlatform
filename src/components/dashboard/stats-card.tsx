'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, Download, ThumbsUp, Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'

export function StatsCards() {
  const { user, profile } = useAuth()
  const [stats, setStats] = useState({
    uploads: 0,
    downloads: 0,
    totalVotes: 0,
    rank: 0,
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchStats() {
      if (!user) return

      try {
        // Fetch user's uploads count
        const { count: uploadsCount } = await supabase
          .from('resources')
          .select('*', { count: 'exact', head: true })
          .eq('uploaded_by', user.id)

        // Fetch total downloads of user's resources
        const { data: userResources } = await supabase
          .from('resources')
          .select('downloads')
          .eq('uploaded_by', user.id)

        const totalDownloads = userResources?.reduce(
          (sum, resource) => sum + resource.downloads,
          0
        ) || 0

        // Fetch total upvotes received
        const { data: userResourceIds } = await supabase
          .from('resources')
          .select('id')
          .eq('uploaded_by', user.id)

        const resourceIds = userResourceIds?.map(r => r.id) || []
        
        const { count: totalVotesCount } = await supabase
          .from('votes')
          .select('*', { count: 'exact', head: true })
          .in('resource_id', resourceIds)
          .eq('vote_type', 'upvote')

        // Calculate rank
        const { data: allUsers } = await supabase
          .from('users')
          .select('id, points')
          .order('points', { ascending: false })

        const userRank = allUsers?.findIndex(u => u.id === user.id) ?? -1

        setStats({
          uploads: uploadsCount || 0,
          downloads: totalDownloads,
          totalVotes: totalVotesCount || 0,
          rank: userRank + 1,
        })
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [user, supabase])

  const statsData = [
    {
      title: 'Total Uploads',
      value: stats.uploads,
      icon: Upload,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Total Downloads',
      value: stats.downloads,
      icon: Download,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Upvotes Received',
      value: stats.totalVotes,
      icon: ThumbsUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Your Rank',
      value: stats.rank > 0 ? `#${stats.rank}` : '-',
      icon: Trophy,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statsData.map((stat, index) => {
        const Icon = stat.icon
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? (
                  <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                ) : (
                  stat.value
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}