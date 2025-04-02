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

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const slackPayload = parseSlackPayload(formData)
    
    // Verify Slack request
    if (!verifySlackRequest(req, formData)) {
      return new Response('Invalid request signature', { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
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
          type: 'input',
          block_id: 'amount_block',
          element: {
            type: 'plain_text_input',
            action_id: 'amount_input',
            placeholder: {
              type: 'plain_text',
              text: 'Enter charge amount',
              emoji: true
            }
          },
          label: {
            type: 'plain_text',
            text: 'Charge amount ($)',
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