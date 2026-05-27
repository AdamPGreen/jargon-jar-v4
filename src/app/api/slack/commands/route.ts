import { WebClient } from "@slack/web-api"
import { NextResponse } from "next/server"
import { getWorkspaceBySlackTeamId } from "@/lib/db/queries"
import { buildChargeModal } from "@/lib/slack/modal"
import { verifySlackRequest } from "@/lib/slack/security"

const APP_NAME = "JargonJar"

export async function POST(request: Request) {
  const body = await request.text()
  if (!verifySlackRequest(request, body)) {
    return new Response("Invalid request signature", { status: 401 })
  }

  const formData = new URLSearchParams(body)
  const command = formData.get("command")
  const triggerId = formData.get("trigger_id")
  const channelId = formData.get("channel_id")
  const channelName = formData.get("channel_name") ?? ""
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

  const membership = await checkChannelMembership({
    slack,
    channelId,
    channelName,
  })
  if (!membership.canPost) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: membership.message,
    })
  }

  await slack.views.open({
    trigger_id: triggerId,
    view: buildChargeModal({
      workspace_id: workspace.id,
      channel_id: channelId,
      charging_slack_user_id: userId,
      thread_ts: threadTs,
      add_new_term: null,
    }),
  })

  return new Response("", { status: 200 })
}

type SlackError = Error & { data?: { error?: string } }

async function checkChannelMembership(input: {
  slack: WebClient
  channelId: string
  channelName: string
}): Promise<{ canPost: true } | { canPost: false; message: string }> {
  // DMs and bot-owned DMs are always reachable.
  if (input.channelId.startsWith("D")) return { canPost: true }

  const channelRef = input.channelName
    ? `#${input.channelName}`
    : `<#${input.channelId}>`

  try {
    const info = await input.slack.conversations.info({ channel: input.channelId })
    if (info.channel?.is_member === false) {
      return {
        canPost: false,
        message: `:wave: I need to be in ${channelRef} to drop receipts. Add me with \`/invite @${APP_NAME}\` and try \`/jargon\` again.`,
      }
    }
    return { canPost: true }
  } catch (error) {
    const slackError = error as SlackError
    const code = slackError.data?.error ?? slackError.message ?? "unknown"

    // Old installs without channels:read/groups:read scopes: skip pre-check, let the
    // submission flow handle it via the existing DM fallback.
    if (code === "missing_scope" || code === "not_allowed_token_type") {
      console.warn("Channel membership pre-check skipped:", code)
      return { canPost: true }
    }

    // channel_not_found typically means the bot isn't in a private channel.
    if (code === "channel_not_found") {
      return {
        canPost: false,
        message: `:wave: I can't see ${channelRef}. If it's a private channel, add me with \`/invite @${APP_NAME}\` and try \`/jargon\` again.`,
      }
    }

    console.error("Channel membership pre-check failed:", code)
    return { canPost: true }
  }
}
