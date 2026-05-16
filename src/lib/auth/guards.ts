import { redirect } from "next/navigation"
import { NextResponse } from "next/server"
import { getWorkspaceMember } from "@/lib/db/queries"
import { getDashboardSession } from "./session"

export async function requireDashboardContext() {
  const session = getDashboardSession()
  if (!session) redirect("/")

  const member = await getWorkspaceMember({
    workspaceId: session.workspaceId,
    slackUserId: session.slackUserId,
  })

  if (!member) redirect("/?error=user_not_found")

  return {
    session,
    member,
    workspace: member.workspace,
  }
}

export async function requireApiSession() {
  const session = getDashboardSession()
  if (!session) {
    return {
      error: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
      session: null,
    }
  }

  return { error: null, session }
}

export function assertWorkspaceAccess(sessionWorkspaceId: string, requestedWorkspaceId: string) {
  if (sessionWorkspaceId !== requestedWorkspaceId) {
    return NextResponse.json({ error: "Workspace access denied" }, { status: 403 })
  }

  return null
}
