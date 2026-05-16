type SlackTokenResponse = {
  ok: boolean
  error?: string
  access_token?: string
  scope?: string
  bot_user_id?: string
  team?: {
    id: string
    name: string
  }
  authed_user?: {
    id: string
    access_token?: string
  }
}

type SlackTeamInfoResponse = {
  ok: boolean
  error?: string
  team?: {
    id: string
    name: string
    domain?: string
  }
}

type SlackUserInfoResponse = {
  ok: boolean
  error?: string
  user?: {
    id: string
    name?: string
    real_name?: string
    profile?: {
      email?: string
      display_name?: string
      real_name?: string
      image_72?: string
      image_192?: string
      image_512?: string
    }
  }
}

type SlackIdentityResponse = {
  ok: boolean
  error?: string
  user?: {
    id: string
    name?: string
    email?: string
    image_72?: string
    image_192?: string
    image_512?: string
  }
  team?: {
    id: string
    name: string
    domain?: string
  }
}

export async function exchangeSlackOAuthCode(input: {
  code: string
  redirectUri: string
}) {
  const clientId = process.env.SLACK_CLIENT_ID
  const clientSecret = process.env.SLACK_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error("Missing Slack OAuth credentials")

  const response = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      code: input.code,
      redirect_uri: input.redirectUri,
    }),
  })

  const data = (await response.json()) as SlackTokenResponse
  if (!data.ok) throw new Error(data.error ?? "Slack OAuth exchange failed")
  return data
}

export async function fetchSlackTeamInfo(botToken: string, teamId: string) {
  const response = await fetch(`https://slack.com/api/team.info?team=${teamId}`, {
    headers: { Authorization: `Bearer ${botToken}` },
  })
  const data = (await response.json()) as SlackTeamInfoResponse
  if (!data.ok || !data.team) throw new Error(data.error ?? "Slack team lookup failed")
  return data.team
}

export async function fetchSlackUserInfo(botToken: string, userId: string) {
  const response = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
    headers: { Authorization: `Bearer ${botToken}` },
  })
  const data = (await response.json()) as SlackUserInfoResponse
  if (!data.ok || !data.user) throw new Error(data.error ?? "Slack user lookup failed")

  const profile = data.user.profile
  return {
    slackUserId: data.user.id,
    email: profile?.email ?? null,
    displayName:
      profile?.display_name ||
      profile?.real_name ||
      data.user.real_name ||
      data.user.name ||
      "Unknown User",
    avatarUrl: profile?.image_512 || profile?.image_192 || profile?.image_72 || null,
  }
}

export async function fetchSlackIdentity(userToken: string) {
  const response = await fetch("https://slack.com/api/users.identity", {
    headers: { Authorization: `Bearer ${userToken}` },
  })
  const data = (await response.json()) as SlackIdentityResponse
  if (!data.ok || !data.user || !data.team) {
    throw new Error(data.error ?? "Slack identity lookup failed")
  }

  return {
    slackUserId: data.user.id,
    slackTeamId: data.team.id,
    teamName: data.team.name,
    teamDomain: data.team.domain ?? null,
    email: data.user.email ?? null,
    displayName: data.user.name ?? data.user.email ?? "Unknown User",
    avatarUrl: data.user.image_512 || data.user.image_192 || data.user.image_72 || null,
  }
}
