'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { 
  Trophy, 
  Star, 
  TrendingUp, 
  Calendar, 
  Target, 
  Award,
  Flame,
  Upload,
  FolderPlus
} from 'lucide-react'
import { useGamification } from '@/features/gamification/hooks'
import { Achievement } from '@/lib/services/gamification'

interface UserProgressCardProps {
  userId?: string
  showAchievements?: boolean
  compact?: boolean
}

export function UserProgressCard({ 
  userId, 
  showAchievements = true, 
  compact = false 
}: UserProgressCardProps) {
  const { userProgress, loading, refreshProgress } = useGamification()
  const [showAllAchievements, setShowAllAchievements] = useState(false)

  useEffect(() => {
    if (userId) {
      // In a real app, you'd fetch progress for the specific user
      refreshProgress()
    }
  }, [userId, refreshProgress])

  if (loading || !userProgress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-2 bg-gray-200 rounded" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const progressPercentage = userProgress.points_to_next_level > 0 
    ? ((userProgress.total_points % getPointsForLevel(userProgress.next_level)) / getPointsForLevel(userProgress.next_level)) * 100
    : 100

  function getPointsForLevel(level: string): number {
    const levelPoints = {
      'Freshman': 50,
      'Intermediate': 150,
      'Advanced': 300,
      'Expert': 500,
      'Master': 500
    }
    return levelPoints[level as keyof typeof levelPoints] || 500
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

  const getAchievementIcon = (achievement: Achievement) => {
    switch (achievement.category) {
      case 'upload': return <Upload className="h-4 w-4" />
      case 'curation': return <FolderPlus className="h-4 w-4" />
      case 'engagement': return <Star className="h-4 w-4" />
      case 'social': return <Trophy className="h-4 w-4" />
      case 'milestone': return <Award className="h-4 w-4" />
      default: return <Star className="h-4 w-4" />
    }
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'border-purple-500 bg-purple-50'
      case 'epic': return 'border-blue-500 bg-blue-50'
      case 'rare': return 'border-green-500 bg-green-50'
      default: return 'border-gray-300 bg-gray-50'
    }
  }

  return (
    <div className="space-y-4">
      {/* Main Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Your Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Level Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge className={getBadgeColor(userProgress.current_level)}>
                  {userProgress.current_level}
                </Badge>
                <span className="text-sm text-gray-600">
                  {userProgress.total_points.toLocaleString()} points
                </span>
              </div>
              {userProgress.next_level !== userProgress.current_level && (
                <div className="text-sm text-gray-500">
                  {userProgress.points_to_next_level} to {userProgress.next_level}
                </div>
              )}
            </div>
            
            {userProgress.next_level !== userProgress.current_level && (
              <Progress value={progressPercentage} className="h-2" />
            )}
          </div>

          {/* Weekly Progress */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="p-2 bg-blue-100 rounded-full">
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-blue-900">
                  {userProgress.weekly_progress.points_earned}
                </div>
                <div className="text-xs text-blue-600">Points this week</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <div className="p-2 bg-green-100 rounded-full">
                <Target className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <div className="font-medium text-green-900">
                  {userProgress.weekly_progress.actions_completed}
                </div>
                <div className="text-xs text-green-600">Actions completed</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
              <div className="p-2 bg-orange-100 rounded-full">
                <Flame className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <div className="font-medium text-orange-900">
                  {userProgress.weekly_progress.streak_days}
                </div>
                <div className="text-xs text-orange-600">Day streak</div>
              </div>
            </div>
          </div>

          {!compact && (
            <Button 
              variant="outline" 
              onClick={refreshProgress}
              disabled={loading}
              className="w-full"
            >
              Refresh Progress
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Achievements */}
      {showAchievements && userProgress.achievements_earned.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Achievements ({userProgress.achievements_earned.length})
              </div>
              {userProgress.achievements_earned.length > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllAchievements(!showAllAchievements)}
                >
                  {showAllAchievements ? 'Show Less' : 'Show All'}
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(showAllAchievements 
                ? userProgress.achievements_earned 
                : userProgress.achievements_earned.slice(0, 4)
              ).map((achievement) => (
                <div
                  key={achievement.id}
                  className={`p-3 rounded-lg border-2 ${getRarityColor(achievement.rarity)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{achievement.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">
                          {achievement.title}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {achievement.rarity}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">
                        {achievement.description}
                      </p>
                      <div className="flex items-center gap-2">
                        {getAchievementIcon(achievement)}
                        <span className="text-xs font-medium text-gray-700">
                          +{achievement.points} points
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Achievements */}
      {userProgress.recent_achievements.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Star className="h-5 w-5" />
              Recent Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {userProgress.recent_achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex items-center gap-3 p-2 bg-white rounded-lg border border-green-200"
                >
                  <div className="text-lg">{achievement.icon}</div>
                  <div className="flex-1">
                    <div className="font-medium text-sm text-green-900">
                      {achievement.title}
                    </div>
                    <div className="text-xs text-green-700">
                      +{achievement.points} points
                    </div>
                  </div>
                  <Badge className="bg-green-500 text-white text-xs">
                    New!
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}