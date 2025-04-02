import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  // Extract query parameters
  const url = new URL(request.url)
  const term = url.searchParams.get('term')
  const workspaceId = url.searchParams.get('workspace_id')

  if (!term || !workspaceId) {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    )
  }

  // Use admin client to bypass RLS
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    )
  }

  try {
    // Query database for the jargon term
    const { data, error } = await supabaseAdmin
      .from('jargon_terms')
      .select('id, term, description, default_cost')
      .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`)
      .ilike('term', term)
      .limit(1)
      .single()

    if (error) {
      // If error is "No rows found" return exists: false
      if (error.code === 'PGRST116') {
        return NextResponse.json({ exists: false })
      }
      
      return NextResponse.json(
        { error: 'Database query error', details: error.message },
        { status: 500 }
      )
    }

    // Return term details including exists flag
    return NextResponse.json({
      exists: true,
      id: data.id,
      term: data.term, 
      description: data.description,
      default_cost: data.default_cost
    })
  } catch (e) {
    console.error('Error checking if jargon term exists:', e)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 