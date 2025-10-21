'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Trophy, Medal, Award, TrendingUp, Users, Calendar } from 'lucide-react'
import { useGamification } from '@/features/gamification/hooks'
import { LeaderboardScope } from '@/lib/services/gamification'

interface EnhancedLeaderboardProps {
  initialScope?: LeaderboardScope
  showFilters?: boolean
  compact?: boolean
}

export function EnhancedLeaderboard({ 
  initialScope = { type: 'global', timeframe: 'all_time' },
  showFilters = true,
  compact = false 
}: EnhancedLeaderboardProps) {
  const { leaderboard, userRank, loading, refreshLeaderboard } = useGamification()
  const [scope, setScope] = useState<LeaderboardScope>(initialScope)
  const [selectedDepartment, setSelectedDepartment] = useState<string>('')

  useEffect(() => {
    refreshLeaderboard(scope)
  }, [scope, refreshLeaderboard])

  const handleScopeChange = (newScope: Partial<LeaderboardScope>) => {
    setScope(prev => ({ ...prev, ...newScope }))
  }

  const getBadgeColor = (level: string) => {
    switch (level) {
      case 'Master': return 'bg-purple-500 text-white'
      case 'Expert': return 'bg-blue-500 text-white'
      case 'Advanced': return 'bg-green-500 text-white'
      case 'Intermediate': return 'bg-yellow-500 text-black'
      default: return 'bg-gray-500 text-white'
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="h-5 w-5 text-yellow-500" />
      case 2: return <Medal className="h-5 w-5 text-gray-400" />
      case 3: return <Award className="h-5 w-5 text-amber-600" />
      default: return <span className="text-sm font-medium text-gray-500">#{rank}</span>
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-24" />
                </div>
                <div className="h-6 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Leaderboard
          {userRank && (
            <Badge variant="outline" className="ml-auto">
              Your Rank: #{userRank}
            </Badge>
          )}
        </CardTitle>
        
        {showFilters && (
          <div className="flex flex-wrap gap-4 mt-4">
            <Tabs value={scope.type} onValueChange={(value) => handleScopeChange({ type: value as any })}>
              <TabsList>
                <TabsTrigger value="global" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Global
                </TabsTrigger>
                <TabsTrigger value="department" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Department
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Select value={scope.timeframe} onValueChange={(value) => handleScopeChange({ timeframe: value as any })}>
              <SelectTrigger className="w-40">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Today</SelectItem>
                <SelectItem value="weekly">This Week</SelectItem>
                <SelectItem value="monthly">This Month</SelectItem>
                <SelectItem value="all_time">All Time</SelectItem>
              </SelectContent>
            </Select>

            {scope.type === 'department' && (
              <Select value={selectedDepartment} onValueChange={(value) => {
                setSelectedDepartment(value)
                handleScopeChange({ department: value })
              }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Computer Science">Computer Science</SelectItem>
                  <SelectItem value="Mathematics">Mathematics</SelectItem>
                  <SelectItem value="Physics">Physics</SelectItem>
                  <SelectItem value="Chemistry">Chemistry</SelectItem>
                  <SelectItem value="Biology">Biology</SelectItem>
                  <SelectItem value="Engineering">Engineering</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {leaderboard.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No leaderboard data available</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.slice(0, compact ? 5 : 50).map((entry, index) => (
              <div
                key={entry.user_id}
                className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                  entry.rank <= 3 
                    ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200' 
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-center w-8">
                  {getRankIcon(entry.rank)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900 truncate">
                      {entry.full_name}
                    </h4>
                    <Badge className={getBadgeColor(entry.badge_level)}>
                      {entry.badge_level}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>{entry.department}</span>
                    <span>•</span>
                    <span>{entry.uploads_count} uploads</span>
                    <span>•</span>
                    <span>{entry.collections_count} collections</span>
                    {entry.recent_activity > 0 && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-green-600">
                          <TrendingUp className="h-3 w-3" />
                          {entry.recent_activity} pts this week
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-lg text-gray-900">
                    {entry.total_points.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">points</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!compact && leaderboard.length > 0 && (
          <div className="mt-6 text-center">
            <Button 
              variant="outline" 
              onClick={() => refreshLeaderboard(scope)}
              disabled={loading}
            >
              Refresh Leaderboard
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}