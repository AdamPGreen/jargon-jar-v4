CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "workspaces" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slack_team_id" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "domain" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "slack_installations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
  "bot_token" text NOT NULL,
  "bot_user_id" text,
  "installing_user_slack_id" text,
  "installing_user_token" text,
  "scopes" text DEFAULT '' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "slack_installations_workspace_idx"
  ON "slack_installations" ("workspace_id");

CREATE TABLE IF NOT EXISTS "workspace_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
  "slack_user_id" text NOT NULL,
  "email" text,
  "display_name" text NOT NULL,
  "avatar_url" text,
  "is_admin" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "workspace_members_workspace_slack_user_idx"
  ON "workspace_members" ("workspace_id", "slack_user_id");

CREATE INDEX IF NOT EXISTS "workspace_members_workspace_idx"
  ON "workspace_members" ("workspace_id");

CREATE TABLE IF NOT EXISTS "jargon_terms" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid REFERENCES "workspaces"("id") ON DELETE cascade,
  "term" text NOT NULL,
  "description" text,
  "default_cost" numeric(10, 2) DEFAULT '1.00' NOT NULL,
  "created_by_id" uuid REFERENCES "workspace_members"("id") ON DELETE set null,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "jargon_terms_workspace_term_idx"
  ON "jargon_terms" ("workspace_id", lower("term"));

CREATE INDEX IF NOT EXISTS "jargon_terms_workspace_idx"
  ON "jargon_terms" ("workspace_id");

CREATE TABLE IF NOT EXISTS "charges" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE cascade,
  "charged_member_id" uuid NOT NULL REFERENCES "workspace_members"("id") ON DELETE cascade,
  "charging_member_id" uuid NOT NULL REFERENCES "workspace_members"("id") ON DELETE cascade,
  "jargon_term_id" uuid NOT NULL REFERENCES "jargon_terms"("id") ON DELETE restrict,
  "amount" numeric(10, 2) NOT NULL,
  "message_text" text DEFAULT '' NOT NULL,
  "message_ts" text,
  "channel_id" text NOT NULL,
  "is_automatic" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "charges_workspace_idx" ON "charges" ("workspace_id");
CREATE INDEX IF NOT EXISTS "charges_charged_member_idx" ON "charges" ("charged_member_id");
CREATE INDEX IF NOT EXISTS "charges_charging_member_idx" ON "charges" ("charging_member_id");
CREATE INDEX IF NOT EXISTS "charges_jargon_term_idx" ON "charges" ("jargon_term_id");
