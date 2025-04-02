import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js' // Import standard client for admin tasks
import crypto from 'node:crypto'

// Verify that the request is coming from Slack
function verifySlackRequest(request: Request, body: string): boolean {
  const timestamp = request.headers.get('x-slack-request-timestamp')
  const signature = request.headers.get('x-slack-signature')
  
  console.log('DIAGNOSTIC: Request verification:', { timestamp, signature })
  
  if (!timestamp || !signature) return false
  
  // Verify timestamp is within 5 minutes
  const now = Math.floor(Date.now() / 1000)
  const requestTime = Number.parseInt(timestamp, 10)
  if (Math.abs(now - requestTime) > 300) return false
  
  // Verify signature
  const sigBasestring = `v0:${timestamp}:${body}`
  const signingSecret = process.env.SLACK_SIGNING_SECRET
  if (!signingSecret) return false
  
  const mySignature = `v0=${crypto
    .createHmac('sha256', signingSecret)
    .update(sigBasestring)
    .digest('hex')}`
  
  return crypto.timingSafeEqual(
    Buffer.from(mySignature),
    Buffer.from(signature)
  )
}

export async function POST(request: Request) {
  try {
    console.log('DIAGNOSTIC: Received slash command request')
    
    // Get the raw body for signature verification
    const body = await request.text()
    console.log('DIAGNOSTIC: Request body:', body)
    
    // Verify the request is from Slack
    if (!verifySlackRequest(request, body)) {
      console.log('DIAGNOSTIC: Request verification failed')
      return NextResponse.json({ error: 'Invalid request signature' }, { status: 401 })
    }
    
    // Parse the form data
    const formData = new URLSearchParams(body)
    const command = formData.get('command')
    const text = formData.get('text')
    const userId = formData.get('user_id')
    const triggerId = formData.get('trigger_id')
    const channelId = formData.get('channel_id')
    
    console.log('DIAGNOSTIC: Parsed form data:', { command, text, userId, triggerId, channelId })
    
    if (!command || !triggerId || !channelId) {
      console.log('DIAGNOSTIC: Missing required fields')
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    // Handle the charge command
    if (command === '/charge') {
      console.log('DIAGNOSTIC: Starting charge command handler')
      
      // --- Use Admin Client for DB reads to bypass RLS ---
      const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        { auth: { autoRefreshToken: false, persistSession: false } } // Important for server-side admin client
      )
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('DIAGNOSTIC (Commands): SUPABASE_SERVICE_ROLE_KEY env var is missing!')
        return NextResponse.json({ error: 'Server config error (Admin)' }, { status: 500 });
      }
      // ------------------------------------------------------
      
      // Get the workspace ID from the user's record using Admin Client
      console.log('DIAGNOSTIC: Fetching user workspace for slack_id (Admin Client):', userId)
      const { data: user, error: userError } = await supabaseAdmin // Use Admin Client
        .from('users')
        .select('workspace_id')
        .eq('slack_id', userId)
        .single()
      
      if (userError || !user) {
        console.error('DIAGNOSTIC: Error fetching user (Admin Client):', userError)
        // Respond slightly differently so we know it failed here
        return NextResponse.json({ text: 'Error: Could not find your user record in the database. Please try reinstalling the app.' })
      }
      
      console.log('DIAGNOSTIC: Found workspace_id:', user.workspace_id)
      
      // Get jargon terms for the workspace (including global terms) using Admin Client
      console.log('DIAGNOSTIC: Fetching jargon terms (Admin Client)')
      const { data: jargonTerms, error: jargonError } = await supabaseAdmin // Use Admin Client
        .from('jargon_terms')
        .select('id, term, default_cost')
        .or(`workspace_id.eq.${user.workspace_id},workspace_id.is.null`)
        .order('term')

      if (jargonError) {
        console.error('DIAGNOSTIC: Error fetching jargon terms (Admin Client):', jargonError)
        return NextResponse.json({ text: 'Error: Could not fetch jargon terms.' }, { status: 500 })
      }

      const jargonOptions = [
        ...jargonTerms.map(term => ({
          text: {
            type: 'plain_text',
            text: `${term.term} ($${term.default_cost})`,
            emoji: true
          },
          value: term.id
        })),
        // Add "Add new term" option at the end
        {
          text: {
            type: 'plain_text',
            text: '➕ Add new term',
            emoji: true
          },
          value: 'new_term'
        }
      ]
      
      // Open a modal for charge creation
      const modalView = {
        type: 'modal',
        callback_id: 'charge_modal',
        title: {
          type: 'plain_text',
          text: 'Create a Charge',
          emoji: true
        },
        submit: {
          type: 'plain_text',
          text: 'Submit',
          emoji: true
        },
        close: {
          type: 'plain_text',
          text: 'Cancel',
          emoji: true
        },
        blocks: [
          {
            type: 'input',
            block_id: 'user_block',
            element: {
              type: 'users_select',
              action_id: 'user_select',
              placeholder: {
                type: 'plain_text',
                text: 'Select a user',
                emoji: true
              }
            },
            label: {
              type: 'plain_text',
              text: 'Who used jargon?',
              emoji: true
            }
          },
          {
            type: 'input',
            block_id: 'jargon_block',
            element: {
              type: 'external_select',
              action_id: 'jargon_select',
              placeholder: {
                type: 'plain_text',
                text: 'Select or type to search',
                emoji: true
              },
              min_query_length: 0
            },
            label: {
              type: 'plain_text',
              text: 'What jargon was used?',
              emoji: true
            }
          }
        ]
      }
      
      console.log('DIAGNOSTIC: Opening modal with view:', JSON.stringify(modalView, null, 2))
      
      // Get the bot token from the workspace using Admin Client
      console.log('DIAGNOSTIC: Fetching workspace bot token (Admin Client)')
      const { data: workspace, error: workspaceError } = await supabaseAdmin // Use Admin Client
        .from('workspaces')
        .select('bot_token')
        .eq('id', user.workspace_id)
        .single()
      
      if (workspaceError || !workspace) {
        console.error('DIAGNOSTIC: Error fetching workspace (Admin Client):', workspaceError)
        return NextResponse.json({ text: 'Error: Could not find workspace data.' }, { status: 500 })
      }
      
      console.log('DIAGNOSTIC: Workspace data fetched:', JSON.stringify(workspace, null, 2))
      console.log('DIAGNOSTIC: Extracted bot_token:', workspace.bot_token)
      
      console.log('DIAGNOSTIC: Found workspace bot token')
      
      // Call Slack API to open the modal (uses fetched bot_token)
      const response = await fetch('https://slack.com/api/views.open', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${workspace.bot_token}` // USE WORKSPACE TOKEN
        },
        body: JSON.stringify({
          trigger_id: triggerId,
          view: {
            ...modalView,
            private_metadata: channelId // Pass channel ID for confirmation message later
          }
        })
      })
      
      const result = await response.json()
      console.log('DIAGNOSTIC: Slack API response:', result)
      
      if (!result.ok) {
        console.error('DIAGNOSTIC: Error opening modal:', result.error)
        return NextResponse.json({ error: 'Failed to open modal' }, { status: 500 })
      }
      
      // Return an empty response to acknowledge the command
      return NextResponse.json({})
    }
    
    return NextResponse.json({ error: 'Unknown command' }, { status: 400 })
  } catch (error) {
    console.error('DIAGNOSTIC: Error handling Slack command:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 