import { beforeEach, describe, expect, it, vi } from "vitest"

const dbMock = vi.hoisted(() => {
  const onConflictDoNothing = vi.fn().mockResolvedValue(undefined)
  const values = vi.fn().mockReturnValue({ onConflictDoNothing })
  const insert = vi.fn().mockReturnValue({ values })
  return { insert, values, onConflictDoNothing }
})

vi.mock("./index", () => ({
  db: { insert: dbMock.insert },
}))

import { DEFAULT_RATE_SHEET } from "../jargon-defaults"
import { seedWorkspaceJargon } from "./queries"

describe("seedWorkspaceJargon", () => {
  beforeEach(() => {
    dbMock.insert.mockClear()
    dbMock.values.mockClear()
    dbMock.onConflictDoNothing.mockClear()
  })

  it("inserts every default rate row scoped to the workspace", async () => {
    await seedWorkspaceJargon("workspace-1")

    expect(dbMock.insert).toHaveBeenCalledTimes(1)
    expect(dbMock.values).toHaveBeenCalledTimes(1)
    expect(dbMock.onConflictDoNothing).toHaveBeenCalledTimes(1)

    const inserted = dbMock.values.mock.calls[0][0]
    expect(inserted).toHaveLength(DEFAULT_RATE_SHEET.length)
    expect(inserted).toHaveLength(16)

    for (let i = 0; i < inserted.length; i++) {
      expect(inserted[i].workspaceId).toBe("workspace-1")
      expect(inserted[i].term).toBe(DEFAULT_RATE_SHEET[i].term)
      expect(inserted[i].description).toBe(DEFAULT_RATE_SHEET[i].description)
      expect(inserted[i].defaultCost).toBe(DEFAULT_RATE_SHEET[i].defaultCost)
    }
  })

  it("is idempotent: a second call issues the same conflict-safe insert", async () => {
    await seedWorkspaceJargon("workspace-2")
    await seedWorkspaceJargon("workspace-2")

    expect(dbMock.insert).toHaveBeenCalledTimes(2)
    expect(dbMock.onConflictDoNothing).toHaveBeenCalledTimes(2)

    const firstCall = dbMock.values.mock.calls[0][0]
    const secondCall = dbMock.values.mock.calls[1][0]
    expect(secondCall).toEqual(firstCall)
  })
})
