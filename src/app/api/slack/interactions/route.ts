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
  try {
    const actionId = payload.actions[0].action_id

    if (actionId === 'jargon_select') {
      const selectedJargonId = payload.actions[0].selected_option.value
      const metadata = JSON.parse(payload.view.private_metadata)
      const selectedTerm = metadata.jargon_terms.find((term: any) => term.id === selectedJargonId)

      if (!selectedTerm) {
        return new Response(JSON.stringify({ error: 'Term not found' }))
      }

      // Update the blocks to include description and pre-populate amount
      const updatedBlocks = [
        ...payload.view.blocks.slice(0, 2), // Keep user and jargon select blocks
        {
          type: 'section',
          block_id: 'description_block',
          text: {
            type: 'mrkdwn',
            text: `*Description:* ${selectedTerm.description}`
          }
        },
        {
          type: 'input',
          block_id: 'amount_block',
          element: {
            type: 'plain_text_input',
            action_id: 'amount_input',
            initial_value: selectedTerm.default_cost.toString(),
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
        }
      ]

      return new Response(JSON.stringify({
        response_action: 'update',
        view: {
          ...payload.view,
          blocks: updatedBlocks
        }
      }))
    } else if (actionId === 'add_new_jargon') {
      // Open new modal for jargon creation
      const newJargonModal = {
        type: 'modal',
        callback_id: 'new_jargon_modal',
        title: {
          type: 'plain_text',
          text: 'Add New Jargon',
          emoji: true
        },
        submit: {
          type: 'plain_text',
          text: 'Create & Charge',
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
            block_id: 'term_block',
            element: {
              type: 'plain_text_input',
              action_id: 'term_input',
              placeholder: {
                type: 'plain_text',
                text: 'Enter the jargon term',
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
            block_id: 'description_block',
            element: {
              type: 'plain_text_input',
              action_id: 'description_input',
              multiline: true,
              placeholder: {
                type: 'plain_text',
                text: 'Enter a description of this term',
                emoji: true
              }
            },
            label: {
              type: 'plain_text',
              text: 'Description',
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
          }
        ],
        private_metadata: payload.view.private_metadata // Preserve metadata from original modal
      }

      return new Response(JSON.stringify({
        response_action: 'push',
        view: newJargonModal
      }))
    }

    return new Response(JSON.stringify({}))
  } catch (error) {
    console.error('Error handling block actions:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
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

async function handleViewSubmission(payload: any) {
  try {
    if (payload.view.callback_id === 'new_jargon_modal') {
      // Handle new jargon creation
      const values = payload.view.state.values
      const term = values.term_block.term_input.value
      const description = values.description_block.description_input.value
      const amount = values.amount_block.amount_input.value
      const userId = values.user_block.user_select.selected_user

      // Create new jargon term
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { data: newTerm, error: termError } = await supabase
        .from('jargon_terms')
        .insert({
          term,
          description,
          default_cost: amount,
          created_by: payload.user.id,
          workspace_id: payload.team.id
        })
        .select()
        .single()

      if (termError) {
        return new Response(JSON.stringify({
          response_action: 'errors',
          errors: {
            term_block: `Failed to create jargon term: ${termError.message}`
          }
        }))
      }

      // Create charge
      const { error: chargeError } = await supabase
        .from('charges')
        .insert({
          charged_user_id: userId,
          charging_user_id: payload.user.id,
          jargon_term_id: newTerm.id,
          amount,
          workspace_id: payload.team.id
        })

      if (chargeError) {
        return new Response(JSON.stringify({
          response_action: 'errors',
          errors: {
            term_block: `Failed to create charge: ${chargeError.message}`
          }
        }))
      }

      return new Response(JSON.stringify({
        response_action: 'clear'
      }))
    }

    return new Response(JSON.stringify({}))
  } catch (error) {
    console.error('Error handling view submission:', error)
    return new Response(JSON.stringify({
      response_action: 'errors',
      errors: {
        term_block: 'Failed to create jargon term. Please try again.'
      }
    }))
  }
} 