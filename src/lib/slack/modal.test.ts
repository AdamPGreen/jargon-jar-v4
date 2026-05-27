import { describe, expect, it } from "vitest"
import { buildChargeModal, parseChargeModalState } from "./modal"

const baseState = {
  workspace_id: "w1",
  channel_id: "C123",
  charging_slack_user_id: "U999",
  thread_ts: null,
  add_new_term: null,
} as const

describe("buildChargeModal", () => {
  it("renders the base form with teammate and term selects only", () => {
    const view = buildChargeModal({ ...baseState })

    expect(view.callback_id).toBe("charge_modal")
    expect(view.submit?.text).toBe("Charge")
    expect(view.blocks).toHaveLength(2)

    const blockIds = view.blocks.map((b) => "block_id" in b && b.block_id)
    expect(blockIds).toEqual(["charged_user", "jargon_term"])

    const termBlock = view.blocks[1] as { dispatch_action?: boolean }
    expect(termBlock.dispatch_action).toBe(true)
  })

  it("renders the add-new form with term name and cost inputs when add_new_term is set", () => {
    const view = buildChargeModal({
      ...baseState,
      add_new_term: { name: "synergy" },
    })

    expect(view.submit?.text).toBe("Charge & save term")
    expect(view.blocks).toHaveLength(4)

    const blockIds = view.blocks.map((b) => "block_id" in b && b.block_id)
    expect(blockIds).toEqual([
      "charged_user",
      "jargon_term",
      "new_term_name",
      "new_term_cost",
    ])

    const nameBlock = view.blocks[2] as {
      element: { initial_value?: string }
    }
    expect(nameBlock.element.initial_value).toBe("synergy")

    const costBlock = view.blocks[3] as {
      element: { initial_value?: string }
    }
    expect(costBlock.element.initial_value).toBe("1.00")
  })

  it("round-trips state through private_metadata", () => {
    const original = {
      ...baseState,
      thread_ts: "1700000000.000100",
      add_new_term: { name: "circle back" },
    }
    const view = buildChargeModal(original)
    const parsed = parseChargeModalState(view.private_metadata)
    expect(parsed).toEqual(original)
  })
})

describe("parseChargeModalState", () => {
  it("returns a safe fallback when private_metadata is missing or invalid", () => {
    expect(parseChargeModalState(undefined)).toEqual({
      workspace_id: "",
      channel_id: "",
      charging_slack_user_id: "",
      thread_ts: null,
      add_new_term: null,
    })

    expect(parseChargeModalState("not-json")).toEqual({
      workspace_id: "",
      channel_id: "",
      charging_slack_user_id: "",
      thread_ts: null,
      add_new_term: null,
    })
  })

  it("normalizes missing fields to safe defaults", () => {
    const parsed = parseChargeModalState(JSON.stringify({ workspace_id: "w1" }))
    expect(parsed.workspace_id).toBe("w1")
    expect(parsed.channel_id).toBe("")
    expect(parsed.add_new_term).toBeNull()
  })
})
