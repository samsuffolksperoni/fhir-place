import type { CompartmentSectionProps } from "./components/CompartmentSection.js";

/**
 * Ordered list of resource types shown under a Patient's detail view, with the
 * columns we want for each. Derived from FHIR R4's Patient compartment — the
 * clinically-useful subset, not every compartment member.
 *
 * Keeping this config local to the demo rather than in the library: it's an
 * app-level editorial decision (which types matter, which columns, what order)
 * that every real app will want to tailor.
 */
export const PATIENT_COMPARTMENT: Array<
  Omit<CompartmentSectionProps, "patientId">
> = [
  {
    resourceType: "Condition",
    title: "Conditions",
    columns: ["clinicalStatus.text", "code.text", "onsetDateTime"],
  },
  {
    resourceType: "MedicationRequest",
    title: "Medication requests",
    columns: ["status", "medicationCodeableConcept.text", "authoredOn"],
  },
  {
    resourceType: "AllergyIntolerance",
    title: "Allergies & intolerances",
    columns: ["clinicalStatus.text", "code.text", "reaction.manifestation.text"],
  },
  {
    resourceType: "Observation",
    title: "Observations",
    columns: ["status", "code.text", "effectiveDateTime", "valueQuantity"],
  },
  {
    resourceType: "Procedure",
    title: "Procedures",
    columns: ["status", "code.text", "performedDateTime"],
  },
  {
    resourceType: "Encounter",
    title: "Encounters",
    columns: ["status", "class.code", "period.start"],
  },
  {
    resourceType: "Immunization",
    title: "Immunizations",
    columns: ["status", "vaccineCode.text", "occurrenceDateTime"],
  },
];
