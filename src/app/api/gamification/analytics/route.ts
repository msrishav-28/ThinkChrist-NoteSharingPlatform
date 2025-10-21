import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { gamificationAnalytics } from '@/lib/services/gamification-analytics'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || 'all_time'
    const type = searchParams.get('type') || 'overview'

    switch (type) {
      case 'overview':
        const analytics = await gamificationAnalytics.getOverallAnalytics(timeframe as any)
        return NextResponse.json({ analytics })

      case 'user_engagement':
        const userId = searchParams.get('userId') || user.id
        const engagement = await gamificationAnalytics.getUserEngagementScore(userId)
        return NextResponse.json({ engagement })

      case 'trends':
        const days = parseInt(searchParams.get('days') || '30')
        const trends = await gamificationAnalytics.getEngagementTrends(days)
        return NextResponse.json({ trends })

      default:
        return NextResponse.json({ error: 'Invalid analytics type' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, metadata } = body

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 })
    }

    // Track user action for analytics
    await gamificationAnalytics.trackUserAction(user.id, action, metadata)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error tracking user action:', error)
    return NextResponse.json(
      { error: 'Failed to track action' },
      { status: 500 }
    )
  }
}