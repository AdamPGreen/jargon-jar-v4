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
  context?: string | null
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
  context?: string | null
}): KnownBlock[] {
  const fine = formatMoney(input.amount)
  const total = formatMoney(input.totalOwed)
  const contextText = input.context?.trim() ?? ""

  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:dollar: *<@${input.chargedSlackUserId}>* was charged *$${fine}* for *"${input.termName}"*.`,
      },
    },
    ...(contextText.length > 0
      ? [
          {
            type: "section" as const,
            text: {
              type: "mrkdwn" as const,
              text: `> ${contextText.replace(/\n/g, "\n> ")}`,
            },
          },
        ]
      : []),
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
  context,
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
        context,
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

type ChargeNotificationWithFallbackInput = ChargeNotificationInput & {
  postEphemeral: PostEphemeral
  chargingSlackUserId: string
}

type FallbackResult =
  | { ok: true; fallback: null }
  | { ok: true; fallback: "ephemeral"; reason: string }
  | { ok: false; error: string }

export async function postChargeNotificationWithFallback(
  input: ChargeNotificationWithFallbackInput
): Promise<FallbackResult> {
  const primary = await postChargeNotification(input)
  if (primary.ok) return { ok: true, fallback: null }

  const reason = primary.error
  const fine = formatMoney(input.amount)
  const ephemeralText =
    reason === "not_in_channel"
      ? `:warning: I couldn't post the receipt in this channel. Invite me with \`/invite @JargonJar\` and try again. Your charge of $${fine} for "${input.termName}" was saved: ${input.receiptUrl}`
      : `:warning: Couldn't post the receipt to the channel (\`${reason}\`). Your charge of $${fine} for "${input.termName}" was saved: ${input.receiptUrl}`

  try {
    await input.postEphemeral({
      channel: input.channelId,
      user: input.chargingSlackUserId,
      thread_ts: input.threadTs ?? undefined,
      text: ephemeralText,
    })
    return { ok: true, fallback: "ephemeral", reason }
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
