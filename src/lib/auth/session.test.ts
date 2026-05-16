import { describe, expect, it } from "vitest"
import { signSession, verifySession } from "./session"

describe("signed dashboard sessions", () => {
  const session = {
    slackUserId: "U123",
    slackTeamId: "T123",
    workspaceId: "workspace-1",
    displayName: "Ada Lovelace",
    avatarUrl: "https://example.com/avatar.png",
  }

  it("round-trips a signed session payload", () => {
    const token = signSession(session, "session-secret")

    expect(verifySession(token, "session-secret")).toEqual(session)
  })

  it("rejects tokens signed with another secret", () => {
    const token = signSession(session, "session-secret")

    expect(verifySession(token, "other-secret")).toBeNull()
  })

  it("rejects malformed tokens", () => {
    expect(verifySession("not-a-token", "session-secret")).toBeNull()
  })
})
