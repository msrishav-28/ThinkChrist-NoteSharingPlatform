'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react'
import { LeaderboardEntry } from '@/types'
import { Skeleton } from '@/components/ui/skeleton'

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState('all')

  useEffect(() => {
    fetchLeaderboard()
  }, [timeframe])

  const fetchLeaderboard = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/leaderboard?timeframe=${timeframe}`)
      const data = await response.json()
      
      if (response.ok) {
        setLeaderboard(data.leaderboard)
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />
      case 3:
        return <Award className="h-5 w-5 text-orange-500" />
      default:
        return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>
    }
  }

  const getBadgeColor = (level: string) => {
    switch (level) {
      case 'Master':
        return 'bg-purple-500'
      case 'Expert':
        return 'bg-blue-500'
      case 'Advanced':
        return 'bg-green-500'
      case 'Intermediate':
        return 'bg-yellow-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Leaderboard</h1>
        <p className="text-muted-foreground">
          Top contributors in the Christ UniConnect community
        </p>
      </div>

      <Tabs value={timeframe} onValueChange={setTimeframe}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Time</TabsTrigger>
          <TabsTrigger value="semester">This Semester</TabsTrigger>
          <TabsTrigger value="month">This Month</TabsTrigger>
          <TabsTrigger value="week">This Week</TabsTrigger>
        </TabsList>

        <TabsContent value={timeframe} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Top Contributors
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-8 w-20" />
                    </div>
                  ))}
                </div>
              ) : leaderboard.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No data available for this timeframe
                </p>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((entry) => (
                    <div
                      key={entry.user_id}
                      className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
                        entry.rank <= 3 ? 'bg-muted/50' : 'hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center justify-center w-10">
                        {getRankIcon(entry.rank)}
                      </div>
                      
                      <div className="flex-1">
                        <p className="font-semibold">{entry.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {entry.department} • {entry.uploads_count} uploads
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Badge className={`${getBadgeColor(entry.badge_level)} text-white`}>
                          {entry.badge_level}
                        </Badge>
                        <div className="text-right">
                          <p className="font-bold text-lg">{entry.total_points}</p>
                          <p className="text-xs text-muted-foreground">points</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Achievements Section */}
      <Card>
        <CardHeader>
          <CardTitle>Your Achievements</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Achievements system coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}