import { WebClient, type ModalView } from "@slack/web-api"
import { NextResponse } from "next/server"
import { getWorkspaceBySlackTeamId } from "@/lib/db/queries"
import { verifySlackRequest } from "@/lib/slack/security"

export async function POST(request: Request) {
  const body = await request.text()
  if (!verifySlackRequest(request, body)) {
    return new Response("Invalid request signature", { status: 401 })
  }

  const formData = new URLSearchParams(body)
  const command = formData.get("command")
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

  const slack = new WebClient(workspace.installation.botToken)

  await slack.views.open({
    trigger_id: triggerId,
    view: buildChargeModal({
      workspaceId: workspace.id,
      channelId,
      chargingSlackUserId: userId,
      threadTs,
    }),
  })

  return new Response("", { status: 200 })
}

function buildChargeModal(input: {
  workspaceId: string
  channelId: string
  chargingSlackUserId: string
  threadTs: string | null
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
          type: "external_select",
          action_id: "value",
          placeholder: { type: "plain_text", text: "Search teammates" },
          min_query_length: 0,
        },
      },
      {
        type: "input",
        block_id: "jargon_term",
        label: { type: "plain_text", text: "Jargon term" },
        element: {
          type: "external_select",
          action_id: "value",
          placeholder: { type: "plain_text", text: "Type to search or add a new term" },
          min_query_length: 1,
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
