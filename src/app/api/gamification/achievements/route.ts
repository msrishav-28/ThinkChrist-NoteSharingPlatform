import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { gamificationEngine } from '@/lib/services/gamification'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || user.id

    // Only allow users to view their own achievements or if they're viewing someone else's public profile
    if (userId !== user.id) {
      // In a real app, you'd check if the profile is public
      // For now, we'll allow viewing others' achievements
    }

    const achievements = await gamificationEngine.checkAchievements(userId)
    const userProgress = await gamificationEngine.getUserProgress(userId)

    return NextResponse.json({
      new_achievements: achievements,
      user_progress: userProgress
    })

  } catch (error) {
    console.error('Error fetching achievements:', error)
    return NextResponse.json(
      { error: 'Failed to fetch achievements' },
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

    // Check for new achievements
    const newAchievements = await gamificationEngine.checkAchievements(user.id)

    return NextResponse.json({
      new_achievements: newAchievements,
      count: newAchievements.length
    })

  } catch (error) {
    console.error('Error checking achievements:', error)
    return NextResponse.json(
      { error: 'Failed to check achievements' },
      { status: 500 }
    )
  }
}