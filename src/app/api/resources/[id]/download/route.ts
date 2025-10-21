import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const resourceId = params.id

    // Get current download count and increment
    const { data: resource } = await supabase
      .from('resources')
      .select('downloads')
      .eq('id', resourceId)
      .single()

    if (resource) {
      await supabase
        .from('resources')
        .update({ downloads: resource.downloads + 1 })
        .eq('id', resourceId)
    }

    // Track download if user is logged in
    if (user) {
      await supabase
        .from('contributions')
        .insert({
          user_id: user.id,
          type: 'download',
          resource_id: resourceId,
          points_earned: 0,
        })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Download tracking error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
