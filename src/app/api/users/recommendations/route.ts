import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RecommendationEngine } from '@/lib/services/recommendation'

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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const excludeInteracted = searchParams.get('exclude_interacted') !== 'false'

    // Generate recommendations
    const engine = new RecommendationEngine()
    const recommendations = await engine.getRecommendations(
      user.id,
      limit,
      excludeInteracted
    )

    return NextResponse.json({
      recommendations,
      count: recommendations.length
    })

  } catch (error) {
    console.error('Error generating recommendations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    // Parse request body for interaction tracking
    const body = await request.json()
    const { resourceId, interactionType, metadata = {} } = body

    if (!resourceId || !interactionType) {
      return NextResponse.json(
        { error: 'Missing required fields: resourceId, interactionType' },
        { status: 400 }
      )
    }

    // Track the interaction
    const engine = new RecommendationEngine()
    await engine.trackInteraction(user.id, resourceId, interactionType, metadata)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error tracking interaction:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}