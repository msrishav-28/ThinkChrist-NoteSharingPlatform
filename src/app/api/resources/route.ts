import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/resources - List all resources with optional filtering
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)

    // Extract query parameters for filtering
    const department = searchParams.get('department')
    const course = searchParams.get('course')
    const semester = searchParams.get('semester')
    const resourceType = searchParams.get('resourceType')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('resources')
      .select(`
        *,
        uploader:users!uploaded_by(id, full_name, department, badge_level)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters if provided
    if (department) {
      query = query.eq('department', department)
    }
    if (course) {
      query = query.eq('course', course)
    }
    if (semester) {
      query = query.eq('semester', parseInt(semester))
    }
    if (resourceType) {
      query = query.eq('resource_type', resourceType)
    }

    const { data: resources, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      resources,
      total: count,
      limit,
      offset
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/resources - Create a new resource
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate required fields
    const requiredFields = ['title', 'department', 'course', 'semester', 'subject']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Create resource
    const { data: resource, error } = await supabase
      .from('resources')
      .insert({
        ...body,
        uploaded_by: user.id,
        resource_type: body.resource_type || 'document',
        upvotes: 0,
        downvotes: 0,
        downloads: 0,
        views: 0,
        is_verified: false
      })
      .select(`
        *,
        uploader:users!uploaded_by(id, full_name, department, badge_level)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ resource }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
