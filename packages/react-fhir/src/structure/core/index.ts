import type { StructureDefinition } from "fhir/r4";
export { coreValueSet, coreValueSets, bundledValueSetUrls } from "./valuesets.js";

/**
 * Returns the library's bundled R4 core StructureDefinition for a resource
 * type, or `undefined` when the library doesn't ship one.
 *
 * Used as the last-resort fallback inside `resolveStructureDefinition` so
 * `<ResourceView>` / `<ResourceEditor>` keep working even against servers
 * that don't store core SDs as instances (e.g. public HAPI).
 *
 * Each SD is a canonical R4 snapshot copied verbatim from
 * `@hl7/hl7.fhir.r4.core` by `scripts/fetch-core-sds.ts`. To refresh, run
 * `pnpm fetch:core-sds`. Every case is a dynamic `import()` so the SD
 * payloads only land in bundles that actually ask for that resource type.
 */
export async function coreStructureDefinition(
  type: string,
): Promise<StructureDefinition | undefined> {
  switch (type) {
    case "Patient":
      return (await import("./Patient.js")).PatientStructureDefinition;
    case "Observation":
      return (await import("./Observation.js")).ObservationStructureDefinition;
    case "Condition":
      return (await import("./Condition.js")).ConditionStructureDefinition;
    case "MedicationRequest":
      return (await import("./MedicationRequest.js")).MedicationRequestStructureDefinition;
    case "AllergyIntolerance":
      return (await import("./AllergyIntolerance.js")).AllergyIntoleranceStructureDefinition;
    case "Procedure":
      return (await import("./Procedure.js")).ProcedureStructureDefinition;
    case "Encounter":
      return (await import("./Encounter.js")).EncounterStructureDefinition;
    case "Immunization":
      return (await import("./Immunization.js")).ImmunizationStructureDefinition;
    case "Goal":
      return (await import("./Goal.js")).GoalStructureDefinition;
    case "Task":
      return (await import("./Task.js")).TaskStructureDefinition;
    default:
      return undefined;
  }
}

/** The resource types the library ships bundled core SDs for. */
export const bundledCoreTypes = [
  "Patient",
  "Observation",
  "Condition",
  "MedicationRequest",
  "AllergyIntolerance",
  "Procedure",
  "Encounter",
  "Immunization",
  "Goal",
  "Task",
] as const;
