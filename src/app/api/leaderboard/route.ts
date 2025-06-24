import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || 'all'
    const limit = parseInt(searchParams.get('limit') || '50')

    const supabase = createClient()
    
    // Get date filter based on timeframe
    let dateFilter = null
    const now = new Date()
    
    switch (timeframe) {
      case 'week':
        dateFilter = new Date(now.setDate(now.getDate() - 7))
        break
      case 'month':
        dateFilter = new Date(now.setMonth(now.getMonth() - 1))
        break
      case 'semester':
        dateFilter = new Date(now.setMonth(now.getMonth() - 6))
        break
    }

    // Build query for leaderboard
    let query = supabase
      .from('users')
      .select(`
        id,
        full_name,
        department,
        points,
        badge_level,
        uploads_count:resources(count),
        contributions:contributions(points_earned, created_at)
      `)
      .order('points', { ascending: false })
      .limit(limit)

    const { data: users, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Process data to calculate stats
    const leaderboard = users?.map((user, index) => {
      let relevantPoints = user.points
      
      if (dateFilter && user.contributions) {
        relevantPoints = user.contributions
          .filter((c: any) => new Date(c.created_at) >= dateFilter)
          .reduce((sum: number, c: any) => sum + c.points_earned, 0)
      }

      return {
        rank: index + 1,
        user_id: user.id,
        full_name: user.full_name,
        department: user.department,
        total_points: relevantPoints,
        uploads_count: user.uploads_count?.[0]?.count || 0,
        badge_level: user.badge_level,
      }
    })

    return NextResponse.json({ leaderboard })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}