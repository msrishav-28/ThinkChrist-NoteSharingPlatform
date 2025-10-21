import { createClient } from '@/lib/supabase/client'

export interface GamificationAnalytics {
  user_engagement: {
    total_active_users: number
    daily_active_users: number
    weekly_active_users: number
    monthly_active_users: number
    average_session_duration: number
    retention_rate: number
  }
  achievement_stats: {
    total_achievements_awarded: number
    achievement_completion_rates: { [achievementId: string]: number }
    popular_achievements: Array<{
      achievement_id: string
      title: string
      completion_count: number
      completion_rate: number
    }>
    recent_achievements: Array<{
      achievement_id: string
      title: string
      user_name: string
      earned_at: string
    }>
  }
  points_distribution: {
    total_points_awarded: number
    average_points_per_user: number
    points_by_action_type: { [actionType: string]: number }
    top_point_earners: Array<{
      user_id: string
      user_name: string
      total_points: number
      weekly_points: number
    }>
  }
  leaderboard_stats: {
    level_distribution: { [level: string]: number }
    department_rankings: Array<{
      department: string
      average_points: number
      total_users: number
      top_user: string
    }>
    activity_trends: Array<{
      date: string
      total_points: number
      active_users: number
      achievements_earned: number
    }>
  }
}

export interface UserEngagementMetrics {
  user_id: string
  total_points: number
  achievements_count: number
  uploads_count: number
  collections_count: number
  votes_given: number
  votes_received: number
  last_activity: string
  streak_days: number
  engagement_score: number
}

export class GamificationAnalyticsService {
  private _supabase: ReturnType<typeof createClient> | null = null

  private get supabase() {
    if (!this._supabase) {
      this._supabase = createClient()
    }
    return this._supabase
  }

  async getOverallAnalytics(timeframe: 'daily' | 'weekly' | 'monthly' | 'all_time' = 'all_time'): Promise<GamificationAnalytics> {
    const [
      userEngagement,
      achievementStats,
      pointsDistribution,
      leaderboardStats
    ] = await Promise.all([
      this.getUserEngagementMetrics(timeframe),
      this.getAchievementAnalytics(timeframe),
      this.getPointsDistribution(timeframe),
      this.getLeaderboardAnalytics(timeframe)
    ])

    return {
      user_engagement: userEngagement,
      achievement_stats: achievementStats,
      points_distribution: pointsDistribution,
      leaderboard_stats: leaderboardStats
    }
  }

  private async getUserEngagementMetrics(timeframe: string) {
    const timeFilter = this.getTimeFilter(timeframe)
    
    // Get total users
    const { data: totalUsers } = await this.supabase
      .from('users')
      .select('id', { count: 'exact' })

    // Get active users by timeframe
    const { data: activeUsers } = await this.supabase
      .from('contributions')
      .select('user_id', { count: 'exact' })
      .gte('created_at', timeFilter)

    // Get daily active users (last 24 hours)
    const dayAgo = new Date()
    dayAgo.setDate(dayAgo.getDate() - 1)
    
    const { data: dailyActiveUsers } = await this.supabase
      .from('contributions')
      .select('user_id', { count: 'exact' })
      .gte('created_at', dayAgo.toISOString())

    // Get weekly active users
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    
    const { data: weeklyActiveUsers } = await this.supabase
      .from('contributions')
      .select('user_id', { count: 'exact' })
      .gte('created_at', weekAgo.toISOString())

    // Get monthly active users
    const monthAgo = new Date()
    monthAgo.setMonth(monthAgo.getMonth() - 1)
    
    const { data: monthlyActiveUsers } = await this.supabase
      .from('contributions')
      .select('user_id', { count: 'exact' })
      .gte('created_at', monthAgo.toISOString())

    return {
      total_active_users: totalUsers?.length || 0,
      daily_active_users: dailyActiveUsers?.length || 0,
      weekly_active_users: weeklyActiveUsers?.length || 0,
      monthly_active_users: monthlyActiveUsers?.length || 0,
      average_session_duration: 0, // Would need session tracking
      retention_rate: 0 // Would need more complex calculation
    }
  }

  private async getAchievementAnalytics(timeframe: string) {
    const timeFilter = this.getTimeFilter(timeframe)

    // Get total achievements awarded
    const { data: totalAchievements } = await this.supabase
      .from('user_achievements')
      .select('id', { count: 'exact' })
      .gte('earned_at', timeFilter)

    // Get achievement completion rates
    const { data: achievementCounts } = await this.supabase
      .from('user_achievements')
      .select('achievement_id')
      .gte('earned_at', timeFilter)

    const { data: totalUsers } = await this.supabase
      .from('users')
      .select('id', { count: 'exact' })

    const totalUserCount = totalUsers?.length || 1

    // Calculate completion rates
    const achievementStats = achievementCounts?.reduce((acc, achievement) => {
      acc[achievement.achievement_id] = (acc[achievement.achievement_id] || 0) + 1
      return acc
    }, {} as { [key: string]: number }) || {}

    const completionRates = Object.entries(achievementStats).reduce((acc, [id, count]) => {
      acc[id] = (count / totalUserCount) * 100
      return acc
    }, {} as { [key: string]: number })

    // Get popular achievements
    const popularAchievements = Object.entries(achievementStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([achievement_id, count]) => ({
        achievement_id,
        title: this.getAchievementTitle(achievement_id),
        completion_count: count,
        completion_rate: completionRates[achievement_id]
      }))

    // Get recent achievements
    const { data: recentAchievements } = await this.supabase
      .from('user_achievements')
      .select(`
        achievement_id,
        earned_at,
        users!user_id(full_name)
      `)
      .gte('earned_at', timeFilter)
      .order('earned_at', { ascending: false })
      .limit(10)

    const recentAchievementsFormatted = recentAchievements?.map(achievement => ({
      achievement_id: achievement.achievement_id,
      title: this.getAchievementTitle(achievement.achievement_id),
      user_name: (achievement.users as any)?.full_name || 'Unknown',
      earned_at: achievement.earned_at
    })) || []

    return {
      total_achievements_awarded: totalAchievements?.length || 0,
      achievement_completion_rates: completionRates,
      popular_achievements: popularAchievements,
      recent_achievements: recentAchievementsFormatted
    }
  }

  private async getPointsDistribution(timeframe: string) {
    const timeFilter = this.getTimeFilter(timeframe)

    // Get total points awarded
    const { data: contributions } = await this.supabase
      .from('contributions')
      .select('points_earned, type, user_id, users!user_id(full_name)')
      .gte('created_at', timeFilter)

    const totalPoints = contributions?.reduce((sum, c) => sum + c.points_earned, 0) || 0
    
    // Get user count for average
    const { data: users } = await this.supabase
      .from('users')
      .select('id', { count: 'exact' })

    const averagePoints = users?.length ? totalPoints / users.length : 0

    // Points by action type
    const pointsByAction = contributions?.reduce((acc, contribution) => {
      acc[contribution.type] = (acc[contribution.type] || 0) + contribution.points_earned
      return acc
    }, {} as { [key: string]: number }) || {}

    // Top point earners
    const userPoints = contributions?.reduce((acc, contribution) => {
      const userId = contribution.user_id
      const userName = (contribution.users as any)?.full_name || 'Unknown'
      
      if (!acc[userId]) {
        acc[userId] = { user_id: userId, user_name: userName, total_points: 0, weekly_points: 0 }
      }
      
      acc[userId].total_points += contribution.points_earned
      
      // Check if it's within the last week for weekly points
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      // This would need the created_at field to be more accurate
      acc[userId].weekly_points += contribution.points_earned
      
      return acc
    }, {} as { [key: string]: any }) || {}

    const topPointEarners = Object.values(userPoints)
      .sort((a: any, b: any) => b.total_points - a.total_points)
      .slice(0, 10)

    return {
      total_points_awarded: totalPoints,
      average_points_per_user: averagePoints,
      points_by_action_type: pointsByAction,
      top_point_earners: topPointEarners as any[]
    }
  }

  private async getLeaderboardAnalytics(timeframe: string) {
    // Get level distribution
    const { data: users } = await this.supabase
      .from('users')
      .select('badge_level, department, points, full_name')

    const levelDistribution = users?.reduce((acc, user) => {
      acc[user.badge_level] = (acc[user.badge_level] || 0) + 1
      return acc
    }, {} as { [key: string]: number }) || {}

    // Department rankings
    const departmentStats = users?.reduce((acc, user) => {
      if (!acc[user.department]) {
        acc[user.department] = {
          department: user.department,
          total_points: 0,
          total_users: 0,
          top_user: '',
          top_user_points: 0
        }
      }
      
      acc[user.department].total_points += user.points || 0
      acc[user.department].total_users += 1
      
      if ((user.points || 0) > acc[user.department].top_user_points) {
        acc[user.department].top_user = user.full_name
        acc[user.department].top_user_points = user.points || 0
      }
      
      return acc
    }, {} as { [key: string]: any }) || {}

    const departmentRankings = Object.values(departmentStats).map((dept: any) => ({
      department: dept.department,
      average_points: dept.total_users > 0 ? dept.total_points / dept.total_users : 0,
      total_users: dept.total_users,
      top_user: dept.top_user
    }))

    // Activity trends (simplified - would need more complex time-series data)
    const activityTrends = [
      {
        date: new Date().toISOString().split('T')[0],
        total_points: users?.reduce((sum, u) => sum + (u.points || 0), 0) || 0,
        active_users: users?.length || 0,
        achievements_earned: 0 // Would need to query achievements
      }
    ]

    return {
      level_distribution: levelDistribution,
      department_rankings: departmentRankings,
      activity_trends: activityTrends
    }
  }

  async getUserEngagementScore(userId: string): Promise<UserEngagementMetrics> {
    // Get user's basic stats
    const { data: user } = await this.supabase
      .from('users')
      .select('points, badge_level, created_at')
      .eq('id', userId)
      .single()

    // Get user's contributions
    const { data: contributions } = await this.supabase
      .from('contributions')
      .select('type, points_earned, created_at')
      .eq('user_id', userId)

    // Get user's achievements
    const { data: achievements } = await this.supabase
      .from('user_achievements')
      .select('achievement_id, earned_at')
      .eq('user_id', userId)

    // Get user's uploads
    const { data: uploads } = await this.supabase
      .from('resources')
      .select('id, upvotes, downvotes')
      .eq('uploaded_by', userId)

    // Get user's collections
    const { data: collections } = await this.supabase
      .from('collections')
      .select('id')
      .eq('created_by', userId)

    // Get user's votes given
    const { data: votesGiven } = await this.supabase
      .from('votes')
      .select('id')
      .eq('user_id', userId)

    // Calculate engagement score
    const baseScore = user?.points || 0
    const achievementBonus = (achievements?.length || 0) * 10
    const uploadBonus = (uploads?.length || 0) * 5
    const collectionBonus = (collections?.length || 0) * 8
    const voteBonus = (votesGiven?.length || 0) * 1

    const engagementScore = baseScore + achievementBonus + uploadBonus + collectionBonus + voteBonus

    // Calculate streak days (simplified)
    const streakDays = this.calculateStreakDays(contributions || [])

    // Get last activity
    const lastActivity = (contributions && contributions.length > 0) 
      ? contributions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
      : user?.created_at || new Date().toISOString()

    return {
      user_id: userId,
      total_points: user?.points || 0,
      achievements_count: achievements?.length || 0,
      uploads_count: uploads?.length || 0,
      collections_count: collections?.length || 0,
      votes_given: votesGiven?.length || 0,
      votes_received: uploads?.reduce((sum, upload) => sum + (upload.upvotes || 0), 0) || 0,
      last_activity: lastActivity,
      streak_days: streakDays,
      engagement_score: engagementScore
    }
  }

  private calculateStreakDays(contributions: any[]): number {
    if (contributions.length === 0) return 0

    const dates = contributions
      .map(c => new Date(c.created_at).toDateString())
      .filter((date, index, array) => array.indexOf(date) === index)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

    let streak = 0
    let currentDate = new Date()

    for (let i = 0; i < dates.length; i++) {
      const checkDate = currentDate.toDateString()
      if (dates.includes(checkDate)) {
        streak++
        currentDate.setDate(currentDate.getDate() - 1)
      } else {
        break
      }
    }

    return streak
  }

  private getTimeFilter(timeframe: string): string {
    const now = new Date()
    
    switch (timeframe) {
      case 'daily':
        now.setDate(now.getDate() - 1)
        break
      case 'weekly':
        now.setDate(now.getDate() - 7)
        break
      case 'monthly':
        now.setMonth(now.getMonth() - 1)
        break
      default:
        now.setFullYear(2020) // All time
    }
    
    return now.toISOString()
  }

  private getAchievementTitle(achievementId: string): string {
    // In a real app, this would query the achievements table
    const achievementTitles: { [key: string]: string } = {
      'first_upload': 'First Contribution',
      'prolific_uploader': 'Prolific Uploader',
      'content_master': 'Content Master',
      'first_collection': 'Curator',
      'collection_master': 'Collection Master',
      'popular_content': 'Popular Creator',
      'viral_content': 'Viral Creator',
      'points_100': 'Rising Star',
      'points_500': 'Expert Contributor',
      'points_1000': 'Platform Legend',
      'helpful_member': 'Helpful Member',
      'weekly_warrior': 'Weekly Warrior'
    }
    
    return achievementTitles[achievementId] || achievementId
  }

  async trackUserAction(userId: string, action: string, metadata?: Record<string, any>): Promise<void> {
    // Track user actions for analytics
    await this.supabase
      .from('user_interactions')
      .insert({
        user_id: userId,
        resource_id: metadata?.resourceId,
        interaction_type: action,
        interaction_data: metadata || {}
      })
  }

  async getEngagementTrends(days: number = 30): Promise<Array<{
    date: string
    active_users: number
    points_awarded: number
    achievements_earned: number
    uploads: number
    collections: number
  }>> {
    const trends = []
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      // Get daily stats
      const [contributions, achievements, uploads, collections] = await Promise.all([
        this.supabase
          .from('contributions')
          .select('user_id, points_earned')
          .gte('created_at', date.toISOString())
          .lt('created_at', nextDate.toISOString()),
        
        this.supabase
          .from('user_achievements')
          .select('id')
          .gte('earned_at', date.toISOString())
          .lt('earned_at', nextDate.toISOString()),
        
        this.supabase
          .from('resources')
          .select('id')
          .gte('created_at', date.toISOString())
          .lt('created_at', nextDate.toISOString()),
        
        this.supabase
          .from('collections')
          .select('id')
          .gte('created_at', date.toISOString())
          .lt('created_at', nextDate.toISOString())
      ])

      const uniqueUsers = new Set(contributions.data?.map(c => c.user_id) || []).size
      const totalPoints = contributions.data?.reduce((sum, c) => sum + c.points_earned, 0) || 0

      trends.push({
        date: dateStr,
        active_users: uniqueUsers,
        points_awarded: totalPoints,
        achievements_earned: achievements.data?.length || 0,
        uploads: uploads.data?.length || 0,
        collections: collections.data?.length || 0
      })
    }

    return trends
  }
}

// Export singleton instance
export const gamificationAnalytics = new GamificationAnalyticsService()
