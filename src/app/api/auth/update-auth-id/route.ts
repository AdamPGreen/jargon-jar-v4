import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Only allow this in development or with proper authentication
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'This endpoint is only available in development' }, { status: 403 })
    }

    // Create admin client to bypass RLS
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Get all users from the users table
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, slack_id')

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Get all auth users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()

    if (authError) {
      console.error('Error fetching auth users:', authError)
      return NextResponse.json({ error: 'Failed to fetch auth users' }, { status: 500 })
    }

    // Create a map of email to auth user ID
    const emailToAuthId = new Map()
    for (const authUser of authUsers.users) {
      if (authUser.email) {
        emailToAuthId.set(authUser.email.toLowerCase(), authUser.id)
      }
    }

    // Update users with their auth_id
    const updates = []
    for (const user of users) {
      const authId = emailToAuthId.get(user.email.toLowerCase())
      if (authId) {
        updates.push(
          supabaseAdmin
            .from('users')
            .update({ auth_id: authId })
            .eq('id', user.id)
        )
      }
    }

    // Execute all updates
    const results = await Promise.all(updates)
    const errors = results.filter(result => result.error)
    
    return NextResponse.json({ 
      success: true, 
      updated: updates.length,
      errors: errors.length > 0 ? errors : null
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 