import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/**
 * Phase A skeleton schema. Tables are added incrementally:
 *   PR 2  — `data_connection`            (FHIR DataConnection)
 *   PR 7  — `agent_session`, `tool_call`, `evidence_claim` (Audit Logging)
 *
 * The single placeholder table here exists so `db:setup` has something to
 * create and so the SQLite + Drizzle wiring is exercised end-to-end before
 * real models land. It will be replaced — not extended — in PR 2.
 */
export const schemaVersion = sqliteTable("schema_version", {
  version: integer("version").primaryKey(),
  appliedAt: text("applied_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  note: text("note"),
});
