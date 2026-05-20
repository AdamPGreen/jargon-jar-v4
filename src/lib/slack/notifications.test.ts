import { describe, expect, it, vi } from "vitest"
import {
  buildChargeBlocks,
  postChargeConfirmation,
  postChargeNotification,
} from "./notifications"

describe("Slack notifications", () => {
  it("posts a Block Kit charge receipt with running total and leaderboard link", async () => {
    const postMessage = vi.fn().mockResolvedValue({ ok: true })

    const result = await postChargeNotification({
      postMessage,
      channelId: "C123",
      threadTs: "1700000000.000100",
      chargedSlackUserId: "U123",
      amount: "5",
      termName: "synergy",
      totalOwed: "47",
      leaderboardUrl: "https://jargonjar.app/dashboard/leaderboard",
    })

    expect(result).toEqual({ ok: true })
    expect(postMessage).toHaveBeenCalledTimes(1)
    const call = postMessage.mock.calls[0][0]
    expect(call.channel).toBe("C123")
    expect(call.thread_ts).toBe("1700000000.000100")
    expect(call.text).toBe('<@U123> was charged $5.00 for "synergy".')

    const blockJson = JSON.stringify(call.blocks)
    expect(blockJson).toContain("<@U123>")
    expect(blockJson).toContain("$5.00")
    expect(blockJson).toContain("synergy")
    expect(blockJson).toContain("$47.00")
    expect(blockJson).toContain("https://jargonjar.app/dashboard/leaderboard")
  })

  it("returns a failure result instead of throwing when a charge notification cannot be posted", async () => {
    const postMessage = vi.fn().mockRejectedValue(new Error("channel_not_found"))

    const result = await postChargeNotification({
      postMessage,
      channelId: "C123",
      threadTs: null,
      chargedSlackUserId: "U123",
      amount: "1.00",
      termName: "Synergy",
      totalOwed: "1.00",
      leaderboardUrl: "https://jargonjar.app/dashboard/leaderboard",
    })

    expect(result).toEqual({ ok: false, error: "channel_not_found" })
  })

  it("sends an ephemeral confirmation to the charger", async () => {
    const postEphemeral = vi.fn().mockResolvedValue({ ok: true })

    const result = await postChargeConfirmation({
      postEphemeral,
      channelId: "C123",
      threadTs: null,
      chargingSlackUserId: "U999",
      chargedSlackUserId: "U123",
      amount: "5",
      termName: "synergy",
    })

    expect(result).toEqual({ ok: true })
    expect(postEphemeral).toHaveBeenCalledWith({
      channel: "C123",
      user: "U999",
      thread_ts: undefined,
      text: ':white_check_mark: Charged <@U123> $5.00 for "synergy".',
    })
  })

  it("returns a failure result when an ephemeral confirmation cannot be posted", async () => {
    const postEphemeral = vi.fn().mockRejectedValue(new Error("user_not_in_channel"))

    const result = await postChargeConfirmation({
      postEphemeral,
      channelId: "C123",
      threadTs: null,
      chargingSlackUserId: "U999",
      chargedSlackUserId: "U123",
      amount: "5",
      termName: "synergy",
    })

    expect(result).toEqual({ ok: false, error: "user_not_in_channel" })
  })

  it("formats blocks consistently", () => {
    const blocks = buildChargeBlocks({
      chargedSlackUserId: "U1",
      amount: "2",
      termName: "circle back",
      totalOwed: "10",
      leaderboardUrl: "https://example.com/lb",
    })

    expect(blocks).toHaveLength(3)
    expect(blocks[0].type).toBe("section")
    expect(blocks[1].type).toBe("context")
    expect(blocks[2].type).toBe("actions")
  })
})
