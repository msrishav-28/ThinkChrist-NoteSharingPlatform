import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { gamificationEngine, LeaderboardScope } from '@/lib/services/gamification'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'global'
    const department = searchParams.get('department')
    const course = searchParams.get('course')
    const timeframe = searchParams.get('timeframe') || 'all_time'
    const limit = parseInt(searchParams.get('limit') || '50')

    const scope: LeaderboardScope = {
      type: type as 'global' | 'department' | 'course',
      department: department || undefined,
      course: course || undefined,
      timeframe: timeframe as 'daily' | 'weekly' | 'monthly' | 'all_time'
    }

    const leaderboard = await gamificationEngine.getLeaderboard(scope, limit)

    // Find current user's position
    const userPosition = leaderboard.findIndex(entry => entry.user_id === user.id)
    const userRank = userPosition >= 0 ? userPosition + 1 : null

    return NextResponse.json({
      leaderboard,
      user_rank: userRank,
      total_entries: leaderboard.length,
      scope
    })

  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    )
  }
}