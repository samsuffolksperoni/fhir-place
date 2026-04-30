import { z } from "zod";

/**
 * Phase A allow-lists. Both are enforced at the validation boundary so any
 * unknown value (e.g. `kind: "omop"` or `authType: "smart"`) is rejected
 * before it can touch the DB.
 */
export const ConnectionKind = z.enum(["fhir_clinical"]);
export type ConnectionKind = z.infer<typeof ConnectionKind>;

export const AuthType = z.enum(["none", "bearer"]);
export type AuthType = z.infer<typeof AuthType>;

export const CreateConnectionInput = z
  .object({
    name: z.string().min(1).max(120),
    kind: ConnectionKind,
    baseUrl: z.string().url().min(1),
    authType: AuthType,
    authToken: z.string().min(1).max(4096).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.authType === "bearer" && !value.authToken) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["authToken"],
        message: "authToken is required when authType is 'bearer'",
      });
    }
    if (value.authType === "none" && value.authToken) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["authToken"],
        message: "authToken must be omitted when authType is 'none'",
      });
    }
  });

export type CreateConnectionInput = z.infer<typeof CreateConnectionInput>;

export const ConnectionId = z.string().min(1).max(64);

/**
 * Phase A FHIR resource allow-list for the user-facing read proxy and the
 * patient-summary agent's typed tool registry (PR 4). Anything outside this
 * list is a 400 at the API boundary — there is no path that lets the client
 * (or, in PR 6, the agent) probe arbitrary FHIR resources.
 */
export const ResourceType = z.enum([
  "Patient",
  "Condition",
  "MedicationRequest",
  "AllergyIntolerance",
  "Encounter",
  "Observation",
]);
export type ResourceType = z.infer<typeof ResourceType>;

/**
 * Per-resource allow-list of search parameters the proxy will forward. Every
 * other param (including `_include`, `_revinclude`, `_has`, `_filter`,
 * `_elements`, `_summary`, `_format`) is dropped before forwarding upstream
 * so a caller cannot expand the response shape, change content negotiation,
 * or chain into resources outside the allow-list.
 *
 * `_count`, `_sort`, `_id`, and the per-resource params named in TASKS.md
 * are the only things that survive.
 */
export const SEARCH_PARAM_ALLOWLIST: Record<ResourceType, ReadonlyArray<string>> = {
  Patient: ["name", "family", "given", "identifier", "birthdate", "gender", "_id", "_count", "_sort"],
  Condition: ["patient", "clinical-status", "category", "code", "_id", "_count", "_sort"],
  MedicationRequest: ["patient", "status", "intent", "_id", "_count", "_sort"],
  AllergyIntolerance: ["patient", "clinical-status", "_id", "_count", "_sort"],
  Encounter: ["patient", "status", "date", "_id", "_count", "_sort"],
  Observation: ["patient", "category", "code", "date", "status", "_id", "_count", "_sort"],
};

/**
 * Globally bounded `_count` so a buggy or malicious client can't ask the
 * upstream FHIR server for a 100k-page Bundle.
 */
export const MAX_COUNT = 100;

