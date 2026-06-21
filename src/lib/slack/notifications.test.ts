import { describe, expect, it, vi } from "vitest"
import {
  buildChargeBlocks,
  postChargeNotification,
  postChargeNotificationWithFallback,
} from "./notifications"

describe("Slack notifications", () => {
  it("posts a Block Kit charge receipt with running total, receipt and leaderboard links", async () => {
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
      receiptUrl: "https://jargonjar.app/receipt/abc-123",
      receiptImageUrl: "https://jargonjar.app/receipt/abc-123/opengraph-image",
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
    expect(blockJson).toContain("https://jargonjar.app/receipt/abc-123")

    const actions = call.blocks.find((block: { type: string }) => block.type === "actions")
    expect(actions.elements).toHaveLength(2)
    const receiptButton = actions.elements.find(
      (element: { action_id?: string }) => element.action_id === "view_receipt"
    )
    expect(receiptButton).toBeDefined()
    expect(receiptButton.url).toBe("https://jargonjar.app/receipt/abc-123")
    expect(receiptButton.text.text).toBe("View receipt")
    expect(receiptButton.style).toBe("primary")

    const leaderboardButton = actions.elements.find(
      (element: { action_id?: string }) => element.action_id === "view_leaderboard"
    )
    expect(leaderboardButton).toBeDefined()
    expect(leaderboardButton.url).toBe("https://jargonjar.app/dashboard/leaderboard")
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
      receiptUrl: "https://jargonjar.app/receipt/abc-123",
      receiptImageUrl: "https://jargonjar.app/receipt/abc-123/opengraph-image",
    })

    expect(result).toEqual({ ok: false, error: "channel_not_found" })
  })

  it("formats blocks consistently with the receipt image embedded", () => {
    const blocks = buildChargeBlocks({
      chargedSlackUserId: "U1",
      amount: "2",
      termName: "circle back",
      totalOwed: "10",
      leaderboardUrl: "https://example.com/lb",
      receiptUrl: "https://example.com/receipt/abc",
      receiptImageUrl: "https://example.com/receipt/abc/opengraph-image",
    })

    expect(blocks).toHaveLength(4)
    expect(blocks[0].type).toBe("section")
    expect(blocks[1].type).toBe("image")
    expect(blocks[2].type).toBe("context")
    expect(blocks[3].type).toBe("actions")

    const imageBlock = blocks[1] as {
      type: "image"
      image_url: string
      alt_text: string
    }
    expect(imageBlock.image_url).toBe("https://example.com/receipt/abc/opengraph-image")
    expect(imageBlock.alt_text).toContain("circle back")
  })

  it("falls back to a DM when the channel post fails with not_in_channel", async () => {
    const postMessage = vi
      .fn()
      .mockRejectedValueOnce(new Error("not_in_channel"))
      .mockResolvedValueOnce({ ok: true })
    const openConversation = vi.fn().mockResolvedValue({ ok: true, channel: { id: "D999" } })

    const result = await postChargeNotificationWithFallback({
      postMessage,
      openConversation,
      channelId: "C123",
      channelDisplayId: "C123",
      threadTs: null,
      chargingSlackUserId: "U999",
      chargedSlackUserId: "U123",
      amount: "1",
      termName: "synergy",
      totalOwed: "1",
      leaderboardUrl: "https://x/lb",
      receiptUrl: "https://x/r/abc",
      receiptImageUrl: "https://x/r/abc/opengraph-image",
    })

    expect(result).toEqual({ ok: true, fallback: "dm", reason: "not_in_channel" })
    expect(openConversation).toHaveBeenCalledWith({ users: "U999" })
    expect(postMessage).toHaveBeenCalledTimes(2)
    expect(postMessage.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        channel: "D999",
        text: expect.stringContaining("/invite @JargonJar"),
      })
    )
    expect(postMessage.mock.calls[1][0].text).toContain("<#C123>")
  })

  it("falls back to a DM with a generic reason for other channel-post errors", async () => {
    const postMessage = vi
      .fn()
      .mockRejectedValueOnce(new Error("channel_not_found"))
      .mockResolvedValueOnce({ ok: true })
    const openConversation = vi.fn().mockResolvedValue({ ok: true, channel: { id: "D999" } })

    const result = await postChargeNotificationWithFallback({
      postMessage,
      openConversation,
      channelId: "C123",
      channelDisplayId: "C123",
      threadTs: null,
      chargingSlackUserId: "U999",
      chargedSlackUserId: "U123",
      amount: "1",
      termName: "synergy",
      totalOwed: "1",
      leaderboardUrl: "https://x/lb",
      receiptUrl: "https://x/r/abc",
      receiptImageUrl: "https://x/r/abc/opengraph-image",
    })

    expect(result).toEqual({ ok: true, fallback: "dm", reason: "channel_not_found" })
    expect(postMessage.mock.calls[1][0].text).toContain("channel_not_found")
  })

  it("returns an error when both the channel post and the DM fallback fail", async () => {
    const postMessage = vi.fn().mockRejectedValue(new Error("not_in_channel"))
    const openConversation = vi.fn().mockResolvedValue({ ok: false, error: "user_not_found" })

    const result = await postChargeNotificationWithFallback({
      postMessage,
      openConversation,
      channelId: "C123",
      channelDisplayId: "C123",
      threadTs: null,
      chargingSlackUserId: "U999",
      chargedSlackUserId: "U123",
      amount: "1",
      termName: "synergy",
      totalOwed: "1",
      leaderboardUrl: "https://x/lb",
      receiptUrl: "https://x/r/abc",
      receiptImageUrl: "https://x/r/abc/opengraph-image",
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain("user_not_found")
    }
  })

  it("returns ok+null fallback when the primary channel post succeeds", async () => {
    const postMessage = vi.fn().mockResolvedValue({ ok: true })
    const openConversation = vi.fn()

    const result = await postChargeNotificationWithFallback({
      postMessage,
      openConversation,
      channelId: "C123",
      channelDisplayId: "C123",
      threadTs: null,
      chargingSlackUserId: "U999",
      chargedSlackUserId: "U123",
      amount: "1",
      termName: "synergy",
      totalOwed: "1",
      leaderboardUrl: "https://x/lb",
      receiptUrl: "https://x/r/abc",
      receiptImageUrl: "https://x/r/abc/opengraph-image",
    })

    expect(result).toEqual({ ok: true, fallback: null })
    expect(openConversation).not.toHaveBeenCalled()
  })
})
