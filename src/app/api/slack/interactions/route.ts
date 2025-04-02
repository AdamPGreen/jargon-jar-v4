import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { WebClient } from '@slack/web-api'
import { createClient } from '@supabase/supabase-js'
import querystring from 'node:querystring'

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

// --- Type Definitions ---
interface SlackUser {
  id: string;
  username: string;
  name: string;
  team_id: string;
}

interface SlackTeam {
  id: string;
  domain: string;
}

interface SlackBlockAction {
  selected_user?: string;
  selected_option?: SlackSelectedOption;
  value?: string; // For input fields
  // Add other action types if needed
}

interface SlackSelectedOption {
  value: string;
}

// This is a basic structure, adjust based on your actual block kit definition
interface SlackViewStateValues {
  [blockId: string]: {
    [actionId: string]: SlackBlockAction;
  };
}

interface SlackView {
  id: string;
  type: string; // e.g., 'modal'
  callback_id: string;
  private_metadata: string; // JSON stringified data
  state: {
    values: SlackViewStateValues;
  };
  // Add other view properties if needed
}

interface SlackInteractionPayload {
  type: 'view_submission' | 'view_closed' | string; // Extend with other interaction types
  token: string;
  action_ts: string;
  team: SlackTeam;
  user: SlackUser;
  api_app_id: string;
  view: SlackView;
  // Add other payload properties if needed
}

interface PrivateMetadata {
    channel_id: string;
    charging_user_id: string; // This is the Slack ID
}

export async function POST(request: Request) {
  try {
    // Get the raw body for signature verification
    const body = await request.text()
    console.log(`Received raw body: ${body.substring(0, 100)}...`)
    
    // Verify the request is from Slack
    if (!verifySlackRequest(request, body)) {
      return NextResponse.json({ error: 'Invalid request signature' }, { status: 401 })
    }
    
    // Slack sends form-encoded data with a 'payload' parameter
    // Parse the form-encoded body
    const formData = querystring.parse(body)
    
    // Extract and parse the payload JSON string
    const payloadStr = formData.payload as string
    if (!payloadStr) {
      console.error('No payload parameter found in request body')
      return NextResponse.json({ error: 'Missing payload' }, { status: 400 })
    }
    
    console.log(`Extracted payload string: ${payloadStr.substring(0, 100)}...`)
    
    // Parse the payload as JSON
    const payload: SlackInteractionPayload = JSON.parse(payloadStr)
    console.log(`Parsed payload type: ${payload.type}`)
    
    // Handle different types of interactions
    switch (payload.type) {
      case 'view_submission':
        return handleModalSubmission(payload)
      case 'view_closed':
        return NextResponse.json({}) // No action needed for closed
      default:
        console.warn('Unknown interaction type:', payload.type)
        return NextResponse.json({ error: 'Unknown interaction type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error handling Slack interaction:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleModalSubmission(payload: SlackInteractionPayload) { // Use interface
  console.log('Handling modal submission for callback_id:', payload.view.callback_id)

  if (payload.view.callback_id !== 'charge_modal') {
    console.warn('Received submission for unexpected callback_id:', payload.view.callback_id)
    return NextResponse.json({ error: 'Unexpected callback_id' }, { status: 400 })
  }

  // Ensure required env vars are present
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Missing Supabase URL or Service Role Key')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const supabaseServiceRole = createClient(supabaseUrl, supabaseServiceRoleKey)
  const teamId = payload.team.id
  const viewStateValues = payload.view.state.values

  try {
    // --- 1. Parse Metadata ---
    let privateMetadata: PrivateMetadata
    try {
      privateMetadata = JSON.parse(payload.view.private_metadata)
    } catch (e) {
      console.error('Failed to parse private_metadata:', payload.view.private_metadata, e)
      return NextResponse.json({ error: 'Invalid metadata format' }, { status: 400 })
    }
    const { channel_id: channelId, charging_user_id: chargingUserSlackId } = privateMetadata // Renamed for clarity

    if (!channelId || !chargingUserSlackId) {
      console.error('Missing channel_id or charging_user_id in private_metadata', privateMetadata)
      return NextResponse.json({ error: 'Missing required metadata' }, { status: 400 })
    }

    // --- 2. Fetch Workspace/Bot Token ---
    const { data: workspace, error: workspaceError } = await supabaseServiceRole
      .from('workspaces')
      .select('id, bot_token')
      .eq('slack_id', teamId)
      .single()

    if (workspaceError || !workspace || !workspace.bot_token) {
      console.error(`Error fetching workspace or bot token for team ${teamId}:`, workspaceError)
      return NextResponse.json({ error: 'Could not retrieve workspace info' }, { status: 500 })
    }

    const botToken = workspace.bot_token
    const workspaceId = workspace.id // DB UUID
    const slackWebClient = new WebClient(botToken)

    // --- 3. Extract Modal Data ---
    // **IMPORTANT**: Adjust block_id and action_id names to match YOUR Block Kit definition
    const userSelectBlockId = 'user_select_block' // Replace with your actual block ID
    const userSelectActionId = 'user_select_action' // Replace with your actual action ID
    const jargonSelectBlockId = 'jargon_select_block' // Replace with your actual block ID
    const jargonSelectActionId = 'jargon_select_action' // Replace with your actual action ID
    const amountInputBlockId = 'amount_input_block' // Replace with your actual block ID
    const amountInputActionId = 'amount_input_action' // Replace with your actual action ID

    const selectedUserSlackId = viewStateValues[userSelectBlockId]?.[userSelectActionId]?.selected_user
    const selectedJargonTermId = viewStateValues[jargonSelectBlockId]?.[jargonSelectActionId]?.selected_option?.value // This should be the DB UUID
    const customAmountStr = viewStateValues[amountInputBlockId]?.[amountInputActionId]?.value
    const customAmount = customAmountStr ? Number.parseFloat(customAmountStr) : null // Use Number.parseFloat

    // Basic validation
    if (!selectedUserSlackId || !selectedJargonTermId) {
      console.error('Missing user or jargon term selection:', viewStateValues)
      const errors: { [key: string]: string } = {}
      if (!selectedUserSlackId) errors[userSelectBlockId] = 'Please select a user.'
      if (!selectedJargonTermId) errors[jargonSelectBlockId] = 'Please select a jargon term.'
      return NextResponse.json({ response_action: 'errors', errors })
    }

    // --- 4. Fetch Jargon Term Default Cost (if no custom amount) ---
    let chargeAmount = customAmount
    if (chargeAmount === null || Number.isNaN(chargeAmount)) { // Use Number.isNaN
        const { data: jargonTerm, error: termError } = await supabaseServiceRole
            .from('jargon_terms')
            .select('default_cost')
            .eq('id', selectedJargonTermId) // Assuming value is the UUID
            .single()

        if (termError || !jargonTerm) {
            console.error(`Error fetching jargon term ${selectedJargonTermId}:`, termError)
            return NextResponse.json({ error: 'Could not fetch jargon term details' }, { status: 500 })
        }
        // Ensure default_cost is treated as a number
        const defaultCost = typeof jargonTerm.default_cost === 'string'
                           ? Number.parseFloat(jargonTerm.default_cost)
                           : jargonTerm.default_cost;

        chargeAmount = defaultCost;
    }

    if (chargeAmount === null || Number.isNaN(chargeAmount) || chargeAmount < 0) { // Use Number.isNaN
        console.error('Invalid charge amount determined:', chargeAmount)
        const errors = { [amountInputBlockId]: 'Invalid charge amount.' }
        return NextResponse.json({ response_action: 'errors', errors })
    }

    // --- 5. Fetch User DB IDs ---
    // Fetch the internal DB UUIDs for the users based on their Slack IDs
    const fetchUserDbId = async (slackId: string): Promise<string | null> => {
        const { data: userData, error: userError } = await supabaseServiceRole
            .from('users')
            .select('id')
            .eq('slack_id', slackId)
            .eq('workspace_id', workspaceId) // Ensure user belongs to the correct workspace
            .single();
        if (userError) {
            console.error(`Error fetching user DB ID for Slack ID ${slackId} in workspace ${workspaceId}:`, userError);
            return null;
        }
        return userData?.id ?? null;
    };

    const [chargedDbUserId, chargingDbUserId] = await Promise.all([
        fetchUserDbId(selectedUserSlackId),
        fetchUserDbId(chargingUserSlackId)
    ]);

    if (!chargedDbUserId || !chargingDbUserId) {
        console.error('Could not find database entries for one or both users:', { selectedUserSlackId, chargingUserSlackId, chargedDbUserId, chargingDbUserId });
        // Consider sending an ephemeral message back to the user who submitted
        return NextResponse.json({ error: 'Could not identify users involved in the charge.' }, { status: 400 });
    }


    // --- 6. Create Charge Record in Supabase ---
    const { data: chargeData, error: insertError } = await supabaseServiceRole
      .from('charges')
      .insert({
        charged_user_id: chargedDbUserId, // Use DB UUID
        charging_user_id: chargingDbUserId, // Use DB UUID
        jargon_term_id: selectedJargonTermId, // DB UUID from modal value
        amount: chargeAmount,
        channel_id: channelId, // Slack Channel ID
        workspace_id: workspaceId, // DB UUID
        is_automatic: false,
      })
      .select('id') // Optionally select the new charge ID
      .single()

    if (insertError) {
      console.error('Error inserting charge into database:', insertError)
      return NextResponse.json({ error: 'Failed to record charge' }, { status: 500 })
    }

    console.log('Charge successfully recorded with ID:', chargeData?.id);

    // --- 7. Post Confirmation Message to Slack ---
    try {
      // Fetch Jargon term text again (could be optimized by fetching earlier)
      const { data: termData, error: termFetchError } = await supabaseServiceRole
        .from('jargon_terms')
        .select('term')
        .eq('id', selectedJargonTermId)
        .single()

      if (termFetchError || !termData) {
          console.error(`Error fetching jargon term text for ${selectedJargonTermId}:`, termFetchError);
          // Proceed without term text if fetch fails
      }
      const jargonText = termData?.term ?? 'an unspecified term'

      // Use Slack IDs for mentions
      const confirmationText = `:dollar: <@${chargingUserSlackId}> just charged <@${selectedUserSlackId}> $${chargeAmount.toFixed(2)} for using "${jargonText}"! Add it to the jar! :money_with_wings:`

      await slackWebClient.chat.postMessage({
        channel: channelId,
        text: confirmationText,
      })
      console.log(`Confirmation message sent to channel ${channelId}`)
    } catch (slackError) {
      console.error('Error sending Slack confirmation message:', slackError)
      // Log error but don't fail the interaction if DB insert succeeded
    }

    // --- 8. Acknowledge the interaction ---
    // Return empty 200 OK to close the modal and confirm receipt
    return NextResponse.json({})

  } catch (error) {
    console.error('Unhandled error in handleModalSubmission:', error)
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
} 