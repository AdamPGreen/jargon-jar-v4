import { requireDashboardContext } from "@/lib/auth/guards"
import { listJargonTerms } from "@/lib/db/queries"
import { WorkspaceTermsAdmin } from "./workspace-terms-admin"

export default async function JargonPage() {
  const { workspace } = await requireDashboardContext()
  const jargonTerms = await listJargonTerms(workspace.id)

  const workspaceTerms = jargonTerms.filter((t) => t.workspaceId)
  const globalTerms = jargonTerms.filter((t) => !t.workspaceId)

  return (
    <div className="space-y-8">
      <WorkspaceTermsAdmin
        workspaceName={workspace.name}
        totalCount={jargonTerms.length}
        terms={workspaceTerms.map((t) => ({
          id: t.id,
          term: t.term,
          description: t.description,
          defaultCost: t.defaultCost,
        }))}
      />

      <RateSheet
        caption="§ IV-b · Global defaults"
        title="Starter rate sheet"
        stamp="Default"
        terms={globalTerms}
        emptyText="No global defaults loaded."
      />
    </div>
  )
}

type Term = {
  id: string
  term: string
  description: string | null
  defaultCost: string
  workspaceId: string | null
}

function RateSheet({
  caption,
  title,
  stamp,
  terms,
  emptyText = "No terms yet.",
}: {
  caption: string
  title: string
  stamp: string
  terms: Term[]
  emptyText?: string
}) {
  return (
    <section className="border-2 border-[#0B0B0E] bg-white receipt-shadow">
      <div className="flex items-center justify-between border-b-2 border-[#0B0B0E] px-4 py-3">
        <div>
          <div className="font-stamp text-[11px] uppercase tracking-[0.2em] text-[#0B0B0E]">
            {caption}
          </div>
          <div className="font-stamp mt-[2px] text-[14px] uppercase tracking-[0.06em]">
            {title}
          </div>
        </div>
        <span className="font-stamp bg-[#0B0B0E] px-2 py-[2px] text-[9px] uppercase tracking-[0.18em] text-[#FFD400]">
          {stamp}
        </span>
      </div>

      {terms.length === 0 ? (
        <div className="px-4 py-10 text-center text-[11px] uppercase tracking-[0.22em] text-[#0B0B0E]/55">
          {emptyText}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-x-10 px-4 md:grid-cols-2">
          {terms.map((term, i) => (
            <li
              key={term.id}
              className="group grid grid-cols-[auto_1fr_auto] items-baseline gap-3 border-b border-dotted border-[#0B0B0E]/35 py-3 last:border-b-0 md:py-4"
            >
              <span className="font-stamp hidden w-7 shrink-0 text-[11px] uppercase tracking-[0.22em] text-[#0B0B0E]/40 sm:inline-block">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <div className="font-heading truncate text-[20px] uppercase leading-[1.05] tracking-[-0.005em] transition-colors group-hover:text-[#DC2626] md:text-[24px]">
                  {term.term}
                </div>
                {term.description && (
                  <p className="mt-1 text-[12px] text-[#0B0B0E]/70">
                    {term.description}
                  </p>
                )}
              </div>
              <span className="font-stamp shrink-0 text-right text-[15px] md:text-[16px]">
                ${Number(term.defaultCost).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
