'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Trophy, 
  Target, 
  TrendingUp, 
  Users, 
  Award,
  BarChart3,
  Calendar,
  Star
} from 'lucide-react'
import { EnhancedLeaderboard } from './enhanced-leaderboard'
import { UserProgressCard } from './user-progress-card'
import { useGamification } from '@/features/gamification/hooks'

interface GamificationDashboardProps {
  showUserProgress?: boolean
  showLeaderboard?: boolean
  showAnalytics?: boolean
  defaultTab?: string
}

export function GamificationDashboard({
  showUserProgress = true,
  showLeaderboard = true,
  showAnalytics = true,
  defaultTab = 'progress'
}: GamificationDashboardProps) {
  const { userProgress, leaderboard, userRank, loading } = useGamification()
  const [activeTab, setActiveTab] = useState(defaultTab)

  const getQuickStats = () => {
    if (!userProgress) return []

    return [
      {
        label: 'Total Points',
        value: userProgress.total_points.toLocaleString(),
        icon: <Star className="h-4 w-4" />,
        color: 'text-yellow-600 bg-yellow-50'
      },
      {
        label: 'Current Level',
        value: userProgress.current_level,
        icon: <Trophy className="h-4 w-4" />,
        color: 'text-blue-600 bg-blue-50'
      },
      {
        label: 'Achievements',
        value: userProgress.achievements_earned.length.toString(),
        icon: <Award className="h-4 w-4" />,
        color: 'text-purple-600 bg-purple-50'
      },
      {
        label: 'Weekly Points',
        value: userProgress.weekly_progress.points_earned.toString(),
        icon: <TrendingUp className="h-4 w-4" />,
        color: 'text-green-600 bg-green-50'
      }
    ]
  }

  const quickStats = getQuickStats()

  return (
    <div className="space-y-6">
      {/* Quick Stats Overview */}
      {userProgress && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickStats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${stat.color}`}>
                    {stat.icon}
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {stat.value}
                    </div>
                    <div className="text-sm text-gray-600">
                      {stat.label}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          {showUserProgress && (
            <TabsTrigger value="progress" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Progress
            </TabsTrigger>
          )}
          {showLeaderboard && (
            <TabsTrigger value="leaderboard" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Leaderboard
            </TabsTrigger>
          )}
          {showAnalytics && (
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          )}
        </TabsList>

        {showUserProgress && (
          <TabsContent value="progress" className="space-y-4">
            <UserProgressCard showAchievements={true} />
          </TabsContent>
        )}

        {showLeaderboard && (
          <TabsContent value="leaderboard" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <EnhancedLeaderboard showFilters={true} />
              </div>
              <div className="space-y-4">
                {/* User Rank Card */}
                {userRank && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Your Ranking
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600 mb-2">
                          #{userRank}
                        </div>
                        <div className="text-sm text-gray-600 mb-4">
                          out of {leaderboard.length} users
                        </div>
                        {userProgress && (
                          <Badge className="bg-blue-500 text-white">
                            {userProgress.current_level}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Top Performers */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5" />
                      Top 3
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {leaderboard.slice(0, 3).map((entry, index) => (
                        <div key={entry.user_id} className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold text-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {entry.full_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {entry.total_points.toLocaleString()} pts
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        )}

        {showAnalytics && (
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Weekly Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Weekly Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {userProgress ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Points Earned</span>
                        <span className="font-medium">
                          {userProgress.weekly_progress.points_earned}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Actions Completed</span>
                        <span className="font-medium">
                          {userProgress.weekly_progress.actions_completed}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Active Days</span>
                        <span className="font-medium">
                          {userProgress.weekly_progress.streak_days}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      No activity data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Achievement Progress */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Achievement Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {userProgress ? (
                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600 mb-2">
                          {userProgress.achievements_earned.length}
                        </div>
                        <div className="text-sm text-gray-600">
                          Achievements Unlocked
                        </div>
                      </div>
                      
                      {userProgress.recent_achievements.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Recent Unlocks</h4>
                          <div className="space-y-2">
                            {userProgress.recent_achievements.slice(0, 3).map((achievement) => (
                              <div key={achievement.id} className="flex items-center gap-2 text-sm">
                                <span>{achievement.icon}</span>
                                <span className="truncate">{achievement.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      No achievement data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}