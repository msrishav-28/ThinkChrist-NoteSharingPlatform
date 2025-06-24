import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    const { data: resource, error } = await supabase
      .from('resources')
      .select(`
        *,
        uploader:users!uploaded_by(id, full_name, department)
      `)
      .eq('id', params.id)
      .single()

    if (error) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }

    // Get user vote if logged in
    if (user) {
      const { data: vote } = await supabase
        .from('votes')
        .select('vote_type')
        .match({ user_id: user.id, resource_id: params.id })
        .single()
      
      if (vote) {
        resource.user_vote = vote.vote_type
      }
    }

    return NextResponse.json(resource)
  } catch (error) {
    console.error('Resource fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check ownership
    const { data: resource } = await supabase
      .from('resources')
      .select('uploaded_by, file_url')
      .eq('id', params.id)
      .single()

    if (!resource || resource.uploaded_by !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Delete from storage
    const fileName = resource.file_url.split('/').pop()
    if (fileName) {
      await supabase.storage.from('resources').remove([fileName])
    }

    // Delete database record
    const { error } = await supabase
      .from('resources')
      .delete()
      .eq('id', params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}