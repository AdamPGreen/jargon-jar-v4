export const SLACK_INSTALL_SCOPES = [
  "app_mentions:read",
  "channels:history",
  "channels:read",
  "chat:write",
  "commands",
  "groups:history",
  "groups:read",
  "im:write",
  "mpim:read",
  "team:read",
  "users:read",
  "users:read.email",
] as const

export const SLACK_SIGN_IN_USER_SCOPES = [
  "identity.basic",
  "identity.email",
  "identity.avatar",
  "identity.team",
] as const

type SlackOAuthUrlInput = {
  clientId: string
  redirectUri: string
  state: string
}

export function buildSlackInstallUrl({
  clientId,
  redirectUri,
  state,
}: SlackOAuthUrlInput) {
  const url = new URL("https://slack.com/oauth/v2/authorize")
  url.searchParams.set("client_id", clientId)
  url.searchParams.set("scope", SLACK_INSTALL_SCOPES.join(","))
  url.searchParams.set("user_scope", SLACK_SIGN_IN_USER_SCOPES.join(","))
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("state", state)
  return url
}

export function buildSlackSignInUrl({
  clientId,
  redirectUri,
  state,
}: SlackOAuthUrlInput) {
  const url = new URL("https://slack.com/oauth/v2/authorize")
  url.searchParams.set("client_id", clientId)
  url.searchParams.set("user_scope", SLACK_SIGN_IN_USER_SCOPES.join(","))
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("state", state)
  return url
}
