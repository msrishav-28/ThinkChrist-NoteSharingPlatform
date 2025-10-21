'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, Trophy, Star, Sparkles } from 'lucide-react'
import { Achievement } from '@/lib/services/gamification'
import { useAchievementNotifications } from '@/features/gamification/hooks'

interface AchievementNotificationProps {
  achievement: Achievement
  onDismiss: () => void
  autoHide?: boolean
  duration?: number
}

export function AchievementNotification({ 
  achievement, 
  onDismiss, 
  autoHide = true, 
  duration = 5000 
}: AchievementNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 100)
    
    // Auto hide
    if (autoHide) {
      const hideTimer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onDismiss, 300) // Wait for animation
      }, duration)
      
      return () => {
        clearTimeout(timer)
        clearTimeout(hideTimer)
      }
    }
    
    return () => clearTimeout(timer)
  }, [autoHide, duration, onDismiss])

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'from-purple-500 to-pink-500'
      case 'epic': return 'from-blue-500 to-purple-500'
      case 'rare': return 'from-green-500 to-blue-500'
      default: return 'from-gray-500 to-gray-600'
    }
  }

  const getRarityBadgeColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'bg-purple-500 text-white'
      case 'epic': return 'bg-blue-500 text-white'
      case 'rare': return 'bg-green-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  return (
    <div className={`
      fixed top-4 right-4 z-50 transition-all duration-300 transform
      ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
    `}>
      <Card className={`
        w-80 shadow-lg border-2 bg-gradient-to-r ${getRarityColor(achievement.rarity)}
        animate-pulse-slow
      `}>
        <CardContent className="p-4 bg-white/95 backdrop-blur-sm rounded-lg m-1">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Trophy className="h-6 w-6 text-yellow-500" />
                <Sparkles className="h-3 w-3 text-yellow-400 absolute -top-1 -right-1 animate-spin" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Achievement Unlocked!</h3>
                <Badge className={getRarityBadgeColor(achievement.rarity)}>
                  {achievement.rarity.toUpperCase()}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsVisible(false)
                setTimeout(onDismiss, 300)
              }}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-3 mb-3">
            <div className="text-3xl">{achievement.icon}</div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-1">
                {achievement.title}
              </h4>
              <p className="text-sm text-gray-600">
                {achievement.description}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="font-medium text-gray-900">
                +{achievement.points} points
              </span>
            </div>
            <Badge variant="outline" className="text-xs">
              {achievement.category}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Global achievement notification system
export function AchievementNotificationSystem() {
  const { newAchievements, showNotification, dismissNotification } = useAchievementNotifications()

  if (!showNotification || newAchievements.length === 0) {
    return null
  }

  return (
    <>
      {newAchievements.map((achievement, index) => (
        <div
          key={achievement.id}
          style={{ top: `${1 + index * 5}rem` }}
          className="fixed right-4 z-50"
        >
          <AchievementNotification
            achievement={achievement}
            onDismiss={dismissNotification}
            duration={5000 + index * 1000} // Stagger dismissal
          />
        </div>
      ))}
    </>
  )
}

// Hook for triggering achievement notifications
export function useAchievementToast() {
  const { showAchievement } = useAchievementNotifications()

  const showAchievementToast = (achievement: Achievement) => {
    showAchievement(achievement)
  }

  return { showAchievementToast }
}