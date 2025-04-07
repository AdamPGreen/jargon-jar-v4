import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  // Get query parameters
  const url = new URL(request.url)
  const workspaceId = url.searchParams.get('workspace_id')
  const dateFrom = url.searchParams.get('date_from')
  const limit = Number.parseInt(url.searchParams.get('limit') || '10', 10)
  const timePeriod = url.searchParams.get('time_period') || 'all'
  
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
    
    // Build the query - add time_period filter if needed
    let query = supabaseAdmin
      .from('jargon_words')
      .select(`
        id,
        word,
        description,
        charges:charges(count)
      `)
      .eq('workspace_id', workspaceId)
    
    // Add time period filter if specified
    if (timePeriod === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      query = query.gte('charges.created_at', weekAgo.toISOString());
    } else if (timePeriod === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      query = query.gte('charges.created_at', monthAgo.toISOString());
    }
    
    query = query.order('charges', { ascending: false, foreignTable: 'charges' })
      .limit(limit)
    
    // Mock response for development
    const mockData = [
      { 
        word_id: '1', 
        word: 'synergy', 
        description: 'The interaction of elements that when combined produce a total effect that is greater than the sum of the individual elements.',
        total_amount: 35000,
        usage_count: 70
      },
      { 
        word_id: '8', 
        word: 'low-hanging fruit', 
        description: 'A thing or person that can be won, obtained, or persuaded with little effort.',
        total_amount: 7500,
        usage_count: 65
      },
      { 
        word_id: '2', 
        word: 'circle back', 
        description: 'To return to a topic or discussion at a later time.',
        total_amount: 30000,
        usage_count: 60
      },
      { 
        word_id: '6', 
        word: 'leverage', 
        description: 'To use (something) to maximum advantage.',
        total_amount: 12500,
        usage_count: 55
      },
      { 
        word_id: '3', 
        word: 'touch base', 
        description: 'To briefly make or renew contact with someone.',
        total_amount: 25000,
        usage_count: 50
      },
      { 
        word_id: '4', 
        word: 'moving forward', 
        description: 'From now on; in the future.',
        total_amount: 20000,
        usage_count: 40
      },
      { 
        word_id: '5', 
        word: 'ideate', 
        description: 'To form an idea of; imagine or conceive.',
        total_amount: 15000,
        usage_count: 30
      },
      { 
        word_id: '9', 
        word: 'bandwidth', 
        description: 'The energy, mental capacity, or time that a person has available to deal with a situation.',
        total_amount: 5000,
        usage_count: 25
      },
      { 
        word_id: '7', 
        word: 'paradigm shift', 
        description: 'A fundamental change in approach or underlying assumptions.',
        total_amount: 10000,
        usage_count: 20
      },
      { 
        word_id: '10', 
        word: 'disrupt', 
        description: 'To drastically alter or destroy the structure of something.',
        total_amount: 2500,
        usage_count: 15
      }
    ]

    // For now, return mock data instead of actual query results
    // In production, you'd replace this with actual database query
    return NextResponse.json({ data: mockData })
    
  } catch (error) {
    console.error('Unexpected error in jargon frequency leaderboard API:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
} 