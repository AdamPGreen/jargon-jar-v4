import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    // Parse request body
    const { term, description, default_cost, created_by, workspace_id } = await request.json()
    
    // Validate required fields
    if (!term || !workspace_id || default_cost === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: term, default_cost, and workspace_id are required' },
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

    // Check if the term already exists for this workspace
    const { data: existingTerm, error: existingTermError } = await supabaseAdmin
      .from('jargon_terms')
      .select('id')
      .or(`workspace_id.eq.${workspace_id},workspace_id.is.null`)
      .ilike('term', term)
      .limit(1)
      .single()

    if (existingTerm) {
      return NextResponse.json(
        { error: 'Jargon term already exists' },
        { status: 409 }
      )
    }

    // Insert the new jargon term
    const { data, error } = await supabaseAdmin
      .from('jargon_terms')
      .insert({
        term,
        description,
        default_cost,
        created_by,
        workspace_id
      })
      .select('id, term, description, default_cost')
      .single()

    if (error) {
      console.error('Error creating new jargon term:', error)
      return NextResponse.json(
        { error: 'Failed to create jargon term', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Jargon term created successfully',
      term: data
    })
  } catch (e) {
    console.error('Unexpected error creating jargon term:', e)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 