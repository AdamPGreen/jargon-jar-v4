import { describe, expect, it } from "vitest"
import { buildSlackInstallUrl, buildSlackSignInUrl } from "./oauth"

describe("Slack OAuth URL builders", () => {
  it("builds an install URL with bot scopes, user scopes, state, and redirect URI", () => {
    const url = buildSlackInstallUrl({
      clientId: "123.abc",
      redirectUri: "https://example.com/api/auth/slack/callback",
      state: "state-123",
    })

    expect(url.origin).toBe("https://slack.com")
    expect(url.pathname).toBe("/oauth/v2/authorize")
    expect(url.searchParams.get("client_id")).toBe("123.abc")
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://example.com/api/auth/slack/callback"
    )
    expect(url.searchParams.get("state")).toBe("state-123")
    expect(url.searchParams.get("scope")).toContain("commands")
    expect(url.searchParams.get("user_scope")).toContain("identity.email")
  })

  it("keeps dashboard sign-in separate from bot installation scopes", () => {
    const url = buildSlackSignInUrl({
      clientId: "123.abc",
      redirectUri: "https://example.com/api/auth/slack/signin/callback",
      state: "state-456",
    })

    expect(url.searchParams.get("scope")).toBeNull()
    expect(url.searchParams.get("user_scope")).toContain("identity.basic")
    expect(url.searchParams.get("user_scope")).toContain("identity.team")
  })
})
