type LeaderboardUserSource = {
  id: string
  displayName: string
  avatarUrl: string | null
}

type LeaderboardTermSource = {
  id: string
  term: string
  description: string | null
}

type LeaderboardChargeSource = {
  chargedUserId: string
  jargonTermId: string
  amount: string | number
}

type UserAggregateInput = {
  users: LeaderboardUserSource[]
  charges: LeaderboardChargeSource[]
  limit?: number
}

type TermAggregateInput = {
  terms: LeaderboardTermSource[]
  charges: LeaderboardChargeSource[]
  limit?: number
}

const toAmount = (amount: string | number) => Number(amount)

export function aggregateUserAmountLeaderboard({
  users,
  charges,
  limit = 10,
}: UserAggregateInput) {
  return aggregateUsers({ users, charges })
    .sort((a, b) => b.total_amount - a.total_amount)
    .slice(0, limit)
}

export function aggregateUserFrequencyLeaderboard({
  users,
  charges,
  limit = 10,
}: UserAggregateInput) {
  return aggregateUsers({ users, charges })
    .sort((a, b) => b.charge_count - a.charge_count || a.name.localeCompare(b.name))
    .slice(0, limit)
}

export function aggregateJargonAmountLeaderboard({
  terms,
  charges,
  limit = 10,
}: TermAggregateInput) {
  return aggregateTerms({ terms, charges })
    .sort((a, b) => b.total_amount - a.total_amount)
    .slice(0, limit)
}

export function aggregateJargonFrequencyLeaderboard({
  terms,
  charges,
  limit = 10,
}: TermAggregateInput) {
  return aggregateTerms({ terms, charges })
    .sort((a, b) => b.usage_count - a.usage_count || b.total_amount - a.total_amount)
    .slice(0, limit)
}

function aggregateUsers({ users, charges }: Omit<UserAggregateInput, "limit">) {
  return users
    .map((user) => {
      const userCharges = charges.filter((charge) => charge.chargedUserId === user.id)
      return {
        user_id: user.id,
        name: user.displayName,
        image_url: user.avatarUrl,
        total_amount: userCharges.reduce(
          (sum, charge) => sum + toAmount(charge.amount),
          0
        ),
        charge_count: userCharges.length,
      }
    })
    .filter((user) => user.charge_count > 0)
}

function aggregateTerms({ terms, charges }: Omit<TermAggregateInput, "limit">) {
  return terms
    .map((term) => {
      const termCharges = charges.filter((charge) => charge.jargonTermId === term.id)
      return {
        word_id: term.id,
        word: term.term,
        description: term.description ?? undefined,
        total_amount: termCharges.reduce(
          (sum, charge) => sum + toAmount(charge.amount),
          0
        ),
        usage_count: termCharges.length,
      }
    })
    .filter((term) => term.usage_count > 0)
}
