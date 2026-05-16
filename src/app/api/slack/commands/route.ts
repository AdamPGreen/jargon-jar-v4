import { WebClient, type ModalView } from "@slack/web-api"
import { NextResponse } from "next/server"
import { getWorkspaceBySlackTeamId, listJargonTerms } from "@/lib/db/queries"
import { verifySlackRequest } from "@/lib/slack/security"

export async function POST(request: Request) {
  const body = await request.text()
  if (!verifySlackRequest(request, body)) {
    return new Response("Invalid request signature", { status: 401 })
  }

  const formData = new URLSearchParams(body)
  const command = formData.get("command")
  const text = formData.get("text")?.trim() ?? ""
  const triggerId = formData.get("trigger_id")
  const channelId = formData.get("channel_id")
  const teamId = formData.get("team_id")
  const userId = formData.get("user_id")
  const threadTs = formData.get("thread_ts")

  if (!command || !triggerId || !channelId || !teamId || !userId) {
    return new Response("Missing required Slack command fields", { status: 400 })
  }

  const workspace = await getWorkspaceBySlackTeamId(teamId)
  if (!workspace?.installation?.botToken) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Jargon Jar is not installed for this workspace yet.",
    })
  }

  const [subcommand, ...args] = text.split(/\s+/)
  if (subcommand === "help") {
    return NextResponse.json({
      response_type: "ephemeral",
      text: `Use ${command} to charge someone for corporate jargon. Try ${command} charge or just ${command}.`,
    })
  }

  const slack = new WebClient(workspace.installation.botToken)
  const terms = await listJargonTerms(workspace.id)

  await slack.views.open({
    trigger_id: triggerId,
    view: buildChargeModal({
      workspaceId: workspace.id,
      channelId,
      chargingSlackUserId: userId,
      initialPhrase: args.join(" "),
      threadTs,
      terms,
    }),
  })

  return new Response("", { status: 200 })
}

function buildChargeModal(input: {
  workspaceId: string
  channelId: string
  chargingSlackUserId: string
  initialPhrase: string
  threadTs: string | null
  terms: Array<{
    id: string
    term: string
    defaultCost: string
  }>
}): ModalView {
  return {
    type: "modal",
    callback_id: "charge_modal",
    title: { type: "plain_text", text: "Jargon Jar" },
    submit: { type: "plain_text", text: "Charge" },
    close: { type: "plain_text", text: "Cancel" },
    private_metadata: JSON.stringify({
      workspace_id: input.workspaceId,
      channel_id: input.channelId,
      charging_slack_user_id: input.chargingSlackUserId,
      thread_ts: input.threadTs,
    }),
    blocks: [
      {
        type: "input",
        block_id: "charged_user",
        label: { type: "plain_text", text: "Who said it?" },
        element: {
          type: "users_select",
          action_id: "value",
          placeholder: { type: "plain_text", text: "Select a teammate" },
        },
      },
      {
        type: "input",
        block_id: "jargon_term",
        optional: true,
        label: { type: "plain_text", text: "Existing jargon term" },
        element: {
          type: "static_select",
          action_id: "value",
          placeholder: { type: "plain_text", text: "Pick a term" },
          options: [
            {
              text: { type: "plain_text", text: "Use custom term below" },
              value: "__custom__",
            },
            ...input.terms.slice(0, 99).map((term) => ({
              text: {
                type: "plain_text" as const,
                text: `${term.term} ($${Number(term.defaultCost).toFixed(2)})`,
              },
              value: term.id,
            })),
          ],
        },
      },
      {
        type: "input",
        block_id: "custom_term",
        optional: true,
        label: { type: "plain_text", text: "Or add a new term" },
        element: {
          type: "plain_text_input",
          action_id: "value",
          initial_value: input.initialPhrase,
          placeholder: { type: "plain_text", text: "e.g. synergy" },
        },
      },
      {
        type: "input",
        block_id: "amount",
        label: { type: "plain_text", text: "Virtual fine" },
        element: {
          type: "plain_text_input",
          action_id: "value",
          initial_value: "1.00",
          placeholder: { type: "plain_text", text: "1.00" },
        },
      },
      {
        type: "input",
        block_id: "message",
        optional: true,
        label: { type: "plain_text", text: "Context" },
        element: {
          type: "plain_text_input",
          action_id: "value",
          multiline: true,
          placeholder: { type: "plain_text", text: "What did they say?" },
        },
      },
    ],
  }
}
