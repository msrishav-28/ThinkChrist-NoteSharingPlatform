'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Trophy, Medal, Award, TrendingUp, Crown, Star } from 'lucide-react'
import { LeaderboardEntry } from '@/types'
import { Skeleton } from '@/components/ui/skeleton'
import { config } from '@/shared/config'
import { cn } from '@/lib/utils'

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState('all')

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/gamification/leaderboard?timeframe=${timeframe}`)
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

    fetchLeaderboard()
  }, [timeframe])

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-400 fill-yellow-400/20" />
      case 2:
        return <Medal className="h-6 w-6 text-zinc-400 fill-zinc-400/20" />
      case 3:
        return <Medal className="h-6 w-6 text-orange-400 fill-orange-400/20" />
      default:
        return <span className="text-lg font-bold font-heading text-muted-foreground">#{rank}</span>
    }
  }

  const getBadgeColor = (level: string) => {
    switch (level) {
      case 'Master':
        return 'bg-gradient-to-r from-purple-500 to-indigo-600 border-none'
      case 'Expert':
        return 'bg-gradient-to-r from-blue-500 to-cyan-500 border-none'
      case 'Advanced':
        return 'bg-gradient-to-r from-emerald-500 to-teal-500 border-none'
      case 'Intermediate':
        return 'bg-gradient-to-r from-yellow-500 to-orange-500 border-none'
      default:
        return 'bg-zinc-500'
    }
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold font-heading bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
            Leaderboard
          </h1>
          <p className="text-xl text-muted-foreground mt-2">
            Top contributors in the <span className="text-foreground font-semibold">{config.branding.organizationName}</span> community.
          </p>
        </div>
        <div className="p-3 bg-primary/5 rounded-2xl glass border border-primary/10">
          <Trophy className="w-8 h-8 text-primary" />
        </div>
      </div>

      <Tabs value={timeframe} onValueChange={setTimeframe} className="space-y-8">
        <TabsList className="grid w-full grid-cols-4 p-1 bg-muted/50 rounded-full h-14">
          <TabsTrigger value="all" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-lg h-12 transition-all">All Time</TabsTrigger>
          <TabsTrigger value="semester" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-lg h-12 transition-all">This Semester</TabsTrigger>
          <TabsTrigger value="month" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-lg h-12 transition-all">This Month</TabsTrigger>
          <TabsTrigger value="week" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-lg h-12 transition-all">This Week</TabsTrigger>
        </TabsList>

        <TabsContent value={timeframe} className="mt-6 space-y-8">
          {/* Top 3 Podium (Visual only, derived from list if available, otherwise simplified representation in list) */}
          {/* Main List */}
          <div className="glass rounded-3xl border border-white/20 dark:border-white/10 overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-500 delay-150">
            <div className="p-6 md:p-8 flex items-center justify-between border-b border-border/50 bg-white/50 dark:bg-black/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-bold font-heading">Top Contributors</h2>
              </div>
            </div>

            <div className="p-2 md:p-6">
              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 animate-pulse">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <Skeleton className="h-8 w-16" />
                    </div>
                  ))}
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="text-center py-20 flex flex-col items-center gap-4 text-muted-foreground">
                  <div className="p-4 bg-muted rounded-full">
                    <Star className="w-8 h-8 opacity-20" />
                  </div>
                  <p>No data available for this timeframe yet. Be the first!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {leaderboard.map((entry, index) => (
                    <div
                      key={entry.user_id}
                      style={{ animationDelay: `${index * 100}ms` }}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group hover:scale-[1.01]",
                        entry.rank <= 3 ? 'bg-primary/5 hover:bg-primary/10 border border-primary/10' : 'hover:bg-muted/50 border border-transparent hover:border-border/50',
                        "animate-in slide-in-from-bottom-4 fade-in fill-mode-backwards"
                      )}
                    >
                      <div className="flex items-center justify-center w-12 h-12 rounded-full glass bg-background/50 shadow-sm font-heading font-bold text-xl">
                        {getRankIcon(entry.rank)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-lg truncate font-heading group-hover:text-primary transition-colors">{entry.full_name}</p>
                          {entry.rank <= 3 && <SparkleIcon className="text-yellow-400 w-4 h-4 animate-pulse" />}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {entry.department} • <span className="font-medium text-foreground">{entry.uploads_count}</span> uploads
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <Badge className={`${getBadgeColor(entry.badge_level)} text-white shadow-md`}>
                          {entry.badge_level}
                        </Badge>
                        <div className="text-right">
                          <span className="font-bold text-xl font-heading text-primary">{entry.total_points}</span>
                          <span className="text-xs text-muted-foreground ml-1">pts</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M9.315 7.584C12.195 3.883 16.695 1.5 21.75 1.5a.75.75 0 01.75.75c0 5.056-2.383 9.555-6.084 12.436-1.118-2.607-3.085-4.574-5.692-5.692.748-2.14 1.84-4.22 3.193-6.195a.75.75 0 00-.59-1.215zm-.76 7.632A15.01 15.01 0 005.25 10.51c-2.302 2.651-3.75 6.095-3.75 9.873a.75.75 0 00.75.75c3.778 0 7.222-1.448 9.873-3.75a13.974 13.974 0 01-4.708-2.169zm7.04-1.246a.75.75 0 00.915-.054c2.81-2.457 4.706-5.88 5.438-9.613a16.03 16.03 0 01-2.91 2.91c-2.69 1.944-5.918 3.198-9.394 3.486a.75.75 0 00.276 1.488c2.095-.164 4.07-.66 5.675-1.127z" clipRule="evenodd" />
    </svg>
  )
}