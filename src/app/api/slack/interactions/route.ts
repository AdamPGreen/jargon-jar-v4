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

interface JargonTerm {
  id: string;
  term: string;
  description: string;
  default_cost: number;
}

interface ModalMetadata {
  jargon_terms: JargonTerm[];
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

  // Get Supabase URLs ready for use in both branches
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Missing Supabase URL or Service Role Key')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  // Create Supabase admin client for both branches
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false }
  })

  // Handle Add Jargon modal submission
  if (payload.view.callback_id === 'add_jargon_modal') {
    try {
      console.log('Processing Add Jargon modal submission')
      
      // Parse metadata
      const metadata = JSON.parse(payload.view.private_metadata || '{}')
      const { workspace_id: workspaceDbId, channel_id: channelId, original_view_id: originalViewId } = metadata
      
      if (!workspaceDbId || !channelId) {
        console.error('Missing required metadata:', { workspaceDbId, channelId })
        return NextResponse.json({
          response_action: 'errors',
          errors: {
            term_block: 'Something went wrong. Please try again.'
          }
        })
      }
      
      // Extract form values
      const termBlockId = 'term_block'
      const termActionId = 'term_input'
      const descriptionBlockId = 'description_block'
      const descriptionActionId = 'description_input'
      const costBlockId = 'cost_block'
      const costActionId = 'cost_input'
      
      const term = payload.view.state.values[termBlockId]?.[termActionId]?.value
      const description = payload.view.state.values[descriptionBlockId]?.[descriptionActionId]?.value
      const costStr = payload.view.state.values[costBlockId]?.[costActionId]?.value
      
      // Validate inputs
      if (!term) {
        return NextResponse.json({
          response_action: 'errors',
          errors: {
            [termBlockId]: 'Please enter a jargon term'
          }
        })
      }
      
      const defaultCost = Number.parseFloat(costStr || '1.00')
      if (Number.isNaN(defaultCost) || defaultCost <= 0) {
        return NextResponse.json({
          response_action: 'errors',
          errors: {
            [costBlockId]: 'Please enter a valid positive amount'
          }
        })
      }
      
      // Get the user who's adding the term
      const createdBySlackId = payload.user.id
      
      // Get user's DB ID
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('slack_id', createdBySlackId)
        .eq('workspace_id', workspaceDbId)
        .single()
      
      if (userError) {
        console.error('Error fetching user:', userError)
        return NextResponse.json({ error: 'Failed to identify user' }, { status: 500 })
      }
      
      const createdById = userData?.id
      
      // Create the new jargon term
      const { data: jargonData, error: jargonError } = await supabaseAdmin
        .from('jargon_terms')
        .insert({
          term,
          description: description || null,
          default_cost: defaultCost,
          created_by: createdById,
          workspace_id: workspaceDbId
        })
        .select('id, term')
        .single()
      
      if (jargonError) {
        console.error('Error creating jargon term:', jargonError)
        return NextResponse.json({ error: 'Failed to create jargon term' }, { status: 500 })
      }
      
      // Fetch workspace bot token to send confirmation
      const { data: workspace, error: workspaceError } = await supabaseAdmin
        .from('workspaces')
        .select('bot_token, slack_id')
        .eq('id', workspaceDbId)
        .single()
      
      if (workspaceError || !workspace?.bot_token) {
        console.error('Error fetching workspace:', workspaceError)
        // Continue anyway since term was created
      }
      
      if (workspace?.bot_token) {
        // Send a confirmation message
        const slackClient = new WebClient(workspace.bot_token)
        
        try {
          await slackClient.chat.postMessage({
            channel: channelId,
            text: `:tada: <@${createdBySlackId}> just added a new jargon term: *${term}* (Default cost: $${defaultCost.toFixed(2)})`
          })
          console.log('Confirmation message sent for new jargon')
        } catch (slackError) {
          console.error('Error sending confirmation message:', slackError)
          // Continue anyway
        }
      }
      
      console.log('Successfully added new jargon term:', jargonData?.term)
      
      // Return confirmation to close the modal
      return NextResponse.json({})
    } catch (error) {
      console.error('Error handling Add Jargon modal submission:', error)
      return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
    }
  }
  
  // Handle Charge modal submission - existing code
  if (payload.view.callback_id === 'charge_modal') {
    try {
      // --- 1. Parse metadata and state ---
      console.log('Processing payload values:', JSON.stringify(payload.view.state.values, null, 2))
      
      const metadata = JSON.parse(payload.view.private_metadata || '{}')
      const { channel_id: channelId } = metadata
      
      // Extract form values - adjust to match block_ids and action_ids in the updated modal
      const userBlockId = 'user_block'
      const userActionId = 'user_select'
      const jargonBlockId = 'jargon_block'
      const jargonActionId = 'jargon_select'
      const amountBlockId = 'amount_block' // Updated to match our new structure
      const amountActionId = 'charge_amount' // Updated to match our new structure
      
      console.log('Extracting from state:', JSON.stringify({
        userBlock: payload.view.state.values[userBlockId],
        jargonBlock: payload.view.state.values[jargonBlockId],
        amountBlock: payload.view.state.values[amountBlockId]
      }, null, 2))
      
      // Extract values safely
      const chargedUserId = payload.view.state.values[userBlockId]?.[userActionId]?.selected_user
      const jargonTermId = payload.view.state.values[jargonBlockId]?.[jargonActionId]?.selected_option?.value
      const chargeAmountStr = payload.view.state.values[amountBlockId]?.[amountActionId]?.value
      
      if (!chargedUserId || !jargonTermId || !chargeAmountStr) {
        console.error('Missing required fields:', { chargedUserId, jargonTermId, chargeAmountStr })
        return NextResponse.json({
          response_action: 'errors',
          errors: {
            ...(chargedUserId ? {} : { [userBlockId]: 'Please select a user' }),
            ...(jargonTermId ? {} : { [jargonBlockId]: 'Please select a jargon term' }),
            ...(chargeAmountStr ? {} : { [amountBlockId]: 'Please enter an amount' })
          }
        })
      }
      
      const chargeAmount = Number.parseFloat(chargeAmountStr)
      if (Number.isNaN(chargeAmount) || chargeAmount <= 0) {
        console.error('Invalid charge amount:', chargeAmountStr)
        return NextResponse.json({
          response_action: 'errors',
          errors: {
            [amountBlockId]: 'Please enter a valid positive amount'
          }
        })
      }
      
      // --- 2. Get workspace information ---
      const workspaceId = payload.team.id
      const chargingUserId = payload.user.id
      
      const { data: workspace, error: workspaceError } = await supabaseAdmin
        .from('workspaces')
        .select('id, bot_token')
        .eq('slack_id', workspaceId)
        .single()
      
      if (workspaceError || !workspace || !workspace.bot_token) {
        console.error('Error fetching workspace:', workspaceError)
        return NextResponse.json({ error: 'Workspace not found' }, { status: 500 })
      }
      
      // --- 3. Fetch Workspace/Bot Token ---
      const botToken = workspace.bot_token
      const workspaceIdDB = workspace.id // DB UUID
      const slackWebClient = new WebClient(botToken)

      // --- 4. Fetch User DB IDs ---
      // Fetch the internal DB UUIDs for the users based on their Slack IDs
      const fetchUserDbId = async (slackId: string): Promise<string | null> => {
          // First try to find the user in the database
          const { data: userData, error: userError } = await supabaseAdmin
              .from('users')
              .select('id')
              .eq('slack_id', slackId)
              .eq('workspace_id', workspaceIdDB) // Ensure user belongs to the correct workspace
              .single();
          
          // If user exists, return their ID
          if (userData?.id) {
              return userData.id;
          }
          
          // If user doesn't exist, fetch their info from Slack and create a new user
          if (userError && userError.code === 'PGRST116') {
              console.log(`User with Slack ID ${slackId} not found in database. Fetching from Slack and creating...`);
              
              try {
                  // Fetch user info from Slack
                  const userInfo = await slackWebClient.users.info({
                      user: slackId
                  });
                  
                  if (!userInfo.ok || !userInfo.user) {
                      console.error(`Failed to fetch user info from Slack for ID ${slackId}:`, userInfo.error);
                      return null;
                  }
                  
                  const slackUser = userInfo.user;
                  
                  // Create a new user in the database
                  const { data: newUser, error: createError } = await supabaseAdmin
                      .from('users')
                      .insert({
                          slack_id: slackId,
                          workspace_id: workspaceIdDB,
                          display_name: slackUser.real_name || slackUser.name || 'Unknown User',
                          email: slackUser.profile?.email || null,
                          avatar_url: slackUser.profile?.image_192 || null
                      })
                      .select('id')
                      .single();
                  
                  if (createError) {
                      console.error(`Error creating user for Slack ID ${slackId}:`, createError);
                      return null;
                  }
                  
                  console.log(`Created new user in database for Slack ID ${slackId}:`, newUser?.id);
                  return newUser?.id || null;
              } catch (slackError) {
                  console.error(`Error fetching user info from Slack for ID ${slackId}:`, slackError);
                  return null;
              }
          }
          
          // For other errors, log and return null
          console.error(`Error fetching user DB ID for Slack ID ${slackId} in workspace ${workspaceIdDB}:`, userError);
          return null;
      };

      const [chargedDbUserId, chargingDbUserId] = await Promise.all([
          fetchUserDbId(chargedUserId),
          fetchUserDbId(chargingUserId)
      ]);

      if (!chargedDbUserId || !chargingDbUserId) {
          console.error('Could not find database entries for one or both users:', { chargedUserId, chargingUserId, chargedDbUserId, chargingDbUserId });
          
          // Create a more user-friendly error message
          let errorMessage = 'Unable to complete the charge. ';
          
          if (!chargedDbUserId) {
              errorMessage += `The user <@${chargedUserId}> could not be found in our system. `;
          }
          
          if (!chargingDbUserId) {
              errorMessage += 'Your account could not be found in our system. ';
          }
          
          errorMessage += 'Please try again later or contact an administrator.';
          
          // Send an ephemeral message to the user
          try {
              await slackWebClient.chat.postEphemeral({
                  channel: channelId,
                  user: chargingUserId,
                  text: errorMessage
              });
          } catch (slackError) {
              console.error('Error sending error message to user:', slackError);
          }
          
          return NextResponse.json({ error: 'Could not identify users involved in the charge.' }, { status: 400 });
      }

      // --- 5. Create Charge Record in Supabase ---
      // For manual charges, use the current timestamp as message_ts
      const currentTimestamp = Math.floor(Date.now() / 1000).toString();
      
      const { data: chargeData, error: insertError } = await supabaseAdmin
        .from('charges')
        .insert({
          charged_user_id: chargedDbUserId, // DB UUID
          charging_user_id: chargingDbUserId, // DB UUID
          jargon_term_id: jargonTermId, // DB UUID
          amount: chargeAmount,
          channel_id: channelId, // Slack Channel ID
          workspace_id: workspaceIdDB, // DB UUID
          is_automatic: false,
          message_text: '', // No message text for manual charges
          message_ts: currentTimestamp // Use current timestamp as message_ts
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Error creating charge record:', insertError);
        return NextResponse.json({ error: 'Failed to record charge' }, { status: 500 });
      }

      console.log('Charge successfully recorded with ID:', chargeData?.id);

      // --- 6. Post Confirmation Message to Slack ---
      try {
        // Fetch Jargon term text
        const { data: termData, error: termFetchError } = await supabaseAdmin
          .from('jargon_terms')
          .select('term')
          .eq('id', jargonTermId)
          .single();

        if (termFetchError || !termData) {
          console.error('Error fetching jargon term text:', termFetchError);
          // Continue anyway, just use the ID in the message
        }

        const jargonText = termData?.term || 'unknown jargon';

        // Create a simple confirmation message
        let confirmationText = `:dollar: <@${chargingUserId}> just charged <@${chargedUserId}> $${chargeAmount.toFixed(2)} for using "${jargonText}"!`;
        
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

      // --- 7. Acknowledge the interaction ---
      // Return empty 200 OK to close the modal and confirm receipt
      return NextResponse.json({})

    } catch (error) {
      console.error('Unhandled error in handleModalSubmission:', error)
      return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
    }
  }

  return NextResponse.json({})
}

async function handleBlockActions(payload: BlockActionsPayload) {
  try {
    const action = payload.actions[0]
    if (!action) {
      return new Response(JSON.stringify({ error: 'No action provided' }))
    }

    // Handle jargon selection
    if (action.action_id === 'jargon_select') {
      const selectedValue = action.selected_option?.value
      if (!selectedValue) return new Response(JSON.stringify({}))

      // If "Add new term" was selected, show the new term form
      if (selectedValue === 'new_term') {
        const updatedBlocks = [
          ...payload.view.blocks.slice(0, 2), // Keep user and jargon blocks
          {
            type: 'input',
            block_id: 'new_term_block',
            element: {
              type: 'plain_text_input',
              action_id: 'new_term_input',
              placeholder: {
                type: 'plain_text',
                text: 'Enter new jargon term',
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
            block_id: 'new_cost_block',
            element: {
              type: 'plain_text_input',
              action_id: 'new_cost_input',
              input_type: 'number',
              placeholder: {
                type: 'plain_text',
                text: 'Enter cost amount',
                emoji: true
              }
            },
            label: {
              type: 'plain_text',
              text: 'Cost Amount',
              emoji: true
            }
          },
          {
            type: 'input',
            block_id: 'new_description_block',
            element: {
              type: 'plain_text_input',
              action_id: 'new_description_input',
              multiline: true,
              placeholder: {
                type: 'plain_text',
                text: 'Enter description',
                emoji: true
              }
            },
            label: {
              type: 'plain_text',
              text: 'Description',
              emoji: true
            }
          }
        ]

        return new Response(JSON.stringify({
          response_action: 'update',
          view: {
            type: 'modal',
            callback_id: 'charge_modal',
            title: payload.view.title,
            submit: payload.view.submit,
            close: payload.view.close,
            blocks: updatedBlocks,
            private_metadata: payload.view.private_metadata
          }
        }))
      }

      // For existing terms, fetch the description and show it
      const supabaseServiceRole = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
        process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
      )

      // Fetch the workspace's bot_token
      const metadata = JSON.parse(payload.view.private_metadata || '{}')
      const workspaceId = payload.team.id || metadata.workspace_id
      
      if (!workspaceId) {
        console.error('No workspace ID found in payload or metadata')
        return NextResponse.json({ error: 'Missing workspace ID' }, { status: 400 })
      }
      
      const { data: workspace, error: workspaceError } = await supabaseServiceRole
        .from('workspaces')
        .select('bot_token')
        .eq('slack_id', workspaceId)
        .single()
        
      if (workspaceError || !workspace?.bot_token) {
        console.error('Error fetching workspace token:', workspaceError)
        return NextResponse.json({ error: 'Failed to fetch workspace token' }, { status: 500 })
      }
      
      // Create a Slack client with the bot token
      const slackClient = new WebClient(workspace.bot_token)

      // Fetch the selected jargon term details
      const { data: term, error: termError } = await supabaseServiceRole
        .from('jargon_terms')
        .select('description, default_cost')
        .eq('id', selectedValue)
        .single()

      if (termError) {
        console.error('Error fetching term details:', termError)
        return NextResponse.json({ error: 'Failed to fetch term details' }, { status: 500 })
      }

      // Keep existing blocks (user selector and jargon selector)
      // We need to slice the blocks to preserve the user selection and the jargon selection
      // The first two blocks are typically the user select and jargon select
      const basicBlocks = payload.view.blocks.slice(0, 2)
      
      // Extract the current selected user from state if available
      const selectedUserId = payload.view.state?.values?.user_block?.user_select?.selected_user
      
      // Create updated blocks array
      const updatedBlocks = [
        ...basicBlocks,
      ]
      
      // Add cost input block with the default cost
      updatedBlocks.push({
        type: 'input',
        block_id: 'amount_block',
        element: {
          type: 'plain_text_input',
          action_id: 'charge_amount',
          initial_value: term.default_cost.toString(),
          placeholder: {
            type: 'plain_text',
            text: 'Enter charge amount',
            emoji: true
          }
        },
        label: {
          type: 'plain_text',
          text: 'Charge Amount ($)',
          emoji: true
        }
      })
      
      // Only add description block if there is one
      if (term.description) {
        updatedBlocks.push({
          type: 'section',
          block_id: 'description_block',
          text: {
            type: 'mrkdwn',
            text: `*Description:*\n${term.description}`
          }
        })
      }

      // Add the actions block with the "Add New Jargon" button back
      // This assumes the actions block is the 3rd block in the original view
      if (payload.view.blocks.length > 2 && payload.view.blocks[2].type === 'actions') {
        updatedBlocks.push(payload.view.blocks[2])
      }

      // Log the updated blocks for debugging
      console.log('Updating modal with blocks:', JSON.stringify(updatedBlocks, null, 2))

      try {
        // Call views.update API to update the modal
        const updateResult = await slackClient.views.update({
          view_id: payload.view.id,
          view: {
            type: 'modal',
            callback_id: 'charge_modal',
            title: payload.view.title,
            submit: payload.view.submit,
            close: payload.view.close,
            blocks: updatedBlocks,
            private_metadata: payload.view.private_metadata
          }
        })
        
        console.log('Modal update response:', JSON.stringify(updateResult, null, 2))
        return NextResponse.json({})
      } catch (updateError) {
        console.error('Error updating view:', updateError)
        return NextResponse.json({ error: 'Failed to update view' }, { status: 500 })
      }
    }

    // Handle "Add New Jargon" button click
    if (action.action_id === 'add_new_jargon') {
      console.log('Add New Jargon button clicked')
      
      // Get the trigger ID from the payload
      const triggerId = payload.trigger_id
      if (!triggerId) {
        console.error('No trigger ID found in payload')
        return NextResponse.json({ error: 'Missing trigger ID' }, { status: 400 })
      }
      
      // Parse metadata to get workspace_id
      const metadata = JSON.parse(payload.view.private_metadata || '{}')
      const workspaceId = payload.team.id || metadata.workspace_id
      const channelId = metadata.channel_id
      
      if (!workspaceId) {
        console.error('No workspace ID found in payload or metadata')
        return NextResponse.json({ error: 'Missing workspace ID' }, { status: 400 })
      }
      
      // Fetch the bot token for the workspace
      const supabaseServiceRole = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
        process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
      )
      
      const { data: workspace, error: workspaceError } = await supabaseServiceRole
        .from('workspaces')
        .select('id, bot_token')
        .eq('slack_id', workspaceId)
        .single()
        
      if (workspaceError || !workspace?.bot_token) {
        console.error('Error fetching workspace token:', workspaceError)
        return NextResponse.json({ error: 'Failed to fetch workspace token' }, { status: 500 })
      }
      
      // Create a Slack client with the bot token
      const slackClient = new WebClient(workspace.bot_token)
      
      // Define the Add Jargon modal view
      const addJargonModalView = {
        type: 'modal' as const,
        callback_id: 'add_jargon_modal',
        title: {
          type: 'plain_text' as const,
          text: 'Add New Jargon Term',
          emoji: true
        },
        submit: {
          type: 'plain_text' as const,
          text: 'Add Term',
          emoji: true
        },
        close: {
          type: 'plain_text' as const,
          text: 'Cancel',
          emoji: true
        },
        blocks: [
          {
            type: 'input' as const,
            block_id: 'term_block',
            element: {
              type: 'plain_text_input' as const,
              action_id: 'term_input',
              placeholder: {
                type: 'plain_text' as const,
                text: 'e.g., Circle Back, Low-Hanging Fruit',
                emoji: true
              }
            },
            label: {
              type: 'plain_text' as const,
              text: 'Jargon Term',
              emoji: true
            }
          },
          {
            type: 'input' as const,
            block_id: 'description_block',
            element: {
              type: 'plain_text_input' as const,
              action_id: 'description_input',
              multiline: true,
              placeholder: {
                type: 'plain_text' as const,
                text: 'What does this jargon term mean?',
                emoji: true
              }
            },
            label: {
              type: 'plain_text' as const,
              text: 'Description',
              emoji: true
            }
          },
          {
            type: 'input' as const,
            block_id: 'cost_block',
            element: {
              type: 'plain_text_input' as const,
              action_id: 'cost_input',
              placeholder: {
                type: 'plain_text' as const,
                text: 'Default amount to charge',
                emoji: true
              },
              initial_value: '1.00'
            },
            label: {
              type: 'plain_text' as const,
              text: 'Default Cost ($)',
              emoji: true
            }
          }
        ],
        private_metadata: JSON.stringify({
          channel_id: channelId,
          workspace_id: workspace.id,
          original_view_id: payload.view.id
        })
      }
      
      try {
        // Push the new modal view
        console.log('Pushing Add Jargon modal')
        const result = await slackClient.views.push({
          trigger_id: triggerId,
          view: addJargonModalView
        })
        
        console.log('Add Jargon modal pushed successfully')
        return NextResponse.json({})
      } catch (error) {
        console.error('Error pushing Add Jargon modal:', error)
        return NextResponse.json({ error: 'Failed to push Add Jargon modal' }, { status: 500 })
      }
    }

    return NextResponse.json({})
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

    const options = jargonTerms.map(term => ({
      text: {
        type: 'plain_text',
        text: term.term,
        emoji: true
      },
      value: term.id
    }))

    return NextResponse.json({ options })
  } catch (error) {
    console.error('Error handling options load:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}