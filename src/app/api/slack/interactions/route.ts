import { WebClient } from "@slack/web-api"
import { NextResponse } from "next/server"
import { waitUntil } from "@vercel/functions"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { jargonTerms } from "@/lib/db/schema"
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
import {
  buildChargeModal,
  parseChargeModalState,
  type ChargeModalState,
} from "@/lib/slack/modal"
import { postChargeNotificationWithFallback } from "@/lib/slack/notifications"
import { verifySlackRequest } from "@/lib/slack/security"

type SlackInteractionPayload = {
  type: string
  team: { id: string }
  user: { id: string }
  actions?: Array<{
    action_id: string
    block_id: string
    selected_option?: { value: string }
    selected_user?: string
    value?: string
  }>
  view?: {
    id: string
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

  if (payload.type === "block_actions" && payload.view?.callback_id === "charge_modal") {
    return handleChargeBlockActions(payload)
  }

  if (payload.type === "view_submission" && payload.view?.callback_id === "charge_modal") {
    const origin = new URL(request.url).origin
    return handleChargeSubmission(payload, origin)
  }

  return NextResponse.json({})
}

async function handleChargeBlockActions(payload: SlackInteractionPayload) {
  const view = payload.view!
  const action = payload.actions?.[0]
  if (!action) return NextResponse.json({})
  if (action.block_id !== "jargon_term" || action.action_id !== "value") {
    return NextResponse.json({})
  }

  const selected = action.selected_option?.value
  const state = parseChargeModalState(view.private_metadata)
  const nextAddNew = selected?.startsWith("__new__:")
    ? { name: selected.slice("__new__:".length).trim() }
    : null

  const wasAddNew = state.add_new_term !== null
  if (wasAddNew === (nextAddNew !== null) && state.add_new_term?.name === nextAddNew?.name) {
    return NextResponse.json({})
  }

  const workspace = await getWorkspaceBySlackTeamId(payload.team.id)
  if (!workspace?.installation?.botToken) {
    return NextResponse.json({})
  }
  const slack = new WebClient(workspace.installation.botToken)

  await slack.views.update({
    view_id: view.id,
    view: buildChargeModal({ ...state, add_new_term: nextAddNew }),
  })

  return NextResponse.json({})
}

async function handleChargeSubmission(payload: SlackInteractionPayload, origin: string) {
  const state = parseChargeModalState(payload.view?.private_metadata)
  const values = payload.view?.state?.values ?? {}

  const chargedSlackUserId = values.charged_user?.value?.selected_option?.value
  const selectedTermValue = values.jargon_term?.value?.selected_option?.value
  const newTermNameInput = values.new_term_name?.value?.value?.trim() ?? ""
  const newTermCostInput = values.new_term_cost?.value?.value?.trim() ?? ""

  const errors: Record<string, string> = {}
  if (!chargedSlackUserId) errors.charged_user = "Pick a teammate to charge."
  if (!selectedTermValue) errors.jargon_term = "Pick a term or add a new one."

  const isAddNew =
    state.add_new_term !== null || Boolean(selectedTermValue?.startsWith("__new__:"))

  if (isAddNew) {
    if (!newTermNameInput) {
      errors.new_term_name = "Enter a term name."
    }
    const costNumber = Number(newTermCostInput)
    if (!newTermCostInput || Number.isNaN(costNumber) || costNumber <= 0) {
      errors.new_term_cost = "Enter a positive dollar amount."
    }
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ response_action: "errors", errors })
  }

  // Slack shows "We had some trouble connecting" if a view_submission isn't
  // acknowledged within ~3s. The charge does several DB writes plus Slack API
  // calls, so close the modal immediately and finish the work in the background.
  waitUntil(
    processCharge({
      teamId: payload.team.id,
      state,
      submitterSlackUserId: payload.user.id,
      chargedSlackUserId: chargedSlackUserId!,
      selectedTermValue: selectedTermValue!,
      newTermNameInput,
      newTermCostInput,
      isAddNew,
      origin,
    }).catch((error) => {
      console.error("Charge workflow failed:", error)
    })
  )

  return NextResponse.json({ response_action: "clear" })
}

type ProcessChargeInput = {
  teamId: string
  state: ChargeModalState
  submitterSlackUserId: string
  chargedSlackUserId: string
  selectedTermValue: string
  newTermNameInput: string
  newTermCostInput: string
  isAddNew: boolean
  origin: string
}

async function processCharge(input: ProcessChargeInput) {
  const workspace = await getWorkspaceBySlackTeamId(input.teamId)
  if (!workspace?.installation?.botToken || workspace.id !== input.state.workspace_id) {
    console.error("Charge skipped: workspace not installed or mismatched", input.teamId)
    return
  }

  const botToken = workspace.installation.botToken
  const slack = new WebClient(botToken)
  const chargingSlackUserId =
    input.state.charging_slack_user_id || input.submitterSlackUserId

  const chargedProfile = await fetchSlackUserInfo(botToken, input.chargedSlackUserId)
  if (chargedProfile.isBot || chargedProfile.isDeleted) {
    // The teammate picker only lists humans, so this is a defensive guard.
    console.error("Charge skipped: target is a bot or deleted user", input.chargedSlackUserId)
    return
  }

  const [chargingMember, chargedMember] = await Promise.all([
    ensureMember(workspace.id, botToken, chargingSlackUserId),
    upsertWorkspaceMember({
      workspaceId: workspace.id,
      slackUserId: chargedProfile.slackUserId,
      email: chargedProfile.email,
      displayName: chargedProfile.displayName,
      avatarUrl: chargedProfile.avatarUrl,
    }),
  ])

  let termId: string
  let termName: string
  let amount: string

  if (input.isAddNew) {
    const name = input.newTermNameInput
    const cost = Number(input.newTermCostInput).toFixed(2)
    const existing = await findJargonTerm({ workspaceId: workspace.id, term: name })
    const term =
      existing ??
      (await createJargonTerm({
        workspaceId: workspace.id,
        term: name,
        defaultCost: cost,
        createdById: chargingMember.id,
      }))
    termId = term.id
    termName = term.term
    amount = Number(term.defaultCost).toFixed(2)
  } else {
    const term = await db.query.jargonTerms.findFirst({
      where: eq(jargonTerms.id, input.selectedTermValue),
    })
    if (!term) {
      console.error("Charge skipped: term no longer exists", input.selectedTermValue)
      return
    }
    termId = term.id
    termName = term.term
    amount = Number(term.defaultCost).toFixed(2)
  }

  const charge = await createCharge({
    workspaceId: workspace.id,
    chargedMemberId: chargedMember.id,
    chargingMemberId: chargingMember.id,
    jargonTermId: termId,
    amount,
    messageText: "",
    messageTs: input.state.thread_ts ?? null,
    channelId: input.state.channel_id ?? "",
  })

  const totalOwed = await getMemberChargeTotal({
    workspaceId: workspace.id,
    memberId: chargedMember.id,
  })

  const baseUrl = input.origin || process.env.APP_BASE_URL || ""

  const notification = await postChargeNotificationWithFallback({
    postMessage: slack.chat.postMessage.bind(slack.chat),
    openConversation: slack.conversations.open.bind(slack.conversations),
    channelId: input.state.channel_id,
    channelDisplayId: input.state.channel_id,
    threadTs: input.state.thread_ts,
    chargingSlackUserId,
    chargedSlackUserId: input.chargedSlackUserId,
    amount,
    termName,
    totalOwed,
    leaderboardUrl: `${baseUrl}/dashboard/leaderboard`,
    receiptUrl: `${baseUrl}/receipt/${charge.id}`,
    receiptImageUrl: `${baseUrl}/receipt/${charge.id}/opengraph-image`,
  })

  if (!notification.ok) {
    console.error("Slack charge notification failed entirely:", notification.error)
  } else if (notification.fallback === "dm") {
    console.warn("Slack charge fell back to DM:", notification.reason)
  }
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

export type { ChargeModalState }
