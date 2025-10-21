import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { gamificationEngine, UserAction } from '@/lib/services/gamification'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, resourceId, collectionId, resourceType, metadata } = body

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 })
    }

    const userAction: UserAction = {
      type: action,
      userId: user.id,
      resourceId,
      collectionId,
      resourceType,
      metadata
    }

    // Calculate and award points
    const points = gamificationEngine.calculatePoints(userAction)
    await gamificationEngine.updateUserProgress(user.id, userAction)

    return NextResponse.json({ 
      success: true, 
      points_awarded: points,
      action: action
    })

  } catch (error) {
    console.error('Error awarding points:', error)
    return NextResponse.json(
      { error: 'Failed to award points' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const resourceType = searchParams.get('resourceType')
    const metadata = searchParams.get('metadata') ? JSON.parse(searchParams.get('metadata')!) : {}

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 })
    }

    const userAction: UserAction = {
      type: action as any,
      userId: user.id,
      resourceType: resourceType || undefined,
      metadata
    }

    // Calculate points without awarding them
    const points = gamificationEngine.calculatePoints(userAction)

    return NextResponse.json({ 
      points: points,
      action: action
    })

  } catch (error) {
    console.error('Error calculating points:', error)
    return NextResponse.json(
      { error: 'Failed to calculate points' },
      { status: 500 }
    )
  }
}