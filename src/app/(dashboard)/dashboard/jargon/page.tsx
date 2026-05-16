import { requireDashboardContext } from "@/lib/auth/guards"
import { listJargonTerms } from "@/lib/db/queries"

export default async function JargonPage() {
  const { workspace } = await requireDashboardContext()
  const jargonTerms = await listJargonTerms(workspace.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Jargon Terms</h1>
        <p className="text-muted-foreground">
          Browse all known jargon terms and their virtual fines.
        </p>
      </div>

      <div className="rounded-lg border shadow-sm">
        <div className="p-6">
          <h2 className="text-xl font-semibold">Jargon Dictionary</h2>
          <p className="text-sm text-muted-foreground">
            Workspace terms and global defaults available from Slack modals.
          </p>
        </div>
        <div className="border-t">
          {jargonTerms.length > 0 ? (
            <div className="divide-y">
              {jargonTerms.map((term) => (
                <div key={term.id} className="p-4">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="font-medium">{term.term}</h3>
                    {!term.workspaceId && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        Global
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {term.description || "No description yet."}
                  </p>
                  <p className="font-bold">${Number(term.defaultCost).toFixed(2)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6">
              <div className="text-center py-12 text-muted-foreground">
                <p>No jargon terms found.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
