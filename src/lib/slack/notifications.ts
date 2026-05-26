import type { KnownBlock } from "@slack/web-api"

type PostMessage = (input: {
  channel: string
  thread_ts?: string
  text: string
  blocks?: KnownBlock[]
}) => Promise<unknown>

type PostEphemeral = (input: {
  channel: string
  user: string
  text: string
  thread_ts?: string
}) => Promise<unknown>

type ChargeNotificationInput = {
  postMessage: PostMessage
  channelId: string
  threadTs?: string | null
  chargedSlackUserId: string
  amount: string
  termName: string
  totalOwed: string
  leaderboardUrl: string
  receiptUrl: string
  receiptImageUrl: string
}

type ChargeConfirmationInput = {
  postEphemeral: PostEphemeral
  channelId: string
  threadTs?: string | null
  chargingSlackUserId: string
  chargedSlackUserId: string
  amount: string
  termName: string
}

type NotificationResult = { ok: true } | { ok: false; error: string }

function formatMoney(value: string): string {
  return Number(value).toFixed(2)
}

export function buildChargeBlocks(input: {
  chargedSlackUserId: string
  amount: string
  termName: string
  totalOwed: string
  leaderboardUrl: string
  receiptUrl: string
  receiptImageUrl: string
}): KnownBlock[] {
  const fine = formatMoney(input.amount)
  const total = formatMoney(input.totalOwed)

  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:dollar: *<@${input.chargedSlackUserId}>* was charged *$${fine}* for *"${input.termName}"*.`,
      },
    },
    {
      type: "image",
      image_url: input.receiptImageUrl,
      alt_text: `Citation receipt: ${input.termName} for $${fine}`,
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Running total for <@${input.chargedSlackUserId}>: *$${total}*`,
        },
      ],
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "View receipt" },
          url: input.receiptUrl,
          action_id: "view_receipt",
          style: "primary",
        },
        {
          type: "button",
          text: { type: "plain_text", text: "View leaderboard" },
          url: input.leaderboardUrl,
          action_id: "view_leaderboard",
        },
      ],
    },
  ]
}

export async function postChargeNotification({
  postMessage,
  channelId,
  threadTs,
  chargedSlackUserId,
  amount,
  termName,
  totalOwed,
  leaderboardUrl,
  receiptUrl,
  receiptImageUrl,
}: ChargeNotificationInput): Promise<NotificationResult> {
  try {
    await postMessage({
      channel: channelId,
      thread_ts: threadTs ?? undefined,
      text: `<@${chargedSlackUserId}> was charged $${formatMoney(amount)} for "${termName}".`,
      blocks: buildChargeBlocks({
        chargedSlackUserId,
        amount,
        termName,
        totalOwed,
        leaderboardUrl,
        receiptUrl,
        receiptImageUrl,
      }),
    })

    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown Slack notification error",
    }
  }
}

type OpenConversation = (input: {
  users: string
}) => Promise<{ ok?: boolean; channel?: { id?: string }; error?: string }>

type ChargeNotificationWithFallbackInput = ChargeNotificationInput & {
  openConversation: OpenConversation
  chargingSlackUserId: string
  channelDisplayId: string
}

type FallbackResult =
  | { ok: true; fallback: null }
  | { ok: true; fallback: "dm"; reason: string }
  | { ok: false; error: string }

export async function postChargeNotificationWithFallback(
  input: ChargeNotificationWithFallbackInput
): Promise<FallbackResult> {
  const primary = await postChargeNotification(input)
  if (primary.ok) return { ok: true, fallback: null }

  const reason = primary.error
  const fine = formatMoney(input.amount)
  const channelRef = input.channelDisplayId
    ? `<#${input.channelDisplayId}>`
    : "that channel"
  const dmText =
    reason === "not_in_channel"
      ? `:warning: I couldn't post the receipt in ${channelRef} because I'm not a member there. Invite me with \`/invite @JargonJar\` and the next charge will land in-channel. Charge of *$${fine}* for *"${input.termName}"* was still saved: ${input.receiptUrl}`
      : `:warning: Couldn't post the receipt to ${channelRef} (\`${reason}\`). Charge of *$${fine}* for *"${input.termName}"* was still saved: ${input.receiptUrl}`

  try {
    const im = await input.openConversation({ users: input.chargingSlackUserId })
    const dmChannel = im.channel?.id
    if (!dmChannel) {
      throw new Error(im.error ?? "could not open DM channel")
    }
    await input.postMessage({
      channel: dmChannel,
      text: dmText,
    })
    return { ok: true, fallback: "dm", reason }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown Slack fallback error",
    }
  }
}

export async function postChargeConfirmation({
  postEphemeral,
  channelId,
  threadTs,
  chargingSlackUserId,
  chargedSlackUserId,
  amount,
  termName,
}: ChargeConfirmationInput): Promise<NotificationResult> {
  try {
    await postEphemeral({
      channel: channelId,
      user: chargingSlackUserId,
      thread_ts: threadTs ?? undefined,
      text: `:white_check_mark: Charged <@${chargedSlackUserId}> $${formatMoney(amount)} for "${termName}".`,
    })

    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown Slack ephemeral error",
    }
  }
}
