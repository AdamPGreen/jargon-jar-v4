import { listSlackHumans } from "./api"
import { listJargonTerms } from "@/lib/db/queries"

export type OptionsBlockId = "charged_user" | "jargon_term"

type Workspace = {
  id: string
  installation: { botToken: string } | null
}

type Option = {
  text: { type: "plain_text"; text: string }
  value: string
}

export async function buildMemberOptions(
  workspace: Workspace,
  query: string
): Promise<Option[]> {
  if (!workspace.installation?.botToken) return []
  const humans = await listSlackHumans(workspace.installation.botToken)
  const q = query.trim().toLowerCase()
  const filtered = q
    ? humans.filter((h) => h.displayName.toLowerCase().includes(q))
    : humans
  return filtered.slice(0, 100).map((h) => ({
    text: { type: "plain_text", text: h.displayName.slice(0, 75) },
    value: h.id,
  }))
}

export async function buildTermOptions(
  workspace: Workspace,
  query: string
): Promise<Option[]> {
  const terms = await listJargonTerms(workspace.id)
  const q = query.trim().toLowerCase()
  const matches = q ? terms.filter((t) => t.term.toLowerCase().includes(q)) : terms
  const options: Option[] = matches.slice(0, 99).map((t) => ({
    text: {
      type: "plain_text",
      text: `${t.term} ($${Number(t.defaultCost).toFixed(2)})`.slice(0, 75),
    },
    value: t.id,
  }))

  const trimmed = query.trim()
  if (trimmed && !matches.some((t) => t.term.toLowerCase() === q)) {
    options.unshift({
      text: {
        type: "plain_text",
        text: `+ Add new term: "${trimmed}"`.slice(0, 75),
      },
      value: `__new__:${trimmed}`,
    })
  }

  return options
}
