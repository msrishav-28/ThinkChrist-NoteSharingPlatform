import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const department = searchParams.get('department')
    
    const supabase = createClient()
    
    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .order('points', { ascending: false })
    
    if (department) {
      query = query.eq('department', department)
    }
    
    const start = (page - 1) * limit
    query = query.range(start, start + limit - 1)
    
    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      users: data,
      totalCount: count,
      currentPage: page,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('Users fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}