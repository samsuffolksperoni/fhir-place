import type { Bundle, Observation, Patient, StructureDefinition } from "fhir/r4";

const patient = (
  id: string,
  overrides: Partial<Patient> = {},
): Patient => ({
  resourceType: "Patient",
  id,
  meta: { versionId: "1", lastUpdated: "2024-10-01T12:00:00Z" },
  active: true,
  text: {
    status: "generated",
    div: `<div xmlns="http://www.w3.org/1999/xhtml"><p>Synthetic test patient ${id}</p></div>`,
  },
  ...overrides,
});

export const patients: Patient[] = [
  patient("ada", {
    name: [{ use: "official", given: ["Ada"], family: "Lovelace" }],
    gender: "female",
    birthDate: "1815-12-10",
    deceasedDateTime: "1852-11-27",
    telecom: [
      { system: "email", value: "ada@example.com", use: "home" },
      { system: "phone", value: "+44 20 7946 0123", use: "home" },
    ],
    address: [
      {
        use: "home",
        line: ["1 Workhouse Lane"],
        city: "London",
        country: "UK",
      },
    ],
    identifier: [
      {
        system: "http://hospital.example.org/mrn",
        value: "MRN-0001",
        use: "usual",
      },
    ],
  }),
  patient("turing", {
    name: [{ use: "official", given: ["Alan", "Mathison"], family: "Turing" }],
    gender: "male",
    birthDate: "1912-06-23",
    telecom: [{ system: "email", value: "alan@example.com" }],
    address: [
      { line: ["2 King's College"], city: "Cambridge", country: "UK" },
    ],
  }),
  patient("hopper", {
    name: [{ use: "official", given: ["Grace"], family: "Hopper" }],
    gender: "female",
    birthDate: "1906-12-09",
    telecom: [{ system: "phone", value: "+1 555 0100" }],
  }),
  patient("lamarr", {
    name: [{ use: "official", given: ["Hedy"], family: "Lamarr" }],
    gender: "female",
    birthDate: "1914-11-09",
  }),
  // Synthetic bulk fixtures so pagination is demonstrable (one page = _count=20).
  ...Array.from({ length: 32 }, (_, i) => {
    const idx = i + 1;
    const givens = ["Alex", "Bailey", "Casey", "Dakota", "Ellis", "Finley", "Gael", "Harper"];
    const families = ["Nguyen", "Patel", "Garcia", "Kim", "Smith", "Johnson", "Martinez", "Wilson"];
    const given = givens[idx % givens.length]!;
    const family = families[idx % families.length]!;
    return patient(`syn-${idx}`, {
      name: [{ use: "official", given: [given], family }],
      gender: idx % 2 === 0 ? "female" : "male",
      birthDate: `19${40 + (idx % 60)}-0${1 + (idx % 9)}-${10 + (idx % 18)}`,
    });
  }),
];

export const observationsFor = (patientId: string): Observation[] => {
  if (patientId !== "ada") return [];
  return [
    {
      resourceType: "Observation",
      id: "obs-hr-ada",
      status: "final",
      code: {
        coding: [
          {
            system: "http://loinc.org",
            code: "8867-4",
            display: "Heart rate",
          },
        ],
        text: "Heart rate",
      },
      subject: { reference: "Patient/ada", display: "Ada Lovelace" },
      effectiveDateTime: "2024-09-15T09:00:00Z",
      valueQuantity: {
        value: 72,
        unit: "beats/minute",
        system: "http://unitsofmeasure.org",
        code: "/min",
      },
    },
  ];
};

export const searchBundle = <T extends Patient | Observation>(
  resources: T[],
): Bundle<T> => ({
  resourceType: "Bundle",
  type: "searchset",
  total: resources.length,
  entry: resources.map((r) => ({ resource: r, fullUrl: `${r.resourceType}/${r.id}` })),
});

/** Minimal Patient SD trimmed to the elements our fixtures populate. */
export const patientStructureDefinition: StructureDefinition = {
  resourceType: "StructureDefinition",
  id: "Patient",
  url: "http://hl7.org/fhir/StructureDefinition/Patient",
  name: "Patient",
  status: "active",
  kind: "resource",
  abstract: false,
  type: "Patient",
  snapshot: {
    element: [
      { id: "Patient", path: "Patient", min: 0, max: "*" },
      { id: "Patient.id", path: "Patient.id", min: 0, max: "1", short: "Logical id", type: [{ code: "id" }] },
      { id: "Patient.meta", path: "Patient.meta", min: 0, max: "1", short: "Metadata", type: [{ code: "Meta" }] },
      { id: "Patient.identifier", path: "Patient.identifier", min: 0, max: "*", short: "An identifier for this patient", type: [{ code: "Identifier" }] },
      { id: "Patient.active", path: "Patient.active", min: 0, max: "1", short: "Record active", type: [{ code: "boolean" }] },
      { id: "Patient.name", path: "Patient.name", min: 0, max: "*", short: "Name", type: [{ code: "HumanName" }] },
      { id: "Patient.telecom", path: "Patient.telecom", min: 0, max: "*", short: "Contact detail", type: [{ code: "ContactPoint" }] },
      { id: "Patient.gender", path: "Patient.gender", min: 0, max: "1", short: "male | female | other | unknown", type: [{ code: "code" }] },
      { id: "Patient.birthDate", path: "Patient.birthDate", min: 0, max: "1", short: "Birth date", type: [{ code: "date" }] },
      { id: "Patient.deceased[x]", path: "Patient.deceased[x]", min: 0, max: "1", short: "Deceased", type: [{ code: "boolean" }, { code: "dateTime" }] },
      { id: "Patient.address", path: "Patient.address", min: 0, max: "*", short: "Address", type: [{ code: "Address" }] },
    ],
  },
};

export const observationStructureDefinition: StructureDefinition = {
  resourceType: "StructureDefinition",
  id: "Observation",
  url: "http://hl7.org/fhir/StructureDefinition/Observation",
  name: "Observation",
  status: "active",
  kind: "resource",
  abstract: false,
  type: "Observation",
  snapshot: {
    element: [
      { id: "Observation", path: "Observation", min: 0, max: "*" },
      { id: "Observation.id", path: "Observation.id", min: 0, max: "1", type: [{ code: "id" }] },
      { id: "Observation.status", path: "Observation.status", min: 1, max: "1", short: "registered | preliminary | final | …", type: [{ code: "code" }] },
      { id: "Observation.code", path: "Observation.code", min: 1, max: "1", short: "What was observed", type: [{ code: "CodeableConcept" }] },
      { id: "Observation.subject", path: "Observation.subject", min: 0, max: "1", short: "Who / what this is about", type: [{ code: "Reference" }] },
      { id: "Observation.effective[x]", path: "Observation.effective[x]", min: 0, max: "1", short: "Clinically relevant time", type: [{ code: "dateTime" }, { code: "Period" }] },
      { id: "Observation.value[x]", path: "Observation.value[x]", min: 0, max: "1", short: "Observation value", type: [{ code: "Quantity" }, { code: "CodeableConcept" }, { code: "string" }, { code: "boolean" }, { code: "Range" }, { code: "Ratio" }] },
    ],
  },
};
