"use server"

import { revalidatePath } from "next/cache"
import { requireDashboardContext } from "@/lib/auth/guards"
import {
  createJargonTerm,
  deleteJargonTerm,
  findJargonTerm,
  updateJargonTerm,
} from "@/lib/db/queries"
import { validateJargonInput, type JargonField } from "@/lib/jargon/validate"

export type JargonActionState =
  | { status: "idle" }
  | { status: "success" }
  | {
      status: "error"
      errors: Partial<Record<JargonField | "form", string>>
    }

export const initialJargonActionState: JargonActionState = { status: "idle" }

function readInput(formData: FormData) {
  return {
    term: String(formData.get("term") ?? ""),
    description: String(formData.get("description") ?? ""),
    defaultCost: String(formData.get("defaultCost") ?? ""),
  }
}

export async function createJargonTermAction(
  _prev: JargonActionState,
  formData: FormData
): Promise<JargonActionState> {
  const ctx = await requireDashboardContext()
  const result = validateJargonInput(readInput(formData))
  if (!result.ok) {
    return { status: "error", errors: result.errors }
  }

  const existing = await findJargonTerm({
    workspaceId: ctx.workspace.id,
    term: result.value.term,
    scope: "workspace",
  })
  if (existing) {
    return { status: "error", errors: { term: "Already on your sheet." } }
  }

  await createJargonTerm({
    workspaceId: ctx.workspace.id,
    term: result.value.term,
    description: result.value.description,
    defaultCost: result.value.defaultCost,
    createdById: ctx.member.id,
  })

  revalidatePath("/dashboard/jargon")
  return { status: "success" }
}

export async function updateJargonTermAction(
  _prev: JargonActionState,
  formData: FormData
): Promise<JargonActionState> {
  const ctx = await requireDashboardContext()
  const id = String(formData.get("id") ?? "")
  if (!id) {
    return { status: "error", errors: { form: "Missing term id." } }
  }

  const result = validateJargonInput(readInput(formData))
  if (!result.ok) {
    return { status: "error", errors: result.errors }
  }

  const existing = await findJargonTerm({
    workspaceId: ctx.workspace.id,
    term: result.value.term,
    scope: "workspace",
  })
  if (existing && existing.id !== id) {
    return { status: "error", errors: { term: "Already on your sheet." } }
  }

  const updated = await updateJargonTerm({
    id,
    workspaceId: ctx.workspace.id,
    term: result.value.term,
    description: result.value.description,
    defaultCost: result.value.defaultCost,
  })
  if (!updated) {
    return { status: "error", errors: { form: "Term not found." } }
  }

  revalidatePath("/dashboard/jargon")
  return { status: "success" }
}

export async function deleteJargonTermAction(formData: FormData): Promise<void> {
  const ctx = await requireDashboardContext()
  const id = String(formData.get("id") ?? "")
  if (!id) return

  await deleteJargonTerm({ id, workspaceId: ctx.workspace.id })
  revalidatePath("/dashboard/jargon")
}
