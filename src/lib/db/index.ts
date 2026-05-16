import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

declare global {
  // eslint-disable-next-line no-var
  var jargonJarSql: postgres.Sql | undefined
}

function createSqlClient() {
  const databaseUrl = process.env.DATABASE_URL

  return postgres(databaseUrl ?? "postgres://localhost:5432/jargon_jar_missing_env", {
    max: 1,
    prepare: false,
  })
}

const sqlClient = globalThis.jargonJarSql ?? createSqlClient()

if (process.env.NODE_ENV !== "production") {
  globalThis.jargonJarSql = sqlClient
}

export const db = drizzle(sqlClient, { schema })
