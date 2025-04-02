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

    // Get the workspace's bot token
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('bot_token')
      .eq('slack_id', teamId)
      .single()

    if (workspaceError || !workspace?.bot_token) {
      console.error('Error fetching workspace:', workspaceError)
      return new Response('Could not fetch workspace info', { status: 500 })
    }

    // Fetch jargon terms
    const { data: jargonTerms, error: jargonError } = await supabase
      .from('jargon_terms')
      .select('id, term, default_cost')
      .order('term')

    if (jargonError || !jargonTerms) {
      console.error('Error fetching jargon terms:', jargonError)
      return new Response('Could not fetch jargon terms', { status: 500 })
    }

    // Create options without descriptions (they'll be shown after selection)
    const jargonOptions = jargonTerms.map(term => ({
      text: {
        type: 'plain_text',
        text: `${term.term} ($${term.default_cost})`,
        emoji: true
      },
      value: term.id
    }))

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
                text: 'Add New Jargon',
                emoji: true
              },
              action_id: 'add_new_jargon',
              style: 'primary'
            }
          ]
        }
      ],
      private_metadata: JSON.stringify({
        channel_id: channelId,
        // Store a map of id -> description for use in the interaction handler
        descriptions: Object.fromEntries(
          jargonTerms.map(term => [term.id, term.description || ''])
        )
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