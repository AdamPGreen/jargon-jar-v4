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
    deleted?: boolean
    is_bot?: boolean
    is_app_user?: boolean
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
    isBot: Boolean(data.user.is_bot || data.user.is_app_user),
    isDeleted: Boolean(data.user.deleted),
  }
}

type SlackUsersListResponse = {
  ok: boolean
  error?: string
  members?: Array<{
    id: string
    deleted?: boolean
    is_bot?: boolean
    is_app_user?: boolean
    is_restricted?: boolean
    is_ultra_restricted?: boolean
    name?: string
    real_name?: string
    profile?: {
      display_name?: string
      real_name?: string
      image_72?: string
    }
  }>
  response_metadata?: { next_cursor?: string }
}

export type SlackHuman = {
  id: string
  displayName: string
  avatarUrl: string | null
}

export async function listSlackHumans(botToken: string): Promise<SlackHuman[]> {
  const humans: SlackHuman[] = []
  let cursor: string | undefined

  do {
    const url = new URL("https://slack.com/api/users.list")
    url.searchParams.set("limit", "200")
    if (cursor) url.searchParams.set("cursor", cursor)

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${botToken}` },
    })
    const data = (await response.json()) as SlackUsersListResponse
    if (!data.ok || !data.members) {
      throw new Error(data.error ?? "Slack users.list failed")
    }

    for (const m of data.members) {
      if (m.deleted) continue
      if (m.is_bot) continue
      if (m.is_app_user) continue
      if (m.id === "USLACKBOT") continue
      humans.push({
        id: m.id,
        displayName:
          m.profile?.display_name?.trim() ||
          m.profile?.real_name?.trim() ||
          m.real_name ||
          m.name ||
          m.id,
        avatarUrl: m.profile?.image_72 ?? null,
      })
    }

    cursor = data.response_metadata?.next_cursor || undefined
  } while (cursor)

  return humans.sort((a, b) => a.displayName.localeCompare(b.displayName))
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
