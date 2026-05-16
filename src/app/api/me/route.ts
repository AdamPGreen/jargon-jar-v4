import { NextResponse } from "next/server"
import { requireApiSession } from "@/lib/auth/guards"
import { getWorkspaceById } from "@/lib/db/queries"

export async function GET() {
  const { error, session } = await requireApiSession()
  if (error) return error

  const workspace = await getWorkspaceById(session.workspaceId)
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
  }

  return NextResponse.json({
    user: {
      slack_user_id: session.slackUserId,
      display_name: session.displayName,
      avatar_url: session.avatarUrl,
    },
    workspace: {
      id: workspace.id,
      name: workspace.name,
      slack_team_id: workspace.slackTeamId,
    },
  })
}
