import { describe, expect, it, vi } from "vitest"
import { postChargeNotification } from "./notifications"

describe("Slack notifications", () => {
  it("returns a failure result instead of throwing when a charge notification cannot be posted", async () => {
    const postMessage = vi.fn().mockRejectedValue(new Error("channel_not_found"))

    const result = await postChargeNotification({
      postMessage,
      channelId: "C123",
      threadTs: null,
      chargedSlackUserId: "U123",
      amount: "1.00",
      termName: "Synergy",
    })

    expect(result).toEqual({ ok: false, error: "channel_not_found" })
    expect(postMessage).toHaveBeenCalledWith({
      channel: "C123",
      thread_ts: undefined,
      text: '<@U123> was charged $1.00 for "Synergy".',
    })
  })
})
