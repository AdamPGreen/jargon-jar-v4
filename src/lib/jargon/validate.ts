export type JargonInput = {
  term: string
  description: string
  defaultCost: string
}

export type JargonField = "term" | "description" | "defaultCost"

export type ValidatedJargon = {
  term: string
  description: string | null
  defaultCost: string
}

export type ValidationResult =
  | { ok: true; value: ValidatedJargon }
  | { ok: false; errors: Partial<Record<JargonField, string>> }

export function validateJargonInput(input: JargonInput): ValidationResult {
  const errors: Partial<Record<JargonField, string>> = {}

  const term = input.term.trim()
  if (term.length === 0) {
    errors.term = "Required."
  } else if (term.length > 80) {
    errors.term = "Keep it under 80 characters."
  }

  const descriptionRaw = input.description.trim()
  if (descriptionRaw.length > 200) {
    errors.description = "Keep it under 200 characters."
  }

  const costRaw = input.defaultCost.trim()
  let defaultCost: string | undefined
  if (costRaw.length === 0) {
    errors.defaultCost = "Required."
  } else {
    const n = Number.parseFloat(costRaw)
    if (!Number.isFinite(n)) {
      errors.defaultCost = "Must be a number."
    } else if (n < 0 || n > 999) {
      errors.defaultCost = "Between 0 and 999."
    } else {
      defaultCost = n.toFixed(2)
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    value: {
      term,
      description: descriptionRaw.length === 0 ? null : descriptionRaw,
      defaultCost: defaultCost!,
    },
  }
}
