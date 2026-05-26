import { NextResponse, type NextRequest } from "next/server"
import {
  SLACK_INSTALL_STATE_COOKIE,
  consumeOAuthState,
} from "@/lib/auth/oauth-state"
import { setDashboardSession } from "@/lib/auth/session"
import {
  seedWorkspaceJargon,
  upsertSlackInstallation,
  upsertWorkspace,
  upsertWorkspaceMember,
} from "@/lib/db/queries"
import {
  exchangeSlackOAuthCode,
  fetchSlackTeamInfo,
  fetchSlackUserInfo,
} from "@/lib/slack/api"

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const origin = url.origin
  const code = url.searchParams.get("code")

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=missing_slack_code`)
  }

  if (!consumeOAuthState(SLACK_INSTALL_STATE_COOKIE, url.searchParams.get("state"))) {
    return NextResponse.redirect(`${origin}/?error=invalid_slack_state`)
  }

  try {
    const tokenData = await exchangeSlackOAuthCode({
      code,
      redirectUri: `${origin}/api/auth/slack/callback`,
    })

    if (!tokenData.access_token || !tokenData.team?.id || !tokenData.authed_user?.id) {
      return NextResponse.redirect(`${origin}/?error=incomplete_slack_install`)
    }

    const team = await fetchSlackTeamInfo(tokenData.access_token, tokenData.team.id)
    const installer = await fetchSlackUserInfo(
      tokenData.access_token,
      tokenData.authed_user.id
    )

    const workspace = await upsertWorkspace({
      slackTeamId: team.id,
      name: team.name,
      domain: team.domain ?? null,
    })

    await upsertSlackInstallation({
      workspaceId: workspace.id,
      botToken: tokenData.access_token,
      botUserId: tokenData.bot_user_id ?? null,
      installingUserSlackId: installer.slackUserId,
      installingUserToken: tokenData.authed_user.access_token ?? null,
      scopes: tokenData.scope ?? "",
    })

    const member = await upsertWorkspaceMember({
      workspaceId: workspace.id,
      slackUserId: installer.slackUserId,
      email: installer.email,
      displayName: installer.displayName,
      avatarUrl: installer.avatarUrl,
      isAdmin: true,
    })

    await seedWorkspaceJargon(workspace.id)

    setDashboardSession({
      slackUserId: member.slackUserId,
      slackTeamId: workspace.slackTeamId,
      workspaceId: workspace.id,
      displayName: member.displayName,
      avatarUrl: member.avatarUrl,
    })

    return NextResponse.redirect(`${origin}/dashboard`)
  } catch (error) {
    console.error("Slack install failed:", error)
    return NextResponse.redirect(`${origin}/?error=slack_install_failed`)
  }
}
