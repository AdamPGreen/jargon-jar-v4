import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  // Get query parameters
  const url = new URL(request.url)
  const workspaceId = url.searchParams.get('workspace_id')
  const limit = Number.parseInt(url.searchParams.get('limit') || '10', 10)
  
  // Validate parameters
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
  }

  try {
    // Create admin client to bypass RLS
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    
    // Get top users by frequency of charges
    const { data, error } = await supabaseAdmin.rpc('get_top_users_by_frequency', { 
      workspace_id_param: workspaceId,
      limit_param: limit
    })
    
    if (error) {
      console.error('Error fetching top users by frequency:', error)
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard data' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Unexpected error in leaderboard API:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
} 