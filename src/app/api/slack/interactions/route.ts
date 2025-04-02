import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'node:crypto'

// Verify that the request is coming from Slack
function verifySlackRequest(request: Request, body: string): boolean {
  const timestamp = request.headers.get('x-slack-request-timestamp')
  const signature = request.headers.get('x-slack-signature')
  
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

interface SlackModalPayload {
  type: string;
  user: {
    id: string;
  };
  view: {
    state: {
      values: {
        user_block: {
          user_select: {
            selected_user: string;
          };
        };
        jargon_block: {
          jargon_select: {
            selected_option: {
              value: string;
              text: {
                text: string;
              };
            };
          };
        };
        amount_block: {
          amount_input: {
            value: string;
          };
        };
        description_block: {
          description_input: {
            value: string;
          };
        };
      };
    };
    private_metadata: string;
  };
}

export async function POST(request: Request) {
  try {
    // Get the raw body for signature verification
    const body = await request.text()
    
    // Verify the request is from Slack
    if (!verifySlackRequest(request, body)) {
      return NextResponse.json({ error: 'Invalid request signature' }, { status: 401 })
    }
    
    // Parse the payload
    const payload = JSON.parse(body)
    
    // Handle different types of interactions
    switch (payload.type) {
      case 'view_submission':
        // Handle modal submission
        return handleModalSubmission(payload)
      case 'view_closed':
        // Handle modal closed
        return NextResponse.json({})
      default:
        return NextResponse.json({ error: 'Unknown interaction type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error handling Slack interaction:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleModalSubmission(payload: SlackModalPayload) {
  try {
    console.log('DIAGNOSTIC: Processing modal submission:', payload)
    
    // Get the form values
    const view = payload.view
    const values = view.state.values
    
    // Extract form values
    const selectedUserId = values.user_block.user_select.selected_user
    const selectedJargonId = values.jargon_block.jargon_select.selected_option.value
    const selectedJargonText = values.jargon_block.jargon_select.selected_option.text.text
    const amount = values.amount_block.amount_input.value
    const description = values.description_block.description_input.value
    
    console.log('DIAGNOSTIC: Form values:', { selectedUserId, selectedJargonId, selectedJargonText, amount, description })
    
    if (!selectedUserId || !selectedJargonId || !amount || !description) {
      console.log('DIAGNOSTIC: Missing required fields')
      return NextResponse.json({
        response_action: 'errors',
        errors: {
          user_block: !selectedUserId ? 'Please select a user' : undefined,
          jargon_block: !selectedJargonId ? 'Please select a jargon term' : undefined,
          amount_block: !amount ? 'Please enter an amount' : undefined,
          description_block: !description ? 'Please enter a description' : undefined
        }
      })
    }
    
    // Get the charging user's ID from the payload
    const chargingUserId = payload.user.id
    
    // Get Supabase client
    const supabase = createClient()
    
    // Get the workspace ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('workspace_id')
      .eq('slack_id', chargingUserId)
      .single()
    
    if (userError || !user) {
      console.error('DIAGNOSTIC: Error fetching charging user:', userError)
      return NextResponse.json({ error: 'Charging user not found' }, { status: 404 })
    }
    
    // Get the charged user's database ID
    const { data: chargedUser, error: chargedUserError } = await supabase
      .from('users')
      .select('id')
      .eq('slack_id', selectedUserId)
      .single()
    
    if (chargedUserError || !chargedUser) {
      console.error('DIAGNOSTIC: Error fetching charged user:', chargedUserError)
      return NextResponse.json({ error: 'Charged user not found' }, { status: 404 })
    }
    
    // Create the charge
    const { data: charge, error: chargeError } = await supabase
      .from('charges')
      .insert({
        charged_user_id: chargedUser.id,
        charging_user_id: user.workspace_id,
        jargon_term_id: selectedJargonId,
        amount: Number.parseFloat(amount),
        message_text: description,
        message_ts: Date.now().toString(),
        channel_id: payload.view.private_metadata,
        is_automatic: false,
        workspace_id: user.workspace_id
      })
      .select()
      .single()
    
    if (chargeError) {
      console.error('DIAGNOSTIC: Error creating charge:', chargeError)
      return NextResponse.json({ error: 'Failed to create charge' }, { status: 500 })
    }
    
    // Send a confirmation message to the channel
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
      },
      body: JSON.stringify({
        channel: payload.view.private_metadata,
        text: `💰 New charge created!\n<@${selectedUserId}> owes $${amount} for using "${selectedJargonText}": ${description}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `💰 *New charge created!*\n<@${selectedUserId}> owes $${amount} for using "${selectedJargonText}": ${description}`
            }
          }
        ]
      })
    })
    
    const result = await response.json()
    if (!result.ok) {
      console.error('DIAGNOSTIC: Error sending confirmation message:', result.error)
    }
    
    return NextResponse.json({})
  } catch (error) {
    console.error('DIAGNOSTIC: Error handling modal submission:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 