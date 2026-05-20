import { and, desc, eq, gte, ilike, isNull, or, sql } from "drizzle-orm"
import { db } from "./index"
import {
  charges,
  jargonTerms,
  slackInstallations,
  workspaceMembers,
  workspaces,
} from "./schema"

export type TimePeriod = "all" | "month" | "week"

export function getStartDate(timePeriod: string | null) {
  const now = new Date()
  if (timePeriod === "week") {
    now.setDate(now.getDate() - 7)
    return now
  }
  if (timePeriod === "month") {
    now.setMonth(now.getMonth() - 1)
    return now
  }
  return null
}

export async function getWorkspaceBySlackTeamId(slackTeamId: string) {
  return db.query.workspaces.findFirst({
    where: eq(workspaces.slackTeamId, slackTeamId),
    with: {
      installation: true,
    },
  })
}

export async function getWorkspaceById(workspaceId: string) {
  return db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
  })
}

export async function upsertWorkspace(input: {
  slackTeamId: string
  name: string
  domain?: string | null
}) {
  const [workspace] = await db
    .insert(workspaces)
    .values(input)
    .onConflictDoUpdate({
      target: workspaces.slackTeamId,
      set: {
        name: input.name,
        domain: input.domain ?? null,
        updatedAt: new Date(),
      },
    })
    .returning()

  return workspace
}

export async function upsertSlackInstallation(input: {
  workspaceId: string
  botToken: string
  botUserId?: string | null
  installingUserSlackId?: string | null
  installingUserToken?: string | null
  scopes?: string | null
}) {
  const [installation] = await db
    .insert(slackInstallations)
    .values({
      workspaceId: input.workspaceId,
      botToken: input.botToken,
      botUserId: input.botUserId ?? null,
      installingUserSlackId: input.installingUserSlackId ?? null,
      installingUserToken: input.installingUserToken ?? null,
      scopes: input.scopes ?? "",
      isActive: true,
    })
    .onConflictDoUpdate({
      target: slackInstallations.workspaceId,
      set: {
        botToken: input.botToken,
        botUserId: input.botUserId ?? null,
        installingUserSlackId: input.installingUserSlackId ?? null,
        installingUserToken: input.installingUserToken ?? null,
        scopes: input.scopes ?? "",
        isActive: true,
        updatedAt: new Date(),
      },
    })
    .returning()

  return installation
}

export async function upsertWorkspaceMember(input: {
  workspaceId: string
  slackUserId: string
  email?: string | null
  displayName: string
  avatarUrl?: string | null
  isAdmin?: boolean
}) {
  const [member] = await db
    .insert(workspaceMembers)
    .values({
      workspaceId: input.workspaceId,
      slackUserId: input.slackUserId,
      email: input.email ?? null,
      displayName: input.displayName,
      avatarUrl: input.avatarUrl ?? null,
      isAdmin: input.isAdmin ?? false,
    })
    .onConflictDoUpdate({
      target: [workspaceMembers.workspaceId, workspaceMembers.slackUserId],
      set: {
        email: input.email ?? null,
        displayName: input.displayName,
        avatarUrl: input.avatarUrl ?? null,
        isAdmin: input.isAdmin ?? false,
        updatedAt: new Date(),
      },
    })
    .returning()

  return member
}

export async function getWorkspaceMember(input: {
  workspaceId: string
  slackUserId: string
}) {
  return db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, input.workspaceId),
      eq(workspaceMembers.slackUserId, input.slackUserId)
    ),
    with: {
      workspace: true,
    },
  })
}

export async function listJargonTerms(workspaceId: string) {
  return db.query.jargonTerms.findMany({
    where: or(eq(jargonTerms.workspaceId, workspaceId), isNull(jargonTerms.workspaceId)),
    orderBy: (terms, { asc }) => [asc(terms.term)],
  })
}

export async function findJargonTerm(input: {
  workspaceId: string
  term: string
}) {
  return db.query.jargonTerms.findFirst({
    where: and(
      or(eq(jargonTerms.workspaceId, input.workspaceId), isNull(jargonTerms.workspaceId)),
      ilike(jargonTerms.term, input.term)
    ),
  })
}

export async function createJargonTerm(input: {
  workspaceId: string
  term: string
  description?: string | null
  defaultCost: string
  createdById?: string | null
}) {
  const [term] = await db
    .insert(jargonTerms)
    .values({
      workspaceId: input.workspaceId,
      term: input.term,
      description: input.description ?? null,
      defaultCost: input.defaultCost,
      createdById: input.createdById ?? null,
    })
    .returning()

  return term
}

export async function createCharge(input: {
  workspaceId: string
  chargedMemberId: string
  chargingMemberId: string
  jargonTermId: string
  amount: string
  messageText?: string
  messageTs?: string | null
  channelId: string
  isAutomatic?: boolean
}) {
  const [charge] = await db
    .insert(charges)
    .values({
      workspaceId: input.workspaceId,
      chargedMemberId: input.chargedMemberId,
      chargingMemberId: input.chargingMemberId,
      jargonTermId: input.jargonTermId,
      amount: input.amount,
      messageText: input.messageText ?? "",
      messageTs: input.messageTs ?? null,
      channelId: input.channelId,
      isAutomatic: input.isAutomatic ?? false,
    })
    .returning()

  return charge
}

export async function getMemberChargeTotal(input: {
  workspaceId: string
  memberId: string
}): Promise<string> {
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${charges.amount}), 0)` })
    .from(charges)
    .where(
      and(
        eq(charges.workspaceId, input.workspaceId),
        eq(charges.chargedMemberId, input.memberId)
      )
    )

  return row?.total ?? "0"
}

export async function getLedgerRows(workspaceId: string, timePeriod: string | null = "all") {
  const startDate = getStartDate(timePeriod)

  const chargeRows = await db.query.charges.findMany({
    where: startDate
      ? and(eq(charges.workspaceId, workspaceId), gte(charges.createdAt, startDate))
      : eq(charges.workspaceId, workspaceId),
    orderBy: [desc(charges.createdAt)],
  })

  const users = await db.query.workspaceMembers.findMany({
    where: eq(workspaceMembers.workspaceId, workspaceId),
  })

  const terms = await listJargonTerms(workspaceId)

  return {
    users: users.map((user) => ({
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    })),
    terms: terms.map((term) => ({
      id: term.id,
      term: term.term,
      description: term.description,
    })),
    charges: chargeRows.map((charge) => ({
      chargedUserId: charge.chargedMemberId,
      jargonTermId: charge.jargonTermId,
      amount: charge.amount,
    })),
  }
}

export async function getDashboardData(input: {
  workspaceId: string
  memberId: string
}) {
  const [userCharges, workspaceCharges, recentCharges, recentTerms] = await Promise.all([
    db.query.charges.findMany({
      where: eq(charges.chargedMemberId, input.memberId),
      with: { jargonTerm: true },
      orderBy: (charge, { asc }) => [asc(charge.createdAt)],
    }),
    db.query.charges.findMany({
      where: eq(charges.workspaceId, input.workspaceId),
      with: {
        chargedMember: true,
        chargingMember: true,
        jargonTerm: true,
      },
      orderBy: [desc(charges.createdAt)],
    }),
    db.query.charges.findMany({
      where: and(
        eq(charges.workspaceId, input.workspaceId),
        or(
          eq(charges.chargedMemberId, input.memberId),
          eq(charges.chargingMemberId, input.memberId)
        )
      ),
      with: {
        chargedMember: true,
        chargingMember: true,
        jargonTerm: true,
      },
      orderBy: [desc(charges.createdAt)],
      limit: 10,
    }),
    db.query.jargonTerms.findMany({
      where: eq(jargonTerms.workspaceId, input.workspaceId),
      with: { createdBy: true },
      orderBy: [desc(jargonTerms.createdAt)],
      limit: 5,
    }),
  ])

  return { userCharges, workspaceCharges, recentCharges, recentTerms }
}

export async function seedDefaultJargonTerms() {
  await db
    .insert(jargonTerms)
    .values([
      { term: "Synergy", description: "When normal cooperation needs a rebrand.", defaultCost: "2.00" },
      { term: "Circle Back", description: "Return to a conversation that should have ended.", defaultCost: "1.50" },
      { term: "Low-Hanging Fruit", description: "The easy work someone still needs to do.", defaultCost: "1.00" },
    ])
    .onConflictDoNothing()
}
