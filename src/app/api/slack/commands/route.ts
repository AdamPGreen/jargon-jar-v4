import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { WebClient } from '@slack/web-api'
import crypto from 'node:crypto'
import { SupabaseClient } from '@supabase/supabase-js'
import { ModalView } from '@slack/web-api'

// Database types
interface Workspace {
  id: string;
  bot_token: string;
}

interface JargonTerm {
  id: string;
  term: string;
  default_cost: number;
  description: string | null;
}

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
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(mySignature),
      Buffer.from(signature)
    )
  } catch (error) {
    console.error('Error verifying signature:', error)
    return false
  }
}

export async function POST(req: Request) {
  try {
    // Get the raw body for signature verification
    const body = await req.text()
    
    // Verify the request is from Slack
    if (!verifySlackRequest(req, body)) {
      return NextResponse.json({ error: 'Invalid request signature' }, { status: 401 })
    }
    
    const formData = new URLSearchParams(body)
    
    const command = formData.get('command')
    const text = formData.get('text') || ''
    const triggerId = formData.get('trigger_id')
    const channelId = formData.get('channel_id')
    const teamId = formData.get('team_id')
    const userId = formData.get('user_id')
    
    if (!command || !triggerId || !channelId || !teamId || !userId) {
      return new Response('Missing required fields', { status: 400 })
    }

    // Parse the subcommand from the text
    const args = text.trim().split(/\s+/)
    const subcommand = args[0].toLowerCase() || 'help' // Default to help if no subcommand
    const subcommandArgs = args.slice(1).join(' ')
    
    // Create Supabase client with service role
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
    
    // Create Slack client with the workspace's bot token
    const slack = new WebClient(workspace.bot_token)

    // Route to the appropriate handler based on the subcommand
    switch (subcommand) {
      case 'charge':
        return await handleChargeCommand({
          slack,
          supabase,
          workspace,
          triggerId,
          channelId,
          teamId,
          userId,
          args: subcommandArgs
        })
      
      case 'new':
      case 'add-term':
      case 'addterm':
        return await handleAddTermCommand({
          slack,
          supabase,
          workspace,
          triggerId,
          channelId,
          teamId,
          userId,
          args: subcommandArgs
        })
      
      case 'help':
        return await handleHelpCommand({
          slack,
          channelId,
          userId,
          command
        })
      
      default:
        // Default to charge modal when no subcommand is provided
        return await handleChargeCommand({
          slack,
          supabase,
          workspace,
          triggerId,
          channelId,
          teamId,
          userId,
          args: subcommandArgs
        })
    }
  } catch (error) {
    console.error('Error in jargon command handler:', error)
    return new Response('Internal server error', { status: 500 })
  }
}

// Handler for the 'charge' subcommand
async function handleChargeCommand({
  slack,
  supabase,
  workspace,
  triggerId,
  channelId,
  teamId,
  userId,
  args
}: {
  slack: WebClient,
  supabase: SupabaseClient,
  workspace: Workspace,
  triggerId: string,
  channelId: string,
  teamId: string,
  userId: string,
  args: string
}) {
  try {
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
    const jargonOptions = jargonTerms.map((term: JargonTerm) => ({
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

    const modalView: ModalView = {
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
          },
          dispatch_action: true
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
              action_id: 'add_new_jargon'
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
    const response = await slack.views.open({
      trigger_id: triggerId,
      view: modalView
    })
    
    if (!response.ok) {
      console.error('Error opening modal:', response)
      throw new Error(`Failed to open modal: ${response.error}`)
    }

    // Return an empty 200 OK response instead of the full result JSON
    // This prevents Slack from displaying the JSON in the channel
    return new Response('', { status: 200 })
  } catch (error) {
    console.error('Error in charge command handler:', error)
    return new Response('Error creating charge modal', { status: 500 })
  }
}

// Handler for the 'add-term' subcommand
async function handleAddTermCommand({
  slack,
  supabase,
  workspace,
  triggerId,
  channelId,
  teamId,
  userId,
  args
}: {
  slack: WebClient,
  supabase: SupabaseClient,
  workspace: Workspace,
  triggerId: string,
  channelId: string,
  teamId: string,
  userId: string,
  args: string
}) {
  try {
    // Define the Add Jargon modal view
    const addJargonModalView: ModalView = {
      type: 'modal',
      callback_id: 'add_jargon_modal',
      title: {
        type: 'plain_text',
        text: 'Add New Jargon Term',
        emoji: true
      },
      submit: {
        type: 'plain_text',
        text: 'Add Term',
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
          block_id: 'term_block',
          element: {
            type: 'plain_text_input',
            action_id: 'term_input',
            placeholder: {
              type: 'plain_text',
              text: 'e.g., Circle Back, Low-Hanging Fruit',
              emoji: true
            }
          },
          label: {
            type: 'plain_text',
            text: 'Jargon Term',
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
              text: 'What does this jargon term mean?',
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
          block_id: 'cost_block',
          element: {
            type: 'plain_text_input',
            action_id: 'cost_input',
            placeholder: {
              type: 'plain_text',
              text: 'Default amount to charge',
              emoji: true
            },
            initial_value: '1.00'
          },
          label: {
            type: 'plain_text',
            text: 'Default Cost ($)',
            emoji: true
          }
        }
      ],
      private_metadata: JSON.stringify({
        channel_id: channelId,
        workspace_id: workspace.id,
        direct_command: true
      })
    }
    
    // Open the modal directly
    const result = await slack.views.open({
      trigger_id: triggerId,
      view: addJargonModalView
    })
    
    // Return an empty 200 OK response
    return new Response('', { status: 200 })
  } catch (error) {
    console.error('Error in add-term command handler:', error)
    return new Response('Error creating add term modal', { status: 500 })
  }
}

// Handler for the 'help' subcommand
async function handleHelpCommand({
  slack,
  channelId,
  userId,
  command
}: {
  slack: WebClient,
  channelId: string,
  userId: string,
  command: string
}) {
  try {
    // Create a nicely formatted help message
    const helpBlocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: ':dollar: Jargon Jar Commands',
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Here are the available commands for Jargon Jar:'
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${command} charge*\nCharge someone for using corporate jargon. Opens a modal to select a user and jargon term.`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${command} new*\nAdd a new jargon term to the dictionary. Opens a modal to enter details.`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${command} help*\nShow this help message.`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: 'Need more help? Visit our documentation at https://jargon-jar-v4.vercel.app/help'
          }
        ]
      }
    ]

    // Send an ephemeral message (only visible to the user who triggered the command)
    await slack.chat.postEphemeral({
      channel: channelId,
      user: userId,
      blocks: helpBlocks,
      text: 'Jargon Jar Commands' // Fallback text
    })

    // Return an empty 200 OK response
    return new Response('', { status: 200 })
  } catch (error) {
    console.error('Error in help command handler:', error)
    return new Response('Error displaying help information', { status: 500 })
  }
} 