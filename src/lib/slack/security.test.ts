import { describe, expect, it } from "vitest"
import { buildSlackSignature, verifySlackSignature } from "./security"

describe("Slack request verification", () => {
  it("accepts a matching signature inside the replay window", () => {
    const body = "token=legacy&team_id=T123&user_id=U123"
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const signingSecret = "test-secret"
    const signature = buildSlackSignature({ body, timestamp, signingSecret })

    expect(
      verifySlackSignature({
        body,
        timestamp,
        signature,
        signingSecret,
      })
    ).toBe(true)
  })

  it("rejects a valid signature outside the replay window", () => {
    const body = "token=legacy&team_id=T123&user_id=U123"
    const timestamp = (Math.floor(Date.now() / 1000) - 600).toString()
    const signingSecret = "test-secret"
    const signature = buildSlackSignature({ body, timestamp, signingSecret })

    expect(
      verifySlackSignature({
        body,
        timestamp,
        signature,
        signingSecret,
      })
    ).toBe(false)
  })

  it("rejects malformed signatures without throwing", () => {
    expect(
      verifySlackSignature({
        body: "payload={}",
        timestamp: Math.floor(Date.now() / 1000).toString(),
        signature: "not-a-slack-signature",
        signingSecret: "test-secret",
      })
    ).toBe(false)
  })
})
