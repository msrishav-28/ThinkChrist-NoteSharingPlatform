import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const includeStats = searchParams.get('include_stats') !== 'false'
    const includeActivity = searchParams.get('include_activity') !== 'false'
    const includeRecommendations = searchParams.get('include_recommendations') !== 'false'
    const includeFeed = searchParams.get('include_feed') !== 'false'

    const dashboardData: any = {
      user: profile,
      timestamp: new Date().toISOString()
    }

    // Fetch user statistics
    if (includeStats) {
      const [uploadsResult, resourcesResult, contributionsResult] = await Promise.all([
        // Upload count
        supabase
          .from('resources')
          .select('*', { count: 'exact', head: true })
          .eq('uploaded_by', user.id),
        
        // User's resources for calculating total downloads/upvotes
        supabase
          .from('resources')
          .select('downloads, upvotes, views')
          .eq('uploaded_by', user.id),
        
        // Total points from contributions
        supabase
          .from('contributions')
          .select('points_earned')
          .eq('user_id', user.id)
      ])

      const totalDownloads = resourcesResult.data?.reduce((sum, r) => sum + r.downloads, 0) || 0
      const totalUpvotes = resourcesResult.data?.reduce((sum, r) => sum + r.upvotes, 0) || 0
      const totalViews = resourcesResult.data?.reduce((sum, r) => sum + r.views, 0) || 0
      const totalPoints = contributionsResult.data?.reduce((sum, c) => sum + c.points_earned, 0) || 0

      dashboardData.stats = {
        uploads: uploadsResult.count || 0,
        downloads: totalDownloads,
        upvotes: totalUpvotes,
        views: totalViews,
        points: totalPoints,
        badge_level: profile.badge_level || 'Newcomer'
      }
    }

    // Fetch recent activity
    if (includeActivity) {
      const { data: activities } = await supabase
        .from('contributions')
        .select(`
          *,
          resource:resources(title, resource_type)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      dashboardData.recent_activity = activities || []
    }

    // Fetch personalized feed
    if (includeFeed) {
      const { data: feedResources } = await supabase
        .from('resources')
        .select(`
          *,
          uploader:uploaded_by(full_name, department)
        `)
        .neq('uploaded_by', user.id)
        .or(`department.eq.${profile.department},course.eq.${profile.course}`)
        .order('created_at', { ascending: false })
        .limit(20)

      // Add feed scoring
      const scoredFeed = (feedResources || []).map(resource => {
        let score = 0
        
        // Recency score
        const ageInDays = (Date.now() - new Date(resource.created_at).getTime()) / (24 * 60 * 60 * 1000)
        score += Math.max(0, 1 - (ageInDays / 30)) * 0.3
        
        // Department/course match
        if (resource.department === profile.department) {
          score += 0.4
          if (resource.course === profile.course) {
            score += 0.3
          }
        }
        
        // Engagement score
        const engagementScore = (resource.upvotes * 2 + resource.downloads + resource.views * 0.1) / 100
        score += Math.min(0.5, engagementScore)
        
        return {
          ...resource,
          feed_score: Math.min(1, score),
          feed_reason: resource.department === profile.department 
            ? (resource.course === profile.course ? 'course' : 'department')
            : 'recent'
        }
      })

      // Sort by score and take top items
      scoredFeed.sort((a, b) => b.feed_score - a.feed_score)
      dashboardData.personalized_feed = scoredFeed.slice(0, 10)
    }

    // Fetch trending content
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: trendingResources } = await supabase
      .from('resources')
      .select(`
        *,
        uploader:uploaded_by(full_name, department)
      `)
      .neq('uploaded_by', user.id)
      .gte('created_at', weekAgo)
      .order('upvotes', { ascending: false })
      .limit(5)

    dashboardData.trending = trendingResources || []

    // Fetch unread notifications count
    const { count: unreadNotifications } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    dashboardData.unread_notifications = unreadNotifications || 0

    return NextResponse.json(dashboardData)

  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}