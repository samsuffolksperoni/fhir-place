import type { ValueSet } from "fhir/r4";

/**
 * Bundled R4 core ValueSets — served from memory when the target FHIR server
 * can't resolve them via `$expand` or `?url=...`. These are the fixed,
 * non-extensible enumerations from the FHIR spec itself, so they can't drift.
 *
 * Ships as a Map keyed by canonical URL so consumers (and `useValueSet`) can
 * look them up in one step. Each entry is already in "expanded" form so
 * `codesFromValueSet` reads them without further transformation.
 */

const mk = (
  url: string,
  codes: Array<{ code: string; display?: string }>,
  system: string,
): ValueSet => ({
  resourceType: "ValueSet",
  status: "active",
  url,
  expansion: {
    identifier: "bundled",
    timestamp: "2024-01-01T00:00:00Z",
    contains: codes.map((c) => ({ system, code: c.code, display: c.display })),
  },
});

export const coreValueSets: Map<string, ValueSet> = new Map(
  (
    [
      mk(
        "http://hl7.org/fhir/ValueSet/administrative-gender",
        [
          { code: "male", display: "Male" },
          { code: "female", display: "Female" },
          { code: "other", display: "Other" },
          { code: "unknown", display: "Unknown" },
        ],
        "http://hl7.org/fhir/administrative-gender",
      ),
      mk(
        "http://hl7.org/fhir/ValueSet/observation-status",
        [
          { code: "registered", display: "Registered" },
          { code: "preliminary", display: "Preliminary" },
          { code: "final", display: "Final" },
          { code: "amended", display: "Amended" },
          { code: "corrected", display: "Corrected" },
          { code: "cancelled", display: "Cancelled" },
          { code: "entered-in-error", display: "Entered in Error" },
          { code: "unknown", display: "Unknown" },
        ],
        "http://hl7.org/fhir/observation-status",
      ),
      mk(
        "http://hl7.org/fhir/ValueSet/condition-clinical",
        [
          { code: "active", display: "Active" },
          { code: "recurrence", display: "Recurrence" },
          { code: "relapse", display: "Relapse" },
          { code: "inactive", display: "Inactive" },
          { code: "remission", display: "Remission" },
          { code: "resolved", display: "Resolved" },
        ],
        "http://terminology.hl7.org/CodeSystem/condition-clinical",
      ),
      mk(
        "http://hl7.org/fhir/ValueSet/condition-ver-status",
        [
          { code: "unconfirmed", display: "Unconfirmed" },
          { code: "provisional", display: "Provisional" },
          { code: "differential", display: "Differential" },
          { code: "confirmed", display: "Confirmed" },
          { code: "refuted", display: "Refuted" },
          { code: "entered-in-error", display: "Entered in Error" },
        ],
        "http://terminology.hl7.org/CodeSystem/condition-ver-status",
      ),
      mk(
        "http://hl7.org/fhir/ValueSet/task-status",
        [
          { code: "draft", display: "Draft" },
          { code: "requested", display: "Requested" },
          { code: "received", display: "Received" },
          { code: "accepted", display: "Accepted" },
          { code: "rejected", display: "Rejected" },
          { code: "ready", display: "Ready" },
          { code: "cancelled", display: "Cancelled" },
          { code: "in-progress", display: "In Progress" },
          { code: "on-hold", display: "On Hold" },
          { code: "failed", display: "Failed" },
          { code: "completed", display: "Completed" },
          { code: "entered-in-error", display: "Entered in Error" },
        ],
        "http://hl7.org/fhir/task-status",
      ),
      mk(
        "http://hl7.org/fhir/ValueSet/goal-status",
        [
          { code: "proposed", display: "Proposed" },
          { code: "planned", display: "Planned" },
          { code: "accepted", display: "Accepted" },
          { code: "active", display: "Active" },
          { code: "on-hold", display: "On Hold" },
          { code: "completed", display: "Completed" },
          { code: "cancelled", display: "Cancelled" },
          { code: "entered-in-error", display: "Entered in Error" },
          { code: "rejected", display: "Rejected" },
        ],
        "http://hl7.org/fhir/goal-status",
      ),
      mk(
        "http://hl7.org/fhir/ValueSet/medicationrequest-status",
        [
          { code: "active", display: "Active" },
          { code: "on-hold", display: "On Hold" },
          { code: "cancelled", display: "Cancelled" },
          { code: "completed", display: "Completed" },
          { code: "entered-in-error", display: "Entered in Error" },
          { code: "stopped", display: "Stopped" },
          { code: "draft", display: "Draft" },
          { code: "unknown", display: "Unknown" },
        ],
        "http://hl7.org/fhir/CodeSystem/medicationrequest-status",
      ),
      mk(
        "http://hl7.org/fhir/ValueSet/encounter-status",
        [
          { code: "planned", display: "Planned" },
          { code: "arrived", display: "Arrived" },
          { code: "triaged", display: "Triaged" },
          { code: "in-progress", display: "In Progress" },
          { code: "onleave", display: "On Leave" },
          { code: "finished", display: "Finished" },
          { code: "cancelled", display: "Cancelled" },
          { code: "entered-in-error", display: "Entered in Error" },
          { code: "unknown", display: "Unknown" },
        ],
        "http://hl7.org/fhir/encounter-status",
      ),
      mk(
        "http://hl7.org/fhir/ValueSet/allergyintolerance-clinical",
        [
          { code: "active", display: "Active" },
          { code: "inactive", display: "Inactive" },
          { code: "resolved", display: "Resolved" },
        ],
        "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
      ),
      mk(
        "http://hl7.org/fhir/ValueSet/allergyintolerance-verification",
        [
          { code: "unconfirmed", display: "Unconfirmed" },
          { code: "confirmed", display: "Confirmed" },
          { code: "refuted", display: "Refuted" },
          { code: "entered-in-error", display: "Entered in Error" },
        ],
        "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification",
      ),
      mk(
        "http://hl7.org/fhir/ValueSet/request-intent",
        [
          { code: "proposal", display: "Proposal" },
          { code: "plan", display: "Plan" },
          { code: "directive", display: "Directive" },
          { code: "order", display: "Order" },
          { code: "original-order", display: "Original Order" },
          { code: "reflex-order", display: "Reflex Order" },
          { code: "filler-order", display: "Filler Order" },
          { code: "instance-order", display: "Instance Order" },
          { code: "option", display: "Option" },
        ],
        "http://hl7.org/fhir/request-intent",
      ),
      mk(
        "http://hl7.org/fhir/ValueSet/request-priority",
        [
          { code: "routine", display: "Routine" },
          { code: "urgent", display: "Urgent" },
          { code: "asap", display: "ASAP" },
          { code: "stat", display: "STAT" },
        ],
        "http://hl7.org/fhir/request-priority",
      ),
      mk(
        "http://hl7.org/fhir/ValueSet/publication-status",
        [
          { code: "draft", display: "Draft" },
          { code: "active", display: "Active" },
          { code: "retired", display: "Retired" },
          { code: "unknown", display: "Unknown" },
        ],
        "http://hl7.org/fhir/publication-status",
      ),
    ] as const
  ).map((vs): [string, ValueSet] => [vs.url!, vs]),
);

/**
 * Returns the library's bundled copy of a R4 core ValueSet by canonical URL,
 * or `undefined` if we don't ship one. Used by `useValueSet` as a last-resort
 * fallback when the server can't resolve it.
 */
export function coreValueSet(canonical: string | undefined): ValueSet | undefined {
  if (!canonical) return undefined;
  return coreValueSets.get(canonical);
}

/** Canonical URLs the library ships bundled ValueSets for. */
export const bundledValueSetUrls = Array.from(coreValueSets.keys());
