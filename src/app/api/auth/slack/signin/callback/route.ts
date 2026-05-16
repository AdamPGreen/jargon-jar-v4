import { NextResponse, type NextRequest } from "next/server"
import {
  SLACK_SIGNIN_STATE_COOKIE,
  consumeOAuthState,
} from "@/lib/auth/oauth-state"
import { setDashboardSession } from "@/lib/auth/session"
import {
  getWorkspaceBySlackTeamId,
  upsertWorkspaceMember,
} from "@/lib/db/queries"
import { exchangeSlackOAuthCode, fetchSlackIdentity } from "@/lib/slack/api"

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const origin = url.origin
  const code = url.searchParams.get("code")

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=missing_slack_code`)
  }

  if (!consumeOAuthState(SLACK_SIGNIN_STATE_COOKIE, url.searchParams.get("state"))) {
    return NextResponse.redirect(`${origin}/?error=invalid_slack_state`)
  }

  try {
    const tokenData = await exchangeSlackOAuthCode({
      code,
      redirectUri: `${origin}/api/auth/slack/signin/callback`,
    })

    const userToken = tokenData.authed_user?.access_token
    if (!userToken) {
      return NextResponse.redirect(`${origin}/?error=missing_slack_identity_token`)
    }

    const identity = await fetchSlackIdentity(userToken)
    const workspace = await getWorkspaceBySlackTeamId(identity.slackTeamId)

    if (!workspace?.installation?.isActive) {
      return NextResponse.redirect(
        `${origin}/?install_required=true&workspace_hint=${identity.teamDomain ?? identity.teamName}`
      )
    }

    const member = await upsertWorkspaceMember({
      workspaceId: workspace.id,
      slackUserId: identity.slackUserId,
      email: identity.email,
      displayName: identity.displayName,
      avatarUrl: identity.avatarUrl,
    })

    setDashboardSession({
      slackUserId: member.slackUserId,
      slackTeamId: workspace.slackTeamId,
      workspaceId: workspace.id,
      displayName: member.displayName,
      avatarUrl: member.avatarUrl,
    })

    return NextResponse.redirect(`${origin}/dashboard`)
  } catch (error) {
    console.error("Slack sign-in failed:", error)
    return NextResponse.redirect(`${origin}/?error=slack_signin_failed`)
  }
}
