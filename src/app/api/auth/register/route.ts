import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { validateChristEmail } from '@/lib/utils'

export async function POST(request: Request) {
  try {
    const { email, password, full_name, department, semester } = await request.json()

    // Validate Christ email
    if (!validateChristEmail(email)) {
      return NextResponse.json(
        { error: 'Please use your Christ University email (e.g., name@btech.christuniversity.in)' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (authData.user) {
      // Create user profile
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          full_name,
          department,
          semester: parseInt(semester),
        })

      if (profileError) {
        return NextResponse.json(
          { error: 'Failed to create user profile' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true, user: authData.user })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}