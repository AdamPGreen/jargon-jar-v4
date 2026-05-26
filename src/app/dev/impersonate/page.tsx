import { eq } from "drizzle-orm"
import { notFound, redirect } from "next/navigation"
import { db } from "@/lib/db"
import { workspaceMembers, workspaces } from "@/lib/db/schema"
import { setDashboardSession } from "@/lib/auth/session"

export const dynamic = "force-dynamic"

export default async function ImpersonatePage() {
  if (process.env.NODE_ENV === "production") notFound()

  const members = await db
    .select({
      id: workspaceMembers.id,
      slackUserId: workspaceMembers.slackUserId,
      displayName: workspaceMembers.displayName,
      avatarUrl: workspaceMembers.avatarUrl,
      email: workspaceMembers.email,
      workspaceId: workspaceMembers.workspaceId,
      workspaceName: workspaces.name,
      workspaceSlackTeamId: workspaces.slackTeamId,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .orderBy(workspaceMembers.displayName)

  const signInAs = async (formData: FormData) => {
    "use server"
    if (process.env.NODE_ENV === "production") throw new Error("Disabled in production")

    const memberId = String(formData.get("memberId") ?? "")
    const target = members.find((m) => m.id === memberId)
    if (!target) throw new Error("Member not found")

    setDashboardSession({
      slackUserId: target.slackUserId,
      slackTeamId: target.workspaceSlackTeamId,
      workspaceId: target.workspaceId,
      displayName: target.displayName,
      avatarUrl: target.avatarUrl,
    })
    redirect("/dashboard")
  }

  return (
    <div className="relative min-h-screen bg-[#F2ECD9] text-[#0B0B0E]">
      <div
        aria-hidden
        className="bg-paper-grain pointer-events-none fixed inset-0 z-[1] opacity-[0.18] mix-blend-multiply"
      />
      <div className="relative z-[2] mx-auto max-w-[640px] px-4 py-16">
        <div className="mb-6 border-b-2 border-[#0B0B0E] pb-4">
          <div className="text-[10px] uppercase tracking-[0.22em] text-[#DC2626]">
            § DEV · Bypass
          </div>
          <h1 className="font-heading mt-1 text-[40px] uppercase leading-[0.9] tracking-[-0.005em]">
            Impersonate
          </h1>
          <p className="mt-2 text-[12px] uppercase tracking-[0.18em] text-[#0B0B0E]/55">
            Dev-only. Disabled in production.
          </p>
        </div>

        {members.length === 0 ? (
          <p className="text-[13px] text-[#0B0B0E]/70">
            No workspace members in the database yet. Install Jargon Jar to a Slack
            workspace first.
          </p>
        ) : (
          <ul className="border-2 border-[#0B0B0E] bg-[#F2ECD9] receipt-shadow">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-3 border-b border-dotted border-[#0B0B0E]/30 px-4 py-3 last:border-b-0"
              >
                {m.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.avatarUrl}
                    alt=""
                    className="h-10 w-10 border-2 border-[#0B0B0E] object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 border-2 border-[#0B0B0E] bg-[#FFD400]" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-stamp truncate text-[13px] uppercase tracking-[0.06em]">
                    {m.displayName}
                  </div>
                  <div className="truncate text-[11px] text-[#0B0B0E]/55">
                    {m.email ?? m.slackUserId} · {m.workspaceName}
                  </div>
                </div>
                <form action={signInAs}>
                  <input type="hidden" name="memberId" value={m.id} />
                  <button
                    type="submit"
                    className="font-stamp bg-[#0B0B0E] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#F2ECD9] hover:bg-[#DC2626]"
                  >
                    Sign in as →
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
