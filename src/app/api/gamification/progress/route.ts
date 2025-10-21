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

    // Only allow users to view their own progress or if they're viewing someone else's public profile
    if (userId !== user.id) {
      // In a real app, you'd check if the profile is public
      // For now, we'll allow viewing others' progress
    }

    const userProgress = await gamificationEngine.getUserProgress(userId)

    return NextResponse.json({
      progress: userProgress
    })

  } catch (error) {
    console.error('Error fetching user progress:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user progress' },
      { status: 500 }
    )
  }
}