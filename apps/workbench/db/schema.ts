import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/**
 * Phase A schema — added incrementally:
 *   PR 1  — `schema_version` placeholder (kept for now as a sanity row)
 *   PR 2  — `data_connection`            (this file, this PR)
 *   PR 7  — `agent_session`, `tool_call`, `evidence_claim`
 */
export const schemaVersion = sqliteTable("schema_version", {
  version: integer("version").primaryKey(),
  appliedAt: text("applied_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  note: text("note"),
});

/**
 * A configured FHIR server the workbench can read from.
 *
 * Phase A constraints (enforced at the application layer, not just the DB):
 *   - `kind` is always `"fhir_clinical"`. No OMOP, claims, wearable, etc.
 *   - `auth_type` is `"none"` or `"bearer"`. No SMART on FHIR.
 *
 * The latest CapabilityStatement is denormalised onto this row so the UI can
 * render status without a join. History is out of scope for Phase A.
 */
export const dataConnection = sqliteTable("data_connection", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind").notNull(),
  baseUrl: text("base_url").notNull(),
  authType: text("auth_type").notNull(),
  authToken: text("auth_token"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  lastCapabilityAt: text("last_capability_at"),
  lastCapabilityStatus: text("last_capability_status"),
  lastCapabilityFhirVersion: text("last_capability_fhir_version"),
  lastCapabilitySoftware: text("last_capability_software"),
  lastCapabilityJson: text("last_capability_json"),
  lastCapabilityError: text("last_capability_error"),
});

export type DataConnection = typeof dataConnection.$inferSelect;
export type NewDataConnection = typeof dataConnection.$inferInsert;
