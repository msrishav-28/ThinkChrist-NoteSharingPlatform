import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { UserPreferences } from '@/shared/types'

export async function GET(request: Request) {
  try {
    const supabase = createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user preferences
    const { data: preferences, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Return default preferences if none exist
    if (!preferences) {
      const defaultPreferences: Omit<UserPreferences, 'id' | 'created_at' | 'updated_at'> = {
        user_id: user.id,
        notification_settings: {
          email_digest: true,
          new_resources: true,
          votes_received: true,
          achievements: true
        },
        recommendation_settings: {
          enable_recommendations: true,
          track_interactions: true
        },
        privacy_settings: {
          profile_visibility: 'public',
          activity_visibility: 'public'
        }
      }
      return NextResponse.json(defaultPreferences)
    }

    return NextResponse.json(preferences)
  } catch (error) {
    console.error('Get preferences error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { notification_settings, recommendation_settings, privacy_settings } = body

    // Validate required fields
    if (!notification_settings || !recommendation_settings || !privacy_settings) {
      return NextResponse.json(
        { error: 'Missing required preference settings' },
        { status: 400 }
      )
    }

    // Upsert user preferences
    const { data: preferences, error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        notification_settings,
        recommendation_settings,
        privacy_settings,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(preferences)
  } catch (error) {
    console.error('Update preferences error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}