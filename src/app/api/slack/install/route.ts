import { NextResponse, type NextRequest } from "next/server"
import {
  SLACK_INSTALL_STATE_COOKIE,
  createOAuthState,
} from "@/lib/auth/oauth-state"
import { buildSlackInstallUrl } from "@/lib/slack/oauth"

export async function GET(request: NextRequest) {
  const clientId = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID ?? process.env.SLACK_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: "Missing Slack client id" }, { status: 500 })
  }

  const origin = new URL(request.url).origin
  const state = createOAuthState(SLACK_INSTALL_STATE_COOKIE)
  const url = buildSlackInstallUrl({
    clientId,
    redirectUri: `${origin}/api/auth/slack/callback`,
    state,
  })

  return NextResponse.redirect(url)
}
