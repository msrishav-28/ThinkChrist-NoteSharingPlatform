'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Award, 
  Target,
  Calendar,
  Trophy,
  Star,
  Activity,
  PieChart,
  LineChart
} from 'lucide-react'
import { GamificationAnalytics } from '@/lib/services/gamification-analytics'

interface GamificationAnalyticsProps {
  showUserMetrics?: boolean
  showSystemMetrics?: boolean
  compact?: boolean
}

export function GamificationAnalyticsComponent({
  showUserMetrics = true,
  showSystemMetrics = true,
  compact = false
}: GamificationAnalyticsProps) {
  const [analytics, setAnalytics] = useState<GamificationAnalytics | null>(null)
  const [trends, setTrends] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [timeframe, setTimeframe] = useState('all_time')
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchAnalytics()
  }, [timeframe])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      
      const [analyticsRes, trendsRes] = await Promise.all([
        fetch(`/api/gamification/analytics?type=overview&timeframe=${timeframe}`),
        fetch('/api/gamification/analytics?type=trends&days=30')
      ])

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json()
        setAnalytics(analyticsData.analytics)
      }

      if (trendsRes.ok) {
        const trendsData = await trendsRes.json()
        setTrends(trendsData.trends)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !analytics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Gamification Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const getEngagementMetrics = () => {
    if (!analytics) return []

    return [
      {
        label: 'Total Active Users',
        value: analytics.user_engagement.total_active_users,
        icon: <Users className="h-4 w-4" />,
        color: 'text-blue-600 bg-blue-50'
      },
      {
        label: 'Weekly Active',
        value: analytics.user_engagement.weekly_active_users,
        icon: <Activity className="h-4 w-4" />,
        color: 'text-green-600 bg-green-50'
      },
      {
        label: 'Total Points Awarded',
        value: analytics.points_distribution.total_points_awarded.toLocaleString(),
        icon: <Star className="h-4 w-4" />,
        color: 'text-yellow-600 bg-yellow-50'
      },
      {
        label: 'Achievements Earned',
        value: analytics.achievement_stats.total_achievements_awarded,
        icon: <Award className="h-4 w-4" />,
        color: 'text-purple-600 bg-purple-50'
      }
    ]
  }

  const engagementMetrics = getEngagementMetrics()

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Gamification Analytics
        </h2>
        
        <div className="flex items-center gap-4">
          <Select value={timeframe} onValueChange={setTimeframe}>
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
          
          <Button onClick={fetchAnalytics} disabled={loading} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {engagementMetrics.map((metric, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${metric.color}`}>
                    {metric.icon}
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {metric.value}
                    </div>
                    <div className="text-sm text-gray-600">
                      {metric.label}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detailed Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Achievements
          </TabsTrigger>
          <TabsTrigger value="points" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Points
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <LineChart className="h-4 w-4" />
            Trends
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {analytics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Level Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Level Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(analytics.leaderboard_stats.level_distribution).map(([level, count]) => (
                      <div key={level} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{level}</Badge>
                          <span className="text-sm text-gray-600">{count} users</span>
                        </div>
                        <Progress 
                          value={(count / analytics.user_engagement.total_active_users) * 100} 
                          className="w-24 h-2" 
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Department Rankings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Department Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.leaderboard_stats.department_rankings.slice(0, 5).map((dept, index) => (
                      <div key={dept.department} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                        <div>
                          <div className="font-medium text-sm">{dept.department}</div>
                          <div className="text-xs text-gray-600">
                            {dept.total_users} users • Top: {dept.top_user}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm">{Math.round(dept.average_points)}</div>
                          <div className="text-xs text-gray-500">avg points</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-4">
          {analytics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Popular Achievements */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Popular Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.achievement_stats.popular_achievements.slice(0, 8).map((achievement, index) => (
                      <div key={achievement.achievement_id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">#{index + 1}</span>
                          <div>
                            <div className="font-medium text-sm">{achievement.title}</div>
                            <div className="text-xs text-gray-600">
                              {achievement.completion_count} completions
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm text-green-600">
                            {achievement.completion_rate.toFixed(1)}%
                          </div>
                          <div className="text-xs text-gray-500">completion rate</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Achievements */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Recent Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.achievement_stats.recent_achievements.slice(0, 8).map((achievement, index) => (
                      <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-green-50">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <div className="flex-1">
                          <div className="font-medium text-sm">{achievement.title}</div>
                          <div className="text-xs text-gray-600">
                            {achievement.user_name} • {new Date(achievement.earned_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Points Tab */}
        <TabsContent value="points" className="space-y-4">
          {analytics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Points by Action Type */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Points by Action Type
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(analytics.points_distribution.points_by_action_type).map(([action, points]) => (
                      <div key={action} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">{action}</Badge>
                        </div>
                        <div className="font-bold text-sm">
                          {points.toLocaleString()} pts
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Point Earners */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Top Point Earners
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.points_distribution.top_point_earners.slice(0, 8).map((user, index) => (
                      <div key={user.user_id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">#{index + 1}</span>
                          <div>
                            <div className="font-medium text-sm">{user.user_name}</div>
                            <div className="text-xs text-gray-600">
                              +{user.weekly_points} this week
                            </div>
                          </div>
                        </div>
                        <div className="font-bold text-sm">
                          {user.total_points.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Activity Trends (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trends.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {trends.reduce((sum, day) => sum + day.active_users, 0)}
                      </div>
                      <div className="text-sm text-blue-700">Total Active Users</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {trends.reduce((sum, day) => sum + day.points_awarded, 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-green-700">Points Awarded</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {trends.reduce((sum, day) => sum + day.achievements_earned, 0)}
                      </div>
                      <div className="text-sm text-purple-700">Achievements Earned</div>
                    </div>
                  </div>
                  
                  {/* Simple trend visualization */}
                  <div className="mt-6">
                    <h4 className="font-medium mb-3">Daily Activity</h4>
                    <div className="space-y-2">
                      {trends.slice(-7).map((day, index) => (
                        <div key={day.date} className="flex items-center gap-4">
                          <div className="w-20 text-xs text-gray-600">
                            {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </div>
                          <div className="flex-1">
                            <Progress 
                              value={(day.active_users / Math.max(...trends.map(t => t.active_users))) * 100} 
                              className="h-2" 
                            />
                          </div>
                          <div className="w-16 text-xs text-gray-600 text-right">
                            {day.active_users} users
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <LineChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No trend data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}