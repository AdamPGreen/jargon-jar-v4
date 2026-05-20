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
