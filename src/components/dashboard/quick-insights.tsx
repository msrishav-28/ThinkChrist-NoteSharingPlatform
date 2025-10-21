'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useDashboard } from '@/hooks/use-dashboard'
import { useAuth } from '@/features/auth'
import { 
  TrendingUp, 
  Target, 
  Calendar, 
  Award,
  Users,
  BookOpen,
  Zap
} from 'lucide-react'

interface InsightMetric {
  label: string
  value: number
  change: number
  trend: 'up' | 'down' | 'stable'
  icon: React.ComponentType<any>
}

export function QuickInsights() {
  const { profile } = useAuth()
  const { data: dashboardData } = useDashboard()
  const [insights, setInsights] = useState<InsightMetric[]>([])

  useEffect(() => {
    if (!dashboardData?.stats) return

    const stats = dashboardData.stats
    
    // Calculate insights based on dashboard data
    const weeklyGoal = 100 // points per week
    const progressToGoal = Math.min(100, (stats.points / weeklyGoal) * 100)
    
    const calculatedInsights: InsightMetric[] = [
      {
        label: 'Weekly Progress',
        value: progressToGoal,
        change: 12, // Mock change percentage
        trend: 'up',
        icon: Target
      },
      {
        label: 'Engagement Rate',
        value: stats.uploads > 0 ? Math.round((stats.upvotes / stats.uploads) * 100) : 0,
        change: 8,
        trend: 'up',
        icon: TrendingUp
      },
      {
        label: 'Community Impact',
        value: stats.downloads,
        change: -3,
        trend: 'down',
        icon: Users
      },
      {
        label: 'Learning Streak',
        value: 7, // Mock streak days
        change: 1,
        trend: 'up',
        icon: Zap
      }
    ]

    setInsights(calculatedInsights)
  }, [dashboardData])

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-600'
      case 'down': return 'text-red-600'
      default: return 'text-muted-foreground'
    }
  }

  const getTrendIcon = (trend: string) => {
    return trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Quick Insights
        </CardTitle>
        <CardDescription>
          Your learning progress and community impact
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {insights.map((insight, index) => {
            const Icon = insight.icon
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{insight.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">
                      {insight.label === 'Weekly Progress' ? `${Math.round(insight.value)}%` : insight.value}
                    </span>
                    <span className={`text-xs ${getTrendColor(insight.trend)}`}>
                      {getTrendIcon(insight.trend)} {Math.abs(insight.change)}%
                    </span>
                  </div>
                </div>
                
                {insight.label === 'Weekly Progress' && (
                  <Progress value={insight.value} className="h-2" />
                )}
              </div>
            )
          })}
        </div>

        {/* Achievement Progress */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Next Achievement</span>
            <Badge variant="outline" className="text-xs">
              {profile?.badge_level || 'Newcomer'}
            </Badge>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Upload 5 more resources</span>
              <span>3/5</span>
            </div>
            <Progress value={60} className="h-1" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}