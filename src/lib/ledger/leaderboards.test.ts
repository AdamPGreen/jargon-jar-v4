import { describe, expect, it } from "vitest"
import {
  aggregateJargonAmountLeaderboard,
  aggregateJargonFrequencyLeaderboard,
  aggregateUserAmountLeaderboard,
  aggregateUserFrequencyLeaderboard,
} from "./leaderboards"

const users = [
  { id: "u1", displayName: "Ada", avatarUrl: null },
  { id: "u2", displayName: "Grace", avatarUrl: "https://example.com/grace.png" },
]

const terms = [
  { id: "t1", term: "synergy", description: "Corporate glue" },
  { id: "t2", term: "circle back", description: null },
]

const charges = [
  { chargedUserId: "u1", jargonTermId: "t1", amount: "2.50" },
  { chargedUserId: "u1", jargonTermId: "t2", amount: "1.00" },
  { chargedUserId: "u2", jargonTermId: "t1", amount: "5.00" },
  { chargedUserId: "u2", jargonTermId: "t1", amount: "3.00" },
]

describe("virtual ledger leaderboards", () => {
  it("ranks users by total virtual amount", () => {
    expect(aggregateUserAmountLeaderboard({ users, charges })).toEqual([
      {
        user_id: "u2",
        name: "Grace",
        image_url: "https://example.com/grace.png",
        total_amount: 8,
        charge_count: 2,
      },
      {
        user_id: "u1",
        name: "Ada",
        image_url: null,
        total_amount: 3.5,
        charge_count: 2,
      },
    ])
  })

  it("ranks users by charge count", () => {
    expect(aggregateUserFrequencyLeaderboard({ users, charges })[0]).toMatchObject({
      user_id: "u1",
      charge_count: 2,
    })
  })

  it("ranks jargon terms by virtual amount and usage count", () => {
    expect(aggregateJargonAmountLeaderboard({ terms, charges })[0]).toMatchObject({
      word_id: "t1",
      word: "synergy",
      total_amount: 10.5,
      usage_count: 3,
    })

    expect(aggregateJargonFrequencyLeaderboard({ terms, charges })[0]).toMatchObject({
      word_id: "t1",
      usage_count: 3,
    })
  })
})
