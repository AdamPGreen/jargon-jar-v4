import { WebClient } from "@slack/web-api"
import { NextResponse } from "next/server"
import {
  createCharge,
  createJargonTerm,
  findJargonTerm,
  getMemberChargeTotal,
  getWorkspaceBySlackTeamId,
  getWorkspaceMember,
  upsertWorkspaceMember,
} from "@/lib/db/queries"
import { fetchSlackUserInfo } from "@/lib/slack/api"
import { postChargeConfirmation, postChargeNotification } from "@/lib/slack/notifications"
import { verifySlackRequest } from "@/lib/slack/security"

type SlackInteractionPayload = {
  type: string
  team: { id: string }
  user: { id: string }
  view?: {
    callback_id: string
    private_metadata: string
    state?: {
      values: Record<string, Record<string, SlackViewValue>>
    }
  }
}

type SlackViewValue = {
  selected_user?: string
  selected_option?: { value: string }
  value?: string
}

export async function POST(request: Request) {
  const body = await request.text()
  if (!verifySlackRequest(request, body)) {
    return NextResponse.json({ error: "Invalid request signature" }, { status: 401 })
  }

  const formData = new URLSearchParams(body)
  const payloadString = formData.get("payload")
  if (!payloadString) {
    return NextResponse.json({ error: "Missing payload" }, { status: 400 })
  }

  const payload = JSON.parse(payloadString) as SlackInteractionPayload

  if (payload.type === "view_submission" && payload.view?.callback_id === "charge_modal") {
    const origin = new URL(request.url).origin
    return handleChargeSubmission(payload, origin)
  }

  return NextResponse.json({})
}

async function handleChargeSubmission(payload: SlackInteractionPayload, origin: string) {
  const metadata = JSON.parse(payload.view?.private_metadata || "{}") as {
    workspace_id?: string
    channel_id?: string
    charging_slack_user_id?: string
    thread_ts?: string | null
  }
  const values = payload.view?.state?.values ?? {}

  const chargedSlackUserId = values.charged_user?.value?.selected_user
  const selectedTermValue = values.jargon_term?.value?.selected_option?.value
  const selectedTermId = selectedTermValue === "__custom__" ? undefined : selectedTermValue
  const customTerm = values.custom_term?.value?.value?.trim()
  const amount = values.amount?.value?.value?.trim()
  const messageText = values.message?.value?.value?.trim() ?? ""

  const errors: Record<string, string> = {}
  if (!chargedSlackUserId) errors.charged_user = "Pick a teammate to charge."
  if (!selectedTermId && !customTerm) {
    errors.jargon_term = "Pick an existing term or add a new one."
  }
  if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
    errors.amount = "Enter a positive virtual fine."
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ response_action: "errors", errors })
  }

  const workspace = await getWorkspaceBySlackTeamId(payload.team.id)
  if (!workspace?.installation?.botToken || workspace.id !== metadata.workspace_id) {
    return NextResponse.json({
      response_action: "errors",
      errors: { jargon_term: "Jargon Jar is not installed for this workspace." },
    })
  }

  const slack = new WebClient(workspace.installation.botToken)
  const chargingSlackUserId = metadata.charging_slack_user_id ?? payload.user.id

  const [chargingMember, chargedMember] = await Promise.all([
    ensureMember(workspace.id, workspace.installation.botToken, chargingSlackUserId),
    ensureMember(workspace.id, workspace.installation.botToken, chargedSlackUserId!),
  ])

  let termId = selectedTermId
  let termName = "jargon"
  if (customTerm) {
    const existing = await findJargonTerm({ workspaceId: workspace.id, term: customTerm })
    const term =
      existing ??
      (await createJargonTerm({
        workspaceId: workspace.id,
        term: customTerm,
        defaultCost: amount!,
        createdById: chargingMember.id,
      }))
    termId = term.id
    termName = term.term
  }

  if (!termId) {
    return NextResponse.json({
      response_action: "errors",
      errors: { jargon_term: "Pick an existing term or add a new one." },
    })
  }

  await createCharge({
    workspaceId: workspace.id,
    chargedMemberId: chargedMember.id,
    chargingMemberId: chargingMember.id,
    jargonTermId: termId,
    amount: amount!,
    messageText,
    messageTs: metadata.thread_ts ?? null,
    channelId: metadata.channel_id ?? "",
  })

  const totalOwed = await getMemberChargeTotal({
    workspaceId: workspace.id,
    memberId: chargedMember.id,
  })

  const [notification, confirmation] = await Promise.all([
    postChargeNotification({
      postMessage: slack.chat.postMessage.bind(slack.chat),
      channelId: metadata.channel_id!,
      threadTs: metadata.thread_ts,
      chargedSlackUserId: chargedSlackUserId!,
      amount: amount!,
      termName,
      totalOwed,
      leaderboardUrl: `${origin}/dashboard/leaderboard`,
    }),
    postChargeConfirmation({
      postEphemeral: slack.chat.postEphemeral.bind(slack.chat),
      channelId: metadata.channel_id!,
      threadTs: metadata.thread_ts,
      chargingSlackUserId,
      chargedSlackUserId: chargedSlackUserId!,
      amount: amount!,
      termName,
    }),
  ])
  if (!notification.ok) {
    console.error("Slack charge notification failed:", notification.error)
  }
  if (!confirmation.ok) {
    console.error("Slack charge confirmation failed:", confirmation.error)
  }

  return NextResponse.json({ response_action: "clear" })
}

async function ensureMember(workspaceId: string, botToken: string, slackUserId: string) {
  const existing = await getWorkspaceMember({ workspaceId, slackUserId })
  if (existing) return existing

  const profile = await fetchSlackUserInfo(botToken, slackUserId)
  return upsertWorkspaceMember({
    workspaceId,
    slackUserId,
    email: profile.email,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
  })
}
