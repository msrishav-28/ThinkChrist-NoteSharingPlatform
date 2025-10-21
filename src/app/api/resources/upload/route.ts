import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { gamificationEngine } from '@/lib/services/gamification'
import { validateFileUpload, detectResourceTypeFromFile } from '@/features/resources/utils'

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

    // Validate file upload using resource utilities
    const validation = validateFileUpload(file.name, file.size, file.type)
    if (!validation.isValid) {
      return NextResponse.json({ 
        error: 'File validation failed', 
        details: validation.errors 
      }, { status: 400 })
    }

    // Detect resource type
    const resourceTypeDetection = detectResourceTypeFromFile(file.name, file.type)
    const detectedResourceType = resourceTypeDetection.type

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
        resource_type: detectedResourceType,
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

    // Award points using enhanced gamification system
    await gamificationEngine.updateUserProgress(user.id, {
      type: 'upload_resource',
      userId: user.id,
      resourceId: resource.id,
      resourceType: resource.resource_type || 'document',
      metadata: {
        file_size: file.size,
        file_type: file.type,
        department: metadata.department,
        course: metadata.course,
        is_verified: false
      }
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
