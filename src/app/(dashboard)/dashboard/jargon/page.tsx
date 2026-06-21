import { requireDashboardContext } from "@/lib/auth/guards"
import { listJargonTerms } from "@/lib/db/queries"
import { WorkspaceTermsAdmin } from "./workspace-terms-admin"

export default async function JargonPage() {
  const { workspace } = await requireDashboardContext()
  const jargonTerms = await listJargonTerms(workspace.id)
  const editableTerms = jargonTerms.filter((t) => t.workspaceId)

  return (
    <div className="space-y-8">
      <WorkspaceTermsAdmin
        workspaceName={workspace.name}
        totalCount={editableTerms.length}
        terms={editableTerms.map((t) => ({
          id: t.id,
          term: t.term,
          description: t.description,
          defaultCost: t.defaultCost,
        }))}
      />
    </div>
  )
}
