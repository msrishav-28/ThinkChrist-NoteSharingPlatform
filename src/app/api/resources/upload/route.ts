import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const metadata = JSON.parse(formData.get('metadata') as string)
    
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Upload file
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}-${Date.now()}.${fileExt}`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('resources')
      .upload(fileName, file)

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('resources')
      .getPublicUrl(fileName)

    // Create resource record
    const { data: resource, error: dbError } = await supabase
      .from('resources')
      .insert({
        ...metadata,
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        uploaded_by: user.id,
        semester: parseInt(metadata.semester),
      })
      .select()
      .single()

    if (dbError) {
      // Clean up uploaded file on DB error
      await supabase.storage.from('resources').remove([fileName])
      return NextResponse.json({ error: 'Failed to save resource' }, { status: 500 })
    }

    // Add contribution points
    await supabase
      .from('contributions')
      .insert({
        user_id: user.id,
        type: 'upload',
        resource_id: resource.id,
        points_earned: 10,
      })

    // Update user points
    await supabase.rpc('increment_user_points', { 
      user_id: user.id, 
      points: 10 
    })

    return NextResponse.json({ success: true, resource })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
