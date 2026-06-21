"use client"

import { useEffect, useState } from "react"
import { useFormState, useFormStatus } from "react-dom"
import {
  createJargonTermAction,
  deleteJargonTermAction,
  initialJargonActionState,
  updateJargonTermAction,
  type JargonActionState,
} from "./actions"

type WorkspaceTerm = {
  id: string
  term: string
  description: string | null
  defaultCost: string
}

type Props = {
  workspaceName: string
  totalCount: number
  terms: WorkspaceTerm[]
}

export function WorkspaceTermsAdmin({ workspaceName, totalCount, terms }: Props) {
  const [addOpen, setAddOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  return (
    <>
      <div className="flex flex-col items-start justify-between gap-4 border-b-2 border-[#0B0B0E] pb-5 md:flex-row md:items-end">
        <div>
          <h1 className="font-heading text-[44px] uppercase leading-[0.9] tracking-[-0.005em] md:text-[64px]">
            The <span className="text-[#DC2626]">rate sheet.</span>
          </h1>
          <p className="mt-2 max-w-[60ch] text-[13px] text-[#0B0B0E]/75">
            Every term {workspaceName} can be fined for. Edit or strike any of them.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="font-stamp border-2 border-[#0B0B0E] bg-[#FFD400] px-3 py-2 text-[11px] uppercase tracking-[0.18em]">
            {totalCount} term{totalCount === 1 ? "" : "s"} on file
          </div>
          <button
            type="button"
            onClick={() => setAddOpen((v) => !v)}
            className="font-stamp inline-flex items-center gap-1.5 border-2 border-[#0B0B0E] bg-[#0B0B0E] px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[#FFD400] hover:bg-[#DC2626] hover:text-[#F2ECD9]"
          >
            {addOpen ? "Close" : "+ Add term"}
          </button>
        </div>
      </div>

      {addOpen && <AddForm onClose={() => setAddOpen(false)} />}

      <section className="border-2 border-[#0B0B0E] bg-white receipt-shadow">
        {terms.length === 0 ? (
          <div className="px-4 py-10 text-center text-[11px] uppercase tracking-[0.22em] text-[#0B0B0E]/55">
            No terms yet. Add one above.
          </div>
        ) : (
          <ul className="grid grid-cols-1 px-4">
            {terms.map((term, i) => (
              <li
                key={term.id}
                className="relative border-b border-dotted border-[#0B0B0E]/35 last:border-b-0"
              >
                {editId === term.id ? (
                  <EditForm term={term} onClose={() => setEditId(null)} />
                ) : (
                  <TermRow
                    index={i}
                    term={term}
                    onEdit={() => {
                      setEditId(term.id)
                      setDeleteConfirmId(null)
                    }}
                    onDelete={() => setDeleteConfirmId(term.id)}
                  />
                )}
                {deleteConfirmId === term.id && editId !== term.id && (
                  <DeleteConfirm
                    term={term}
                    onCancel={() => setDeleteConfirmId(null)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

function TermRow({
  index,
  term,
  onEdit,
  onDelete,
}: {
  index: number
  term: WorkspaceTerm
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="group grid grid-cols-[1fr_auto] items-baseline gap-3 py-3 md:grid-cols-[auto_1fr_auto_auto] md:py-4">
      <span className="font-stamp hidden w-7 shrink-0 text-[11px] uppercase tracking-[0.22em] text-[#0B0B0E]/40 md:inline-block">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="min-w-0">
        <div className="font-heading truncate text-[20px] uppercase leading-[1.05] tracking-[-0.005em] group-hover:text-[#DC2626] md:text-[24px]">
          {term.term}
        </div>
        {term.description && (
          <p className="mt-1 text-[12px] text-[#0B0B0E]/70">{term.description}</p>
        )}
      </div>
      <span className="font-stamp shrink-0 self-baseline text-right text-[15px] md:text-[16px]">
        ${Number(term.defaultCost).toFixed(2)}
      </span>
      <div className="col-span-2 mt-2 flex shrink-0 gap-1 md:col-span-1 md:mt-0 md:self-center">
        <button
          type="button"
          onClick={onEdit}
          className="font-stamp border-2 border-[#0B0B0E] bg-white px-2 py-[3px] text-[9px] uppercase tracking-[0.18em] text-[#0B0B0E] hover:bg-[#FFD400]"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="font-stamp border-2 border-[#0B0B0E] bg-white px-2 py-[3px] text-[9px] uppercase tracking-[0.18em] text-[#0B0B0E] hover:border-[#DC2626] hover:bg-[#DC2626] hover:text-[#F2ECD9]"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

function AddForm({ onClose }: { onClose: () => void }) {
  const [state, formAction] = useFormState(
    createJargonTermAction,
    initialJargonActionState
  )

  useEffect(() => {
    if (state.status === "success") onClose()
  }, [state, onClose])

  return (
    <form action={formAction} className="border-2 border-[#0B0B0E] bg-white p-4 receipt-shadow">
      <div className="mb-4 flex items-baseline justify-between border-b border-dotted border-[#0B0B0E]/35 pb-3">
        <div className="font-stamp text-[12px] uppercase tracking-[0.18em]">
          Add a term
        </div>
        <button
          type="button"
          onClick={onClose}
          className="font-stamp text-[10px] uppercase tracking-[0.18em] text-[#0B0B0E]/60 hover:text-[#DC2626]"
        >
          Close
        </button>
      </div>
      <Fields state={state} />
      <FormButtons submitLabel="Add term" pendingLabel="Adding..." onCancel={onClose} />
    </form>
  )
}

function EditForm({
  term,
  onClose,
}: {
  term: WorkspaceTerm
  onClose: () => void
}) {
  const [state, formAction] = useFormState(
    updateJargonTermAction,
    initialJargonActionState
  )

  useEffect(() => {
    if (state.status === "success") onClose()
  }, [state, onClose])

  return (
    <form action={formAction} className="bg-[#F2ECD9]/60 px-4 py-4">
      <input type="hidden" name="id" value={term.id} />
      <div className="mb-3 flex items-baseline justify-between border-b border-dotted border-[#0B0B0E]/35 pb-2">
        <div className="font-stamp text-[11px] uppercase tracking-[0.18em]">
          Editing "{term.term}"
        </div>
        <button
          type="button"
          onClick={onClose}
          className="font-stamp text-[10px] uppercase tracking-[0.18em] text-[#0B0B0E]/60 hover:text-[#DC2626]"
        >
          Cancel
        </button>
      </div>
      <Fields
        state={state}
        defaults={{
          term: term.term,
          description: term.description ?? "",
          defaultCost: term.defaultCost,
        }}
      />
      <FormButtons submitLabel="Save changes" pendingLabel="Saving..." onCancel={onClose} />
    </form>
  )
}

function DeleteConfirm({
  term,
  onCancel,
}: {
  term: WorkspaceTerm
  onCancel: () => void
}) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center border-2 border-[#DC2626] bg-white/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-2 px-4 py-3 text-center">
        <p className="text-[11px] uppercase tracking-[0.18em]">
          Strike "{term.term}" from the sheet?
        </p>
        <div className="flex gap-2">
          <form action={deleteJargonTermAction}>
            <input type="hidden" name="id" value={term.id} />
            <DeleteSubmit />
          </form>
          <button
            type="button"
            onClick={onCancel}
            className="font-stamp border-2 border-[#0B0B0E] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#0B0B0E]"
          >
            Nevermind
          </button>
        </div>
      </div>
    </div>
  )
}

function DeleteSubmit() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="font-stamp bg-[#DC2626] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#F2ECD9] disabled:opacity-60"
    >
      {pending ? "Striking..." : "Strike it"}
    </button>
  )
}

function Fields({
  state,
  defaults,
}: {
  state: JargonActionState
  defaults?: { term: string; description: string; defaultCost: string }
}) {
  const errors = state.status === "error" ? state.errors : {}
  return (
    <div className="grid grid-cols-1 gap-3">
      <TextField
        label="Term"
        name="term"
        defaultValue={defaults?.term}
        error={errors.term}
        placeholder="circle back"
        maxLength={80}
      />
      <TextField
        label="Description"
        name="description"
        defaultValue={defaults?.description}
        error={errors.description}
        placeholder="The thing you do when the call should have ended."
        maxLength={200}
        multiline
      />
      <TextField
        label="Default cost"
        name="defaultCost"
        defaultValue={defaults?.defaultCost}
        error={errors.defaultCost}
        placeholder="3.00"
        inputMode="decimal"
      />
      {errors.form && (
        <div className="border-2 border-[#DC2626] bg-[#FFE7E1] px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[#DC2626]">
          {errors.form}
        </div>
      )}
    </div>
  )
}

function TextField({
  label,
  name,
  defaultValue,
  error,
  placeholder,
  maxLength,
  inputMode,
  multiline,
}: {
  label: string
  name: string
  defaultValue?: string
  error?: string
  placeholder?: string
  maxLength?: number
  inputMode?: "decimal" | "text"
  multiline?: boolean
}) {
  const hasError = Boolean(error)
  const baseInput = `mt-1 w-full border-2 ${
    hasError ? "border-[#DC2626]" : "border-[#0B0B0E]"
  } bg-white px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#FFD400]`

  return (
    <label className="block">
      <span className="font-stamp block text-[10px] uppercase tracking-[0.22em] text-[#0B0B0E]/70">
        {label}
      </span>
      {multiline ? (
        <textarea
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={2}
          className={`${baseInput} resize-y`}
        />
      ) : (
        <input
          type="text"
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          maxLength={maxLength}
          inputMode={inputMode}
          className={baseInput}
        />
      )}
      {error && (
        <span className="mt-1 block text-[11px] text-[#DC2626]">{error}</span>
      )}
    </label>
  )
}

function FormButtons({
  submitLabel,
  pendingLabel,
  onCancel,
}: {
  submitLabel: string
  pendingLabel: string
  onCancel: () => void
}) {
  return (
    <div className="mt-4 flex items-center gap-2">
      <SubmitButton label={submitLabel} pendingLabel={pendingLabel} />
      <button
        type="button"
        onClick={onCancel}
        className="font-stamp border-2 border-[#0B0B0E] bg-white px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#0B0B0E] hover:bg-[#F2ECD9]"
      >
        Cancel
      </button>
    </div>
  )
}

function SubmitButton({
  label,
  pendingLabel,
}: {
  label: string
  pendingLabel: string
}) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="font-stamp bg-[#0B0B0E] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#FFD400] hover:bg-[#DC2626] hover:text-[#F2ECD9] disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  )
}
