type PostMessage = (input: {
  channel: string
  thread_ts?: string
  text: string
}) => Promise<unknown>

type ChargeNotificationInput = {
  postMessage: PostMessage
  channelId: string
  threadTs?: string | null
  chargedSlackUserId: string
  amount: string
  termName: string
}

type NotificationResult = { ok: true } | { ok: false; error: string }

export async function postChargeNotification({
  postMessage,
  channelId,
  threadTs,
  chargedSlackUserId,
  amount,
  termName,
}: ChargeNotificationInput): Promise<NotificationResult> {
  try {
    await postMessage({
      channel: channelId,
      thread_ts: threadTs ?? undefined,
      text: `<@${chargedSlackUserId}> was charged $${Number(amount).toFixed(2)} for "${termName}".`,
    })

    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown Slack notification error",
    }
  }
}
