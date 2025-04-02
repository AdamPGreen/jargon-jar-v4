import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import querystring from 'node:querystring'

// Helper function to parse Slack's form data
function parseSlackPayload(formData: FormData) {
  const entries = Array.from(formData.entries())
  const payload: Record<string, string> = {}
  
  for (const [key, value] of entries) {
    if (typeof value === 'string') {
      payload[key] = value
    }
  }
  
  return {
    command: payload.command,
    text: payload.text,
    user_id: payload.user_id,
    trigger_id: payload.trigger_id,
    channel_id: payload.channel_id,
    team_id: payload.team_id,
    token: payload.token
  }
}

// Verify that the request is coming from Slack
function verifySlackRequest(request: Request, body: FormData): boolean {
  // For now, we'll trust the request since we're behind Vercel's proxy
  // TODO: Implement proper request verification
  return true
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const slackPayload = parseSlackPayload(formData)
    
    // Verify Slack request
    if (!verifySlackRequest(req, formData)) {
      return new Response('Invalid request signature', { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    )

    // Fetch jargon terms
    const { data: jargonTerms } = await supabase
      .from('jargon_terms')
      .select('id, term, description, default_cost')
      .order('term')

    if (!jargonTerms) {
      throw new Error('Failed to fetch jargon terms')
    }

    const jargonOptions = jargonTerms.map(term => ({
      text: {
        type: 'plain_text',
        text: `${term.term} ($${term.default_cost})`,
        emoji: true
      },
      value: term.id,
      description: {
        type: 'plain_text',
        text: term.description,
        emoji: true
      }
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
        jargon_terms: jargonTerms
      })
    }

    // Open the modal
    const response = await fetch('https://slack.com/api/views.open', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${slackPayload.token}`
      },
      body: JSON.stringify({
        trigger_id: slackPayload.trigger_id,
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