import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("./api", () => ({
  listSlackHumans: vi.fn(),
}))

vi.mock("@/lib/db/queries", () => ({
  listJargonTerms: vi.fn(),
}))

import { buildMemberOptions, buildTermOptions } from "./options"
import { listSlackHumans } from "./api"
import { listJargonTerms } from "@/lib/db/queries"

describe("buildMemberOptions", () => {
  beforeEach(() => {
    vi.mocked(listSlackHumans).mockReset()
  })

  it("returns nothing when there is no bot token", async () => {
    const result = await buildMemberOptions(
      { id: "w1", installation: null },
      "ada"
    )
    expect(result).toEqual([])
    expect(listSlackHumans).not.toHaveBeenCalled()
  })

  it("filters humans by case-insensitive substring", async () => {
    vi.mocked(listSlackHumans).mockResolvedValue([
      { id: "U1", displayName: "Adam Green", avatarUrl: null },
      { id: "U2", displayName: "Steven Harlow", avatarUrl: null },
    ])
    const result = await buildMemberOptions(
      { id: "w1", installation: { botToken: "x" } },
      "adam"
    )
    expect(result).toEqual([
      { text: { type: "plain_text", text: "Adam Green" }, value: "U1" },
    ])
  })

  it("returns the full sorted list when query is empty", async () => {
    vi.mocked(listSlackHumans).mockResolvedValue([
      { id: "U1", displayName: "Adam Green", avatarUrl: null },
      { id: "U2", displayName: "Steven Harlow", avatarUrl: null },
    ])
    const result = await buildMemberOptions(
      { id: "w1", installation: { botToken: "x" } },
      ""
    )
    expect(result.map((o) => o.value)).toEqual(["U1", "U2"])
  })
})

describe("buildTermOptions", () => {
  beforeEach(() => {
    vi.mocked(listJargonTerms).mockReset()
  })

  it("prefixes a '+ Add new' option when no exact match exists", async () => {
    vi.mocked(listJargonTerms).mockResolvedValue([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { id: "t1", term: "circle back", defaultCost: "1.00", workspaceId: "w1" } as any,
    ])
    const result = await buildTermOptions(
      { id: "w1", installation: { botToken: "x" } },
      "synergy"
    )
    expect(result[0]).toEqual({
      text: { type: "plain_text", text: `+ Add new term: "synergy"` },
      value: "__new__:synergy",
    })
  })

  it("does not add the '+ Add new' option when the query exactly matches an existing term", async () => {
    vi.mocked(listJargonTerms).mockResolvedValue([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { id: "t1", term: "synergy", defaultCost: "1.00", workspaceId: "w1" } as any,
    ])
    const result = await buildTermOptions(
      { id: "w1", installation: { botToken: "x" } },
      "synergy"
    )
    expect(result.every((o) => !o.value.startsWith("__new__:"))).toBe(true)
  })

  it("returns existing terms with their formatted default cost", async () => {
    vi.mocked(listJargonTerms).mockResolvedValue([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { id: "t1", term: "synergy", defaultCost: "1.50", workspaceId: "w1" } as any,
    ])
    const result = await buildTermOptions(
      { id: "w1", installation: { botToken: "x" } },
      ""
    )
    expect(result[0].text.text).toBe("synergy ($1.50)")
  })
})
