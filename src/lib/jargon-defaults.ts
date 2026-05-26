export type DefaultRateRow = {
  term: string
  description: string
  defaultCost: string
}

export const DEFAULT_RATE_SHEET: readonly DefaultRateRow[] = [
  {
    term: "synergy",
    description: "When normal cooperation needs a rebrand.",
    defaultCost: "5.00",
  },
  {
    term: "circle back",
    description: "Return to a conversation that should have ended.",
    defaultCost: "3.00",
  },
  {
    term: "low-hanging fruit",
    description: "The easy work someone still needs to do.",
    defaultCost: "4.00",
  },
  {
    term: "leverage (as a verb)",
    description: "A verb only because saying 'use' felt too small.",
    defaultCost: "6.00",
  },
  {
    term: "boil the ocean",
    description: "Doing everything to avoid doing the one thing.",
    defaultCost: "7.00",
  },
  {
    term: "move the needle",
    description: "Pretending there is a needle.",
    defaultCost: "4.00",
  },
  {
    term: "ping me",
    description: "Send a message. Like a regular person.",
    defaultCost: "2.00",
  },
  {
    term: "deep dive",
    description: "A meeting that should have been a paragraph.",
    defaultCost: "3.00",
  },
  {
    term: "north star",
    description: "The metric the deck needed a name for.",
    defaultCost: "5.00",
  },
  {
    term: "let's take this offline",
    description: "I don't want to argue in front of these people.",
    defaultCost: "6.00",
  },
  {
    term: "blue-sky thinking",
    description: "An invitation to ignore every constraint.",
    defaultCost: "5.00",
  },
  {
    term: "open the kimono",
    description: "Don't. Just say 'share details'.",
    defaultCost: "9.00",
  },
  {
    term: "drink the kool-aid",
    description: "Believing the company line on purpose.",
    defaultCost: "4.00",
  },
  {
    term: "back-of-the-napkin",
    description: "A real plan, except it's still on the napkin.",
    defaultCost: "3.00",
  },
  {
    term: "we are aligned",
    description: "Nobody actually agreed on anything.",
    defaultCost: "4.00",
  },
  {
    term: "value-add",
    description: "The thing that makes the thing worth the thing.",
    defaultCost: "3.00",
  },
] as const
