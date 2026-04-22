import type { StructureDefinition } from "fhir/r4";

/**
 * Minimal Patient StructureDefinition subset for tests. Not a complete snapshot —
 * just the elements we need to exercise the walker. At runtime the demo fetches the
 * full StructureDefinition from the server.
 */
export const PatientStructureDefinition: StructureDefinition = {
  resourceType: "StructureDefinition",
  id: "Patient",
  url: "http://hl7.org/fhir/StructureDefinition/Patient",
  name: "Patient",
  status: "active",
  kind: "resource",
  abstract: false,
  type: "Patient",
  baseDefinition: "http://hl7.org/fhir/StructureDefinition/DomainResource",
  derivation: "specialization",
  snapshot: {
    element: [
      { id: "Patient", path: "Patient", min: 0, max: "*", short: "Information about an individual or animal receiving health care services" },
      { id: "Patient.id", path: "Patient.id", min: 0, max: "1", short: "Logical id of this artifact", type: [{ code: "id" }] },
      { id: "Patient.meta", path: "Patient.meta", min: 0, max: "1", short: "Metadata about the resource", type: [{ code: "Meta" }] },
      { id: "Patient.identifier", path: "Patient.identifier", min: 0, max: "*", short: "An identifier for this patient", type: [{ code: "Identifier" }] },
      { id: "Patient.active", path: "Patient.active", min: 0, max: "1", short: "Whether this patient's record is in active use", type: [{ code: "boolean" }] },
      { id: "Patient.name", path: "Patient.name", min: 0, max: "*", short: "A name associated with the patient", type: [{ code: "HumanName" }] },
      { id: "Patient.telecom", path: "Patient.telecom", min: 0, max: "*", short: "A contact detail for the individual", type: [{ code: "ContactPoint" }] },
      { id: "Patient.gender", path: "Patient.gender", min: 0, max: "1", short: "male | female | other | unknown", type: [{ code: "code" }] },
      { id: "Patient.birthDate", path: "Patient.birthDate", min: 0, max: "1", short: "The date of birth for the individual", type: [{ code: "date" }] },
      { id: "Patient.deceased[x]", path: "Patient.deceased[x]", min: 0, max: "1", short: "Indicates if the individual is deceased or not", type: [{ code: "boolean" }, { code: "dateTime" }] },
      { id: "Patient.address", path: "Patient.address", min: 0, max: "*", short: "An address for the individual", type: [{ code: "Address" }] },
      { id: "Patient.contact", path: "Patient.contact", min: 0, max: "*", short: "A contact party for the patient", type: [{ code: "BackboneElement" }] },
      { id: "Patient.contact.relationship", path: "Patient.contact.relationship", min: 0, max: "*", short: "The kind of relationship", type: [{ code: "CodeableConcept" }] },
      { id: "Patient.contact.name", path: "Patient.contact.name", min: 0, max: "1", short: "A name associated with the contact person", type: [{ code: "HumanName" }] },
    ],
  },
};
