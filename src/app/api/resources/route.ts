import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const department = searchParams.get('department')
    const semester = searchParams.get('semester')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'recent'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = 12

    const supabase = createClient()
    
    // Build query
    let query = supabase
      .from('resources')
      .select(`
        *,
        uploader:users!uploaded_by(id, full_name),
        user_vote:votes(vote_type)
      `, { count: 'exact' })

    // Apply filters
    if (department) {
      query = query.eq('department', department)
    }
    if (semester) {
      query = query.eq('semester', parseInt(semester))
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // Apply sorting
    switch (sortBy) {
      case 'popular':
        query = query.order('upvotes', { ascending: false })
        break
      case 'downloads':
        query = query.order('downloads', { ascending: false })
        break
      case 'upvotes':
        query = query.order('upvotes', { ascending: false })
        break
      default:
        query = query.order('created_at', { ascending: false })
    }

    // Apply pagination
    const start = (page - 1) * limit
    query = query.range(start, start + limit - 1)

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get current user's votes
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user && data) {
      const resourceIds = data.map(r => r.id)
      const { data: userVotes } = await supabase
        .from('votes')
        .select('resource_id, vote_type')
        .eq('user_id', user.id)
        .in('resource_id', resourceIds)

      // Map user votes to resources
      const voteMap = new Map(userVotes?.map(v => [v.resource_id, v.vote_type]))
      data.forEach(resource => {
        resource.user_vote = voteMap.get(resource.id) || null
      })
    }

    return NextResponse.json({
      resources: data,
      totalCount: count,
      currentPage: page,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}