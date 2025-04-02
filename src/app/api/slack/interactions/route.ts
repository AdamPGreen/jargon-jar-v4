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
  name?: string;
  team_id?: string;
}

interface SlackTeam {
  id: string;
  domain: string;
}

interface SlackBlockAction {
  action_id: string;
  block_id: string;
  value?: string;
  selected_user?: string;
  selected_option?: {
    value: string;
    text: {
      type: string;
      text: string;
      emoji?: boolean;
    };
  };
  // Add other properties as needed
}

interface OptionsLoadPayload extends SlackBasePayload {
  type: 'block_suggestion';
  block_id: string;
  action_id: string;
  value: string;
}

type SlackInteractionPayload = ViewSubmissionPayload | BlockActionsPayload | ViewClosedPayload | OptionsLoadPayload;

// Define base interface
interface SlackBasePayload {
  type: string;
  token: string;
  team: SlackTeam;
  user: SlackUser;
  api_app_id: string;
}

// Define PlainTextElement
interface PlainTextElement {
  type: "plain_text";
  text: string;
  emoji?: boolean;
}

// Define MarkdownTextElement
interface MarkdownTextElement {
  type: "mrkdwn";
  text: string;
  verbatim?: boolean;
}

type TextElement = PlainTextElement | MarkdownTextElement;

// Define View
interface SlackView {
  id: string;
  type: string;
  callback_id: string;
  private_metadata: string;
  hash?: string;
  title: PlainTextElement;
  submit?: PlainTextElement;
  close?: PlainTextElement;
  blocks: SlackBlock[];
  state?: {
    values: SlackViewStateValues;
  };
}

interface ViewSubmissionPayload extends SlackBasePayload {
  type: 'view_submission';
  view: SlackView & {
    state: {
      values: SlackViewStateValues;
    };
  };
}

interface ViewClosedPayload extends SlackBasePayload {
  type: 'view_closed';
  view: SlackView;
}

interface BlockActionsPayload extends SlackBasePayload {
  type: 'block_actions';
  container: {
    type: string;
    view_id: string;
  };
  trigger_id: string;
  view: SlackView;
  actions: SlackBlockAction[];
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

interface PrivateMetadata {
    channel_id: string;
    charging_user_id: string; // This is the Slack ID
}

// Simplify the BlockElement to avoid the 'any' error
interface BlockElement {
  type: string;
  action_id: string;
  [key: string]: unknown;
}

// Update SlackBlock to use the simplified BlockElement
interface SlackBlock {
  type: string;
  block_id: string;
  element?: BlockElement;
  elements?: BlockElement[];
  label?: PlainTextElement;
  text?: TextElement;
  optional?: boolean;
  [key: string]: unknown;
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
    
    // Parse the payload as JSON and determine its type
    const parsedPayload = JSON.parse(payloadStr);
    const payloadType = parsedPayload.type;
    
    console.log(`Parsed payload type: ${payloadType}`)
    
    // Handle different types of interactions
    switch (payloadType) {
      case 'view_submission':
        return handleModalSubmission(parsedPayload as ViewSubmissionPayload)
      case 'block_actions':
        return handleBlockActions(parsedPayload as BlockActionsPayload)
      case 'block_suggestion':
        return handleOptionsLoad(parsedPayload as OptionsLoadPayload)
      case 'view_closed':
        return NextResponse.json({}) // No action needed for closed
      default:
        console.warn('Unknown interaction type:', payloadType)
        return NextResponse.json({ error: 'Unknown interaction type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error handling Slack interaction:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleModalSubmission(payload: ViewSubmissionPayload) { // Use interface
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
    let privateMetadata: PrivateMetadata;
    let channelId: string;
    let chargingUserSlackId: string;
    
    // First try to parse it as JSON
    try {
      privateMetadata = JSON.parse(payload.view.private_metadata);
      channelId = privateMetadata.channel_id;
      chargingUserSlackId = privateMetadata.charging_user_id;
    } catch (parseError) {
      // If it's not valid JSON, assume it's just the channel ID string
      console.log(`private_metadata is not JSON, treating as channel ID: ${payload.view.private_metadata}`);
      channelId = payload.view.private_metadata;
      // Default to the user who submitted the modal as the charging user
      chargingUserSlackId = payload.user.id;
    }
    
    console.log(`Using channel ID: ${channelId}, charging user: ${chargingUserSlackId}`);
  
    if (!channelId) {
      console.error('Missing channel_id in private_metadata', payload.view.private_metadata);
      return NextResponse.json({ error: 'Missing required channel ID' }, { status: 400 });
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
    // Use the actual block and action IDs from the modal
    const userBlockId = 'user_block'
    const userSelectId = 'user_select'
    const jargonBlockId = 'jargon_block'
    const jargonSelectId = 'jargon_select'
    const customJargonBlockId = 'custom_jargon_block'
    const customJargonInputId = 'custom_jargon_input'
    const amountBlockId = 'amount_block'
    const amountInputId = 'amount_input'
    const descriptionBlockId = 'description_block'
    const descriptionInputId = 'description_input'

    console.log('Modal values:', JSON.stringify(viewStateValues, null, 2))

    const selectedUserSlackId = viewStateValues[userBlockId]?.[userSelectId]?.selected_user
    const selectedJargonTermOption = viewStateValues[jargonBlockId]?.[jargonSelectId]?.selected_option
    const selectedJargonTermId = selectedJargonTermOption?.value
    const customJargonTerm = viewStateValues[customJargonBlockId]?.[customJargonInputId]?.value
    const customAmountStr = viewStateValues[amountBlockId]?.[amountInputId]?.value
    const descriptionText = viewStateValues[descriptionBlockId]?.[descriptionInputId]?.value
    const customAmount = customAmountStr ? Number.parseFloat(customAmountStr) : null

    console.log(`User: ${selectedUserSlackId}, Jargon: ${selectedJargonTermId}, Custom Jargon: ${customJargonTerm}, Amount: ${customAmount}, Description: ${descriptionText}`)

    // Basic validation
    if (!selectedUserSlackId) {
      console.error('Missing user selection:', viewStateValues)
      const errors: { [key: string]: string } = {}
      errors[userBlockId] = 'Please select a user.'
      return NextResponse.json({ response_action: 'errors', errors })
    }
    
    // Check if we're using an existing term or creating a new one
    const isNewJargonTerm = !selectedJargonTermId && customJargonTerm;
    let jargonTermId = selectedJargonTermId;
    
    if (!isNewJargonTerm && !selectedJargonTermId) {
      console.error('Missing jargon term selection:', viewStateValues)
      const errors: { [key: string]: string } = {}
      errors[jargonBlockId] = 'Please select a jargon term or add a new one.'
      return NextResponse.json({ response_action: 'errors', errors })
    }
    
    // --- 4. Handle New Jargon Term (if applicable) ---
    if (isNewJargonTerm) {
      console.log(`Creating new jargon term: "${customJargonTerm}"`)
      
      // Validate required fields for new term
      if (!customAmount || Number.isNaN(customAmount) || customAmount <= 0) {
        console.error('Invalid charge amount for new term:', customAmount)
        const errors: { [key: string]: string } = {}
        errors[amountBlockId] = 'Please enter a valid amount for the new jargon term.'
        return NextResponse.json({ response_action: 'errors', errors })
      }
      
      // Fetch the charging user's DB ID for created_by field
      const { data: chargingUser, error: chargingUserError } = await supabaseServiceRole
        .from('users')
        .select('id')
        .eq('slack_id', chargingUserSlackId)
        .eq('workspace_id', workspaceId)
        .single()
        
      if (chargingUserError || !chargingUser) {
        console.error(`Error fetching charging user ID for Slack ID ${chargingUserSlackId}:`, chargingUserError)
        return NextResponse.json({ error: 'Could not identify charging user' }, { status: 500 })
      }
      
      // Create the new jargon term
      const { data: newJargonTerm, error: createJargonError } = await supabaseServiceRole
        .from('jargon_terms')
        .insert({
          term: customJargonTerm,
          description: descriptionText || 'No description provided',
          default_cost: customAmount,
          created_by: chargingUser.id,
          workspace_id: workspaceId
        })
        .select('id')
        .single()
        
      if (createJargonError || !newJargonTerm) {
        console.error('Error creating new jargon term:', createJargonError)
        return NextResponse.json({ error: 'Failed to create new jargon term' }, { status: 500 })
      }
      
      // Use the newly created jargon term ID
      jargonTermId = newJargonTerm.id
      console.log(`Created new jargon term with ID: ${jargonTermId}`)
    }

    // --- 5. Determine Charge Amount ---
    let chargeAmount = customAmount
    if (!isNewJargonTerm && (chargeAmount === null || Number.isNaN(chargeAmount))) {
        // Fetch default cost for existing term
        const { data: jargonTerm, error: termError } = await supabaseServiceRole
            .from('jargon_terms')
            .select('default_cost, term')
            .eq('id', jargonTermId)
            .single()

        if (termError || !jargonTerm) {
            console.error(`Error fetching jargon term ${jargonTermId}:`, termError)
            return NextResponse.json({ error: 'Could not fetch jargon term details' }, { status: 500 })
        }
        
        // Ensure default_cost is treated as a number
        const defaultCost = typeof jargonTerm.default_cost === 'string'
                           ? Number.parseFloat(jargonTerm.default_cost)
                           : jargonTerm.default_cost;

        chargeAmount = defaultCost;
        console.log(`Using default cost ${chargeAmount} for term "${jargonTerm.term}"`)
    }

    if (chargeAmount === null || Number.isNaN(chargeAmount) || chargeAmount < 0) {
        console.error('Invalid charge amount determined:', chargeAmount)
        const errors = { [amountBlockId]: 'Invalid charge amount.' }
        return NextResponse.json({ response_action: 'errors', errors })
    }

    // --- 6. Fetch User DB IDs ---
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
        return NextResponse.json({ error: 'Could not identify users involved in the charge.' }, { status: 400 });
    }

    // --- 7. Create Charge Record in Supabase ---
    // For manual charges, use the current timestamp as message_ts
    const currentTimestamp = Math.floor(Date.now() / 1000).toString();
    
    const { data: chargeData, error: insertError } = await supabaseServiceRole
      .from('charges')
      .insert({
        charged_user_id: chargedDbUserId, // Use DB UUID
        charging_user_id: chargingDbUserId, // Use DB UUID
        jargon_term_id: jargonTermId, // DB UUID from modal value or newly created term
        amount: chargeAmount,
        channel_id: channelId, // Slack Channel ID
        workspace_id: workspaceId, // DB UUID
        is_automatic: false,
        message_text: descriptionText || 'No description provided', // Add the description text
        message_ts: currentTimestamp, // Add a timestamp for manual charges
      })
      .select('id') // Optionally select the new charge ID
      .single()

    if (insertError) {
      console.error('Error inserting charge into database:', insertError)
      return NextResponse.json({ error: 'Failed to record charge' }, { status: 500 })
    }

    console.log('Charge successfully recorded with ID:', chargeData?.id);

    // --- 8. Post Confirmation Message to Slack ---
    try {
      // Fetch Jargon term text
      const { data: termData, error: termFetchError } = await supabaseServiceRole
        .from('jargon_terms')
        .select('term')
        .eq('id', jargonTermId)
        .single()

      if (termFetchError || !termData) {
          console.error(`Error fetching jargon term text for ${jargonTermId}:`, termFetchError);
          // Proceed without term text if fetch fails
      }
      const jargonText = termData?.term ?? (isNewJargonTerm ? customJargonTerm : 'an unspecified term')

      // Create a message with the description if provided
      let confirmationText = `:dollar: <@${chargingUserSlackId}> just charged <@${selectedUserSlackId}> $${chargeAmount.toFixed(2)} for using "${jargonText}"!`;
      
      // Add special notice if this was a new term
      if (isNewJargonTerm) {
        confirmationText += '\n:new: _New jargon term added to the dictionary!_';
      }
      
      // Add the description if provided
      if (descriptionText?.trim()) {
        confirmationText += `\n>_"${descriptionText.trim()}"_`;
      }
      
      // Add a closing line
      confirmationText += "\n:money_with_wings: Add it to the jar!";

      await slackWebClient.chat.postMessage({
        channel: channelId,
        text: confirmationText,
      })
      console.log(`Confirmation message sent to channel ${channelId}`)
    } catch (slackError) {
      console.error('Error sending Slack confirmation message:', slackError)
      // Log error but don't fail the interaction if DB insert succeeded
    }

    // --- 9. Acknowledge the interaction ---
    // Return empty 200 OK to close the modal and confirm receipt
    return NextResponse.json({})

  } catch (error) {
    console.error('Unhandled error in handleModalSubmission:', error)
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}

async function handleBlockActions(payload: BlockActionsPayload) {
  // Extract the action that was performed
  const actions = payload.actions || []
  if (actions.length === 0) {
    return NextResponse.json({})
  }

  // Only focus on jargon select actions
  const action = actions[0]
  const actionId = action.action_id
  
  // We're only interested in jargon selection to update other fields
  if (actionId !== 'jargon_select') {
    // For any other actions, just acknowledge without doing anything
    return NextResponse.json({})
  }
  
  try {
    // Extract necessary data
    const teamId = payload.team.id
    const viewId = payload.view.id
    const selectedValue = action.selected_option?.value
    
    if (!selectedValue) {
      console.log('No jargon selected, not updating other fields')
      return NextResponse.json({})
    }

    // Check if this is a new term selection
    const isNewTerm = selectedValue === 'new_term'
    
    // Ensure required env vars are present
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Missing Supabase URL or Service Role Key')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    
    // Create service role client and get workspace info
    const supabaseServiceRole = createClient(supabaseUrl, supabaseServiceRoleKey)
    
    const { data: workspace, error: workspaceError } = await supabaseServiceRole
      .from('workspaces')
      .select('bot_token')
      .eq('slack_id', teamId)
      .single()
      
    if (workspaceError || !workspace || !workspace.bot_token) {
      console.error(`Error fetching workspace or bot token for team ${teamId}:`, workspaceError)
      return NextResponse.json({ error: 'Could not retrieve workspace info' }, { status: 500 })
    }

    const botToken = workspace.bot_token
    const slackWebClient = new WebClient(botToken)
    
    // Keep user and jargon select blocks
    const initialBlocks = payload.view.blocks.slice(0, 2) as SlackBlock[]
    
    let updatedBlocks: SlackBlock[] = []

    if (isNewTerm) {
      // Show fields for new term creation
      updatedBlocks = [
        ...initialBlocks,
        {
          type: 'input',
          block_id: 'custom_jargon_block',
          element: {
            type: 'plain_text_input',
            action_id: 'custom_jargon_input',
            placeholder: {
              type: 'plain_text',
              text: 'Enter the new jargon term',
              emoji: true
            }
          },
          label: {
            type: 'plain_text',
            text: 'New Jargon Term',
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
              text: 'Enter amount (e.g., 1.00)',
              emoji: true
            }
          },
          label: {
            type: 'plain_text',
            text: 'Amount',
            emoji: true
          }
        },
        {
          type: 'input',
          block_id: 'description_block',
          element: {
            type: 'plain_text_input',
            action_id: 'description_input',
            placeholder: {
              type: 'plain_text',
              text: 'Enter a description for this term',
              emoji: true
            },
            multiline: true
          },
          label: {
            type: 'plain_text',
            text: 'Description',
            emoji: true
          }
        }
      ]
    } else {
      // Get jargon term details for existing term
      const { data: jargonTerm, error: jargonError } = await supabaseServiceRole
        .from('jargon_terms')
        .select('term, description, default_cost')
        .eq('id', selectedValue)
        .single()
        
      if (jargonError || !jargonTerm) {
        console.error(`Error fetching jargon term ${selectedValue}:`, jargonError)
        return NextResponse.json({ error: 'Could not fetch jargon details' }, { status: 500 })
      }

      updatedBlocks = [
        ...initialBlocks,
        // Show read-only fields for existing term
        {
          type: 'section',
          block_id: 'amount_block',
          text: {
            type: 'mrkdwn',
            text: `*Amount:* $${jargonTerm.default_cost.toFixed(2)}`
          }
        },
        {
          type: 'section',
          block_id: 'description_block',
          text: {
            type: 'mrkdwn',
            text: `*Description:*\n${jargonTerm.description || '_No description available_'}`
          }
        },
        // Add hidden input for amount to ensure it's included in submission
        {
          type: 'input',
          block_id: 'hidden_amount_block',
          optional: true,
          element: {
            type: 'plain_text_input',
            action_id: 'amount_input',
            initial_value: jargonTerm.default_cost.toString()
          },
          label: {
            type: 'plain_text',
            text: 'Amount',
            emoji: true
          }
        }
      ]
    }
    
    // Update the view
    await slackWebClient.views.update({
      view_id: viewId,
      hash: payload.view.hash,
      view: {
        type: 'modal',
        callback_id: payload.view.callback_id,
        title: payload.view.title,
        submit: payload.view.submit,
        close: payload.view.close,
        private_metadata: payload.view.private_metadata,
        blocks: updatedBlocks
      }
    })
    
    return NextResponse.json({})
  } catch (error) {
    console.error('Error handling block actions:', error)
    return NextResponse.json({})
  }
}

async function handleOptionsLoad(payload: OptionsLoadPayload) {
  try {
    if (payload.action_id !== 'jargon_select') {
      return NextResponse.json({ options: [] })
    }

    const searchTerm = payload.value.toLowerCase()
    const teamId = payload.team.id

    // Get workspace ID from team ID
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Missing Supabase URL or Service Role Key')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabaseServiceRole = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Get workspace ID
    const { data: workspace, error: workspaceError } = await supabaseServiceRole
      .from('workspaces')
      .select('id')
      .eq('slack_id', teamId)
      .single()

    if (workspaceError || !workspace) {
      console.error('Error fetching workspace:', workspaceError)
      return NextResponse.json({ options: [] })
    }

    // Search jargon terms
    const { data: jargonTerms, error: jargonError } = await supabaseServiceRole
      .from('jargon_terms')
      .select('id, term, default_cost')
      .or(`workspace_id.eq.${workspace.id},workspace_id.is.null`)
      .ilike('term', `%${searchTerm}%`)
      .order('term')

    if (jargonError) {
      console.error('Error searching jargon terms:', jargonError)
      return NextResponse.json({ options: [] })
    }

    // Format options
    const options = [
      ...jargonTerms.map(term => ({
        text: {
          type: 'plain_text' as const,
          text: `${term.term} ($${term.default_cost})`,
          emoji: true
        },
        value: term.id
      }))
    ]

    // Always add the "Add new term" option
    options.push({
      text: {
        type: 'plain_text' as const,
        text: '➕ Add new term',
        emoji: true
      },
      value: 'new_term'
    })

    return NextResponse.json({ options })
  } catch (error) {
    console.error('Error handling options load:', error)
    return NextResponse.json({ options: [] })
  }
} 