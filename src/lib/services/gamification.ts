import { createClient } from '@/lib/supabase/client'
import { User, Resource, Collection } from '@/types'

export interface UserAction {
  type: 'upload_resource' | 'receive_upvote' | 'receive_downvote' | 'create_collection' | 
        'resource_downloaded' | 'complete_profile' | 'weekly_activity' | 'add_to_collection' |
        'share_collection' | 'tag_resource' | 'verify_resource' | 'comment_resource'
  userId: string
  resourceId?: string
  collectionId?: string
  resourceType?: string
  metadata?: Record<string, any>
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  points: number
  category: 'upload' | 'engagement' | 'curation' | 'social' | 'milestone'
  criteria: AchievementCriteria
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

export interface AchievementCriteria {
  type: 'count' | 'points' | 'streak' | 'combination'
  target: number
  action?: string
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'all_time'
  conditions?: Record<string, any>
}

export interface LeaderboardScope {
  type: 'global' | 'department' | 'course'
  department?: string
  course?: string
  timeframe: 'daily' | 'weekly' | 'monthly' | 'all_time'
}

export interface LeaderboardEntry {
  user_id: string
  full_name: string
  department: string
  course?: string
  total_points: number
  uploads_count: number
  collections_count: number
  badge_level: string
  rank: number
  recent_activity: number
}

export interface UserProgress {
  user_id: string
  total_points: number
  current_level: string
  next_level: string
  points_to_next_level: number
  achievements_earned: Achievement[]
  recent_achievements: Achievement[]
  weekly_progress: {
    points_earned: number
    actions_completed: number
    streak_days: number
  }
}

export class GamificationEngine {
  private _supabase: ReturnType<typeof createClient> | null = null

  private get supabase() {
    if (!this._supabase) {
      this._supabase = createClient()
    }
    return this._supabase
  }

  // Enhanced point calculation system
  calculatePoints(action: UserAction): number {
    const basePoints = {
      upload_resource: 10,
      receive_upvote: 5,
      receive_downvote: -2,
      create_collection: 15,
      resource_downloaded: 2,
      complete_profile: 25,
      weekly_activity: 50,
      add_to_collection: 3,
      share_collection: 8,
      tag_resource: 1,
      verify_resource: 20,
      comment_resource: 3
    }

    let points = basePoints[action.type] || 0

    // Bonus points based on resource type
    if (action.type === 'upload_resource' && action.resourceType) {
      const resourceTypeBonus = {
        video: 5,      // Videos require more effort
        code: 8,       // Code repositories are valuable
        article: 3,    // Articles are curated content
        link: 2,       // Links are easier to share
        document: 0    // Base points for documents
      }
      points += resourceTypeBonus[action.resourceType as keyof typeof resourceTypeBonus] || 0
    }

    // Bonus for verified content
    if (action.metadata?.is_verified) {
      points += 10
    }

    // Bonus for high-quality content (based on engagement)
    if (action.metadata?.upvotes && action.metadata.upvotes > 10) {
      points += Math.min(action.metadata.upvotes, 50) // Cap bonus at 50 points
    }

    return Math.max(points, 0) // Ensure points are never negative
  }

  async updateUserProgress(userId: string, action: UserAction): Promise<void> {
    const points = this.calculatePoints(action)
    
    if (points <= 0) return

    // Update user points and badge level
    const { error: pointsError } = await this.supabase.rpc('increment_user_points', {
      user_id: userId,
      points: points
    })

    if (pointsError) {
      console.error('Error updating user points:', pointsError)
      throw pointsError
    }

    // Record the contribution
    const { error: contributionError } = await this.supabase
      .from('contributions')
      .insert({
        user_id: userId,
        type: this.mapActionToContributionType(action.type),
        resource_id: action.resourceId,
        points_earned: points,
        metadata: {
          action_type: action.type,
          resource_type: action.resourceType,
          collection_id: action.collectionId,
          ...action.metadata
        }
      })

    if (contributionError) {
      console.error('Error recording contribution:', contributionError)
    }

    // Check for new achievements
    await this.checkAchievements(userId)
  }

  private mapActionToContributionType(actionType: string): string {
    const mapping = {
      upload_resource: 'upload',
      receive_upvote: 'vote',
      receive_downvote: 'vote',
      resource_downloaded: 'download',
      create_collection: 'collection',
      add_to_collection: 'curation',
      share_collection: 'social',
      tag_resource: 'curation',
      verify_resource: 'moderation',
      comment_resource: 'engagement'
    }
    return mapping[actionType as keyof typeof mapping] || 'other'
  }

  async checkAchievements(userId: string): Promise<Achievement[]> {
    const achievements = await this.getAvailableAchievements()
    const userStats = await this.getUserStats(userId)
    const newAchievements: Achievement[] = []

    for (const achievement of achievements) {
      const hasAchievement = await this.userHasAchievement(userId, achievement.id)
      if (hasAchievement) continue

      if (await this.checkAchievementCriteria(achievement, userStats)) {
        await this.awardAchievement(userId, achievement)
        newAchievements.push(achievement)
      }
    }

    return newAchievements
  }

  private async getAvailableAchievements(): Promise<Achievement[]> {
    // Define achievements - in a real app, these would be stored in the database
    return [
      // Upload achievements
      {
        id: 'first_upload',
        title: 'First Contribution',
        description: 'Upload your first resource',
        icon: '🎯',
        points: 10,
        category: 'upload',
        criteria: { type: 'count', target: 1, action: 'upload' },
        rarity: 'common'
      },
      {
        id: 'prolific_uploader',
        title: 'Prolific Uploader',
        description: 'Upload 10 resources',
        icon: '📚',
        points: 50,
        category: 'upload',
        criteria: { type: 'count', target: 10, action: 'upload' },
        rarity: 'rare'
      },
      {
        id: 'content_master',
        title: 'Content Master',
        description: 'Upload 50 resources',
        icon: '👑',
        points: 200,
        category: 'upload',
        criteria: { type: 'count', target: 50, action: 'upload' },
        rarity: 'epic'
      },
      
      // Collection achievements
      {
        id: 'first_collection',
        title: 'Curator',
        description: 'Create your first collection',
        icon: '📁',
        points: 15,
        category: 'curation',
        criteria: { type: 'count', target: 1, action: 'collection' },
        rarity: 'common'
      },
      {
        id: 'collection_master',
        title: 'Collection Master',
        description: 'Create 10 collections',
        icon: '🗂️',
        points: 100,
        category: 'curation',
        criteria: { type: 'count', target: 10, action: 'collection' },
        rarity: 'rare'
      },
      
      // Engagement achievements
      {
        id: 'popular_content',
        title: 'Popular Creator',
        description: 'Receive 100 upvotes across all content',
        icon: '⭐',
        points: 75,
        category: 'engagement',
        criteria: { type: 'count', target: 100, action: 'upvotes_received' },
        rarity: 'rare'
      },
      {
        id: 'viral_content',
        title: 'Viral Creator',
        description: 'Have a single resource receive 50+ upvotes',
        icon: '🚀',
        points: 150,
        category: 'engagement',
        criteria: { type: 'count', target: 50, action: 'single_resource_upvotes' },
        rarity: 'epic'
      },
      
      // Points milestones
      {
        id: 'points_100',
        title: 'Rising Star',
        description: 'Earn 100 points',
        icon: '🌟',
        points: 25,
        category: 'milestone',
        criteria: { type: 'points', target: 100 },
        rarity: 'common'
      },
      {
        id: 'points_500',
        title: 'Expert Contributor',
        description: 'Earn 500 points',
        icon: '🏆',
        points: 100,
        category: 'milestone',
        criteria: { type: 'points', target: 500 },
        rarity: 'rare'
      },
      {
        id: 'points_1000',
        title: 'Platform Legend',
        description: 'Earn 1000 points',
        icon: '👑',
        points: 250,
        category: 'milestone',
        criteria: { type: 'points', target: 1000 },
        rarity: 'legendary'
      },
      
      // Social achievements
      {
        id: 'helpful_member',
        title: 'Helpful Member',
        description: 'Help others by downloading 25 resources',
        icon: '🤝',
        points: 30,
        category: 'social',
        criteria: { type: 'count', target: 25, action: 'downloads_made' },
        rarity: 'common'
      },
      
      // Weekly activity
      {
        id: 'weekly_warrior',
        title: 'Weekly Warrior',
        description: 'Stay active for 7 consecutive days',
        icon: '🔥',
        points: 75,
        category: 'milestone',
        criteria: { type: 'streak', target: 7, timeframe: 'daily' },
        rarity: 'rare'
      }
    ]
  }

  private async getUserStats(userId: string): Promise<Record<string, any>> {
    // Get user's current points
    const { data: user } = await this.supabase
      .from('users')
      .select('points')
      .eq('id', userId)
      .single()

    // Get contribution counts
    const { data: contributions } = await this.supabase
      .from('contributions')
      .select('type, points_earned, created_at, metadata')
      .eq('user_id', userId)

    // Get resource stats
    const { data: resources } = await this.supabase
      .from('resources')
      .select('upvotes, downvotes, downloads')
      .eq('uploaded_by', userId)

    // Get collection count
    const { data: collections } = await this.supabase
      .from('collections')
      .select('id')
      .eq('created_by', userId)

    const stats = {
      total_points: user?.points || 0,
      upload_count: contributions?.filter(c => c.type === 'upload').length || 0,
      collection_count: collections?.length || 0,
      total_upvotes: resources?.reduce((sum, r) => sum + (r.upvotes || 0), 0) || 0,
      total_downloads: resources?.reduce((sum, r) => sum + (r.downloads || 0), 0) || 0,
      downloads_made: contributions?.filter(c => c.type === 'download').length || 0,
      max_resource_upvotes: Math.max(...(resources?.map(r => r.upvotes || 0) || [0])),
      consecutive_days: await this.getConsecutiveActiveDays(userId)
    }

    return stats
  }

  private async getConsecutiveActiveDays(userId: string): Promise<number> {
    const { data: contributions } = await this.supabase
      .from('contributions')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30) // Check last 30 days

    if (!contributions || contributions.length === 0) return 0

    const dates = contributions.map(c => new Date(c.created_at).toDateString())
    const uniqueDates = Array.from(new Set(dates)).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

    let streak = 0
    const today = new Date().toDateString()
    let currentDate = new Date()

    for (let i = 0; i < uniqueDates.length; i++) {
      const checkDate = currentDate.toDateString()
      if (uniqueDates.includes(checkDate)) {
        streak++
        currentDate.setDate(currentDate.getDate() - 1)
      } else {
        break
      }
    }

    return streak
  }

  private async checkAchievementCriteria(achievement: Achievement, stats: Record<string, any>): Promise<boolean> {
    const { criteria } = achievement

    switch (criteria.type) {
      case 'count':
        const countKey = this.getStatsKey(criteria.action!)
        return stats[countKey] >= criteria.target

      case 'points':
        return stats.total_points >= criteria.target

      case 'streak':
        return stats.consecutive_days >= criteria.target

      default:
        return false
    }
  }

  private getStatsKey(action: string): string {
    const mapping = {
      upload: 'upload_count',
      collection: 'collection_count',
      upvotes_received: 'total_upvotes',
      downloads_made: 'downloads_made',
      single_resource_upvotes: 'max_resource_upvotes'
    }
    return mapping[action as keyof typeof mapping] || action
  }

  private async userHasAchievement(userId: string, achievementId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('user_achievements')
      .select('id')
      .eq('user_id', userId)
      .eq('achievement_id', achievementId)
      .single()

    return !!data
  }

  private async awardAchievement(userId: string, achievement: Achievement): Promise<void> {
    // Record the achievement
    const { error: achievementError } = await this.supabase
      .from('user_achievements')
      .insert({
        user_id: userId,
        achievement_id: achievement.id,
        points_earned: achievement.points,
        earned_at: new Date().toISOString()
      })

    if (achievementError) {
      console.error('Error awarding achievement:', achievementError)
      return
    }

    // Award bonus points
    await this.supabase.rpc('increment_user_points', {
      user_id: userId,
      points: achievement.points
    })

    // Send notification
    await this.supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'achievement',
        title: `Achievement Unlocked: ${achievement.title}`,
        message: achievement.description,
        data: {
          achievement_id: achievement.id,
          points_earned: achievement.points,
          rarity: achievement.rarity
        }
      })
  }

  async getLeaderboard(scope: LeaderboardScope, limit: number = 50): Promise<LeaderboardEntry[]> {
    let query = this.supabase
      .from('users')
      .select(`
        id,
        full_name,
        department,
        points,
        badge_level,
        created_at
      `)

    // Apply scope filters
    if (scope.type === 'department' && scope.department) {
      query = query.eq('department', scope.department)
    }

    // For course-specific leaderboards, we'd need to join with user courses
    // This would require additional schema changes

    const { data: users, error } = await query
      .order('points', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching leaderboard:', error)
      return []
    }

    if (!users) return []

    // Get additional stats for each user
    const leaderboardEntries: LeaderboardEntry[] = []

    for (let i = 0; i < users.length; i++) {
      const user = users[i]
      
      // Get upload count
      const { data: resources } = await this.supabase
        .from('resources')
        .select('id')
        .eq('uploaded_by', user.id)

      // Get collection count
      const { data: collections } = await this.supabase
        .from('collections')
        .select('id')
        .eq('created_by', user.id)

      // Get recent activity (last 7 days)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      
      const { data: recentContributions } = await this.supabase
        .from('contributions')
        .select('points_earned')
        .eq('user_id', user.id)
        .gte('created_at', weekAgo.toISOString())

      const recentActivity = recentContributions?.reduce((sum, c) => sum + c.points_earned, 0) || 0

      leaderboardEntries.push({
        user_id: user.id,
        full_name: user.full_name,
        department: user.department,
        total_points: user.points,
        uploads_count: resources?.length || 0,
        collections_count: collections?.length || 0,
        badge_level: user.badge_level,
        rank: i + 1,
        recent_activity: recentActivity
      })
    }

    return leaderboardEntries
  }

  async getUserProgress(userId: string): Promise<UserProgress> {
    const stats = await this.getUserStats(userId)
    const achievements = await this.getAvailableAchievements()
    
    // Get user's earned achievements
    const { data: earnedAchievements } = await this.supabase
      .from('user_achievements')
      .select('achievement_id, earned_at')
      .eq('user_id', userId)

    const earnedIds = new Set(earnedAchievements?.map(a => a.achievement_id) || [])
    const achievementsEarned = achievements.filter(a => earnedIds.has(a.id))
    
    // Get recent achievements (last 7 days)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const recentAchievements = achievementsEarned.filter(a => {
      const earned = earnedAchievements?.find(e => e.achievement_id === a.id)
      return earned && new Date(earned.earned_at) >= weekAgo
    })

    // Calculate level progression
    const currentLevel = this.calculateLevel(stats.total_points)
    const nextLevel = this.getNextLevel(currentLevel)
    const pointsToNextLevel = this.getPointsForLevel(nextLevel) - stats.total_points

    // Get weekly progress
    const { data: weeklyContributions } = await this.supabase
      .from('contributions')
      .select('points_earned, created_at')
      .eq('user_id', userId)
      .gte('created_at', weekAgo.toISOString())

    const weeklyPoints = weeklyContributions?.reduce((sum, c) => sum + c.points_earned, 0) || 0
    const weeklyActions = weeklyContributions?.length || 0

    return {
      user_id: userId,
      total_points: stats.total_points,
      current_level: currentLevel,
      next_level: nextLevel,
      points_to_next_level: Math.max(pointsToNextLevel, 0),
      achievements_earned: achievementsEarned,
      recent_achievements: recentAchievements,
      weekly_progress: {
        points_earned: weeklyPoints,
        actions_completed: weeklyActions,
        streak_days: stats.consecutive_days
      }
    }
  }

  private calculateLevel(points: number): string {
    if (points >= 1000) return 'Master'
    if (points >= 500) return 'Expert'
    if (points >= 200) return 'Advanced'
    if (points >= 50) return 'Intermediate'
    return 'Freshman'
  }

  private getNextLevel(currentLevel: string): string {
    const levels = ['Freshman', 'Intermediate', 'Advanced', 'Expert', 'Master']
    const currentIndex = levels.indexOf(currentLevel)
    return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : 'Master'
  }

  private getPointsForLevel(level: string): number {
    const levelPoints = {
      'Freshman': 0,
      'Intermediate': 50,
      'Advanced': 200,
      'Expert': 500,
      'Master': 1000
    }
    return levelPoints[level as keyof typeof levelPoints] || 1000
  }
}

// Export singleton instance
export const gamificationEngine = new GamificationEngine()
