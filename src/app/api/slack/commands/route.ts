import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    // Get the raw body for signature verification
    const body = await req.text()
    const formData = new URLSearchParams(body)
    
    const command = formData.get('command')
    const triggerId = formData.get('trigger_id')
    const channelId = formData.get('channel_id')
    const teamId = formData.get('team_id')
    
    if (!command || !triggerId || !channelId || !teamId) {
      return new Response('Missing required fields', { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    )

    // Fetch workspace info
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id, bot_token')
      .eq('slack_id', teamId)
      .single()

    if (workspaceError || !workspace || !workspace.bot_token) {
      console.error('Error fetching workspace:', workspaceError)
      return NextResponse.json({ error: 'Failed to fetch workspace info' }, { status: 500 })
    }

    // Fetch jargon terms for this workspace
    const { data: jargonTerms, error: jargonError } = await supabase
      .from('jargon_terms')
      .select('id, term, default_cost, description')
      .or(`workspace_id.eq.${workspace.id},workspace_id.is.null`)
      .order('term')

    if (jargonError) {
      console.error('Error fetching jargon terms:', jargonError)
      return NextResponse.json({ error: 'Failed to fetch jargon terms' }, { status: 500 })
    }

    // Create options for the jargon select
    const jargonOptions = jargonTerms.map(term => ({
      text: {
        type: 'plain_text' as const,
        text: `${term.term} ($${term.default_cost})`,
        emoji: true
      },
      value: term.id
    }))

    // Add "Add new term" option
    jargonOptions.push({
      text: {
        type: 'plain_text' as const,
        text: '➕ Add new term',
        emoji: true
      },
      value: 'new_term'
    })

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
            type: 'static_select',
            action_id: 'jargon_select',
            placeholder: {
              type: 'plain_text',
              text: 'Select jargon term',
              emoji: true
            },
            options: jargonOptions
          },
          label: {
            type: 'plain_text',
            text: 'What jargon was used?',
            emoji: true
          }
        },
        {
          type: 'actions',
          block_id: 'actions_block',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '➕ Add New Jargon',
                emoji: true
              },
              action_id: 'add_new_jargon',
              style: 'default'
            }
          ]
        }
      ],
      private_metadata: JSON.stringify({
        channel_id: channelId,
        workspace_id: workspace.id
      })
    }

    // Open the modal
    const response = await fetch('https://slack.com/api/views.open', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${workspace.bot_token}`
      },
      body: JSON.stringify({
        trigger_id: triggerId,
        view: modalView
      })
    })

    const result = await response.json()
    
    if (!result.ok) {
      console.error('Error opening modal:', result)
      throw new Error(`Failed to open modal: ${result.error}`)
    }

    return new Response(JSON.stringify(result))
  } catch (error) {
    console.error('Error in charge command handler:', error)
    return new Response('Internal server error', { status: 500 })
  }
} 