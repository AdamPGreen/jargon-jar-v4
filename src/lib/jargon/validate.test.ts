import { describe, expect, it } from "vitest"
import { validateJargonInput } from "./validate"

describe("validateJargonInput", () => {
  it("accepts a complete, well-formed entry", () => {
    const result = validateJargonInput({
      term: "synergy",
      description: "When normal cooperation needs a rebrand.",
      defaultCost: "5",
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toEqual({
        term: "synergy",
        description: "When normal cooperation needs a rebrand.",
        defaultCost: "5.00",
      })
    }
  })

  it("trims whitespace from term and description", () => {
    const result = validateJargonInput({
      term: "  ping me  ",
      description: "  send a message.  ",
      defaultCost: "2.5",
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.term).toBe("ping me")
      expect(result.value.description).toBe("send a message.")
      expect(result.value.defaultCost).toBe("2.50")
    }
  })

  it("rejects empty term", () => {
    const result = validateJargonInput({
      term: "   ",
      description: "",
      defaultCost: "1",
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.term).toBeDefined()
    }
  })

  it("rejects term over 80 chars", () => {
    const result = validateJargonInput({
      term: "x".repeat(81),
      description: "",
      defaultCost: "1",
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.term).toBeDefined()
    }
  })

  it("treats missing description as null", () => {
    const result = validateJargonInput({
      term: "circle back",
      description: "",
      defaultCost: "3",
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.description).toBeNull()
    }
  })

  it("rejects description over 200 chars", () => {
    const result = validateJargonInput({
      term: "deep dive",
      description: "x".repeat(201),
      defaultCost: "3",
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.description).toBeDefined()
    }
  })

  it("rejects missing cost", () => {
    const result = validateJargonInput({
      term: "ping me",
      description: "",
      defaultCost: "",
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.defaultCost).toBeDefined()
    }
  })

  it("rejects non-numeric cost", () => {
    const result = validateJargonInput({
      term: "ping me",
      description: "",
      defaultCost: "free",
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.defaultCost).toBeDefined()
    }
  })

  it("rejects negative cost", () => {
    const result = validateJargonInput({
      term: "ping me",
      description: "",
      defaultCost: "-1",
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.defaultCost).toBeDefined()
    }
  })

  it("rejects cost over 999", () => {
    const result = validateJargonInput({
      term: "ping me",
      description: "",
      defaultCost: "1000",
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.defaultCost).toBeDefined()
    }
  })

  it("accepts zero cost", () => {
    const result = validateJargonInput({
      term: "ping me",
      description: "",
      defaultCost: "0",
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.defaultCost).toBe("0.00")
    }
  })

  it("formats cost to 2 decimal places", () => {
    const cases: Array<[string, string]> = [
      ["5", "5.00"],
      ["5.1", "5.10"],
      ["5.125", "5.13"],
      ["999", "999.00"],
    ]
    for (const [input, expected] of cases) {
      const result = validateJargonInput({
        term: "x",
        description: "",
        defaultCost: input,
      })
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.value.defaultCost).toBe(expected)
    }
  })

  it("reports multiple errors at once", () => {
    const result = validateJargonInput({
      term: "",
      description: "x".repeat(201),
      defaultCost: "abc",
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.term).toBeDefined()
      expect(result.errors.description).toBeDefined()
      expect(result.errors.defaultCost).toBeDefined()
    }
  })
})
