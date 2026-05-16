import { relations, sql } from "drizzle-orm"
import {
  boolean,
  decimal,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  slackTeamId: text("slack_team_id").notNull().unique(),
  name: text("name").notNull(),
  domain: text("domain"),
  ...timestamps,
})

export const slackInstallations = pgTable(
  "slack_installations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    botToken: text("bot_token").notNull(),
    botUserId: text("bot_user_id"),
    installingUserSlackId: text("installing_user_slack_id"),
    installingUserToken: text("installing_user_token"),
    scopes: text("scopes").notNull().default(""),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (table) => ({
    workspaceIdx: uniqueIndex("slack_installations_workspace_idx").on(table.workspaceId),
  })
)

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    slackUserId: text("slack_user_id").notNull(),
    email: text("email"),
    displayName: text("display_name").notNull(),
    avatarUrl: text("avatar_url"),
    isAdmin: boolean("is_admin").notNull().default(false),
    ...timestamps,
  },
  (table) => ({
    workspaceSlackUserIdx: uniqueIndex("workspace_members_workspace_slack_user_idx").on(
      table.workspaceId,
      table.slackUserId
    ),
    workspaceIdx: index("workspace_members_workspace_idx").on(table.workspaceId),
  })
)

export const jargonTerms = pgTable(
  "jargon_terms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    term: text("term").notNull(),
    description: text("description"),
    defaultCost: decimal("default_cost", { precision: 10, scale: 2 })
      .notNull()
      .default("1.00"),
    createdById: uuid("created_by_id").references(() => workspaceMembers.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => ({
    workspaceTermIdx: uniqueIndex("jargon_terms_workspace_term_idx").on(
      table.workspaceId,
      sql`lower(${table.term})`
    ),
    globalTermIdx: uniqueIndex("jargon_terms_global_term_idx")
      .on(sql`lower(${table.term})`)
      .where(sql`${table.workspaceId} IS NULL`),
    workspaceTermUniqueIdx: uniqueIndex("jargon_terms_workspace_term_unique_idx")
      .on(table.workspaceId, sql`lower(${table.term})`)
      .where(sql`${table.workspaceId} IS NOT NULL`),
    workspaceIdx: index("jargon_terms_workspace_idx").on(table.workspaceId),
  })
)

export const charges = pgTable(
  "charges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    chargedMemberId: uuid("charged_member_id")
      .notNull()
      .references(() => workspaceMembers.id, { onDelete: "cascade" }),
    chargingMemberId: uuid("charging_member_id")
      .notNull()
      .references(() => workspaceMembers.id, { onDelete: "cascade" }),
    jargonTermId: uuid("jargon_term_id")
      .notNull()
      .references(() => jargonTerms.id, { onDelete: "restrict" }),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    messageText: text("message_text").notNull().default(""),
    messageTs: text("message_ts"),
    channelId: text("channel_id").notNull(),
    isAutomatic: boolean("is_automatic").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdx: index("charges_workspace_idx").on(table.workspaceId),
    chargedMemberIdx: index("charges_charged_member_idx").on(table.chargedMemberId),
    chargingMemberIdx: index("charges_charging_member_idx").on(table.chargingMemberId),
    termIdx: index("charges_jargon_term_idx").on(table.jargonTermId),
  })
)

export const workspacesRelations = relations(workspaces, ({ many, one }) => ({
  installation: one(slackInstallations),
  members: many(workspaceMembers),
  terms: many(jargonTerms),
  charges: many(charges),
}))

export const slackInstallationsRelations = relations(slackInstallations, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [slackInstallations.workspaceId],
    references: [workspaces.id],
  }),
}))

export const workspaceMembersRelations = relations(workspaceMembers, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id],
  }),
  chargesReceived: many(charges, { relationName: "chargedMember" }),
  chargesMade: many(charges, { relationName: "chargingMember" }),
}))

export const jargonTermsRelations = relations(jargonTerms, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [jargonTerms.workspaceId],
    references: [workspaces.id],
  }),
  createdBy: one(workspaceMembers, {
    fields: [jargonTerms.createdById],
    references: [workspaceMembers.id],
  }),
  charges: many(charges),
}))

export const chargesRelations = relations(charges, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [charges.workspaceId],
    references: [workspaces.id],
  }),
  chargedMember: one(workspaceMembers, {
    fields: [charges.chargedMemberId],
    references: [workspaceMembers.id],
    relationName: "chargedMember",
  }),
  chargingMember: one(workspaceMembers, {
    fields: [charges.chargingMemberId],
    references: [workspaceMembers.id],
    relationName: "chargingMember",
  }),
  jargonTerm: one(jargonTerms, {
    fields: [charges.jargonTermId],
    references: [jargonTerms.id],
  }),
}))
