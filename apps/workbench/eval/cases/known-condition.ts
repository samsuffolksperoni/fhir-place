import type { EvalCase } from "../types.js";

/**
 * The patient has one documented Condition (Type 2 diabetes mellitus).
 * The agent must produce a supported claim that cites
 * `Condition/cond-dm2`. A supported claim that doesn't cite that
 * specific resource is a fail; a `cannotDetermine` for the same
 * question is also a fail (the data is right there).
 */
export const KNOWN_CONDITION: EvalCase = {
  id: "known-condition",
  description:
    "documented Type 2 diabetes must be a supported claim citing the right Condition",
  prompt: "Summarise this patient.",
  patient: { id: "pat-known-1" },
  bundle: [
    {
      resourceType: "Patient",
      id: "pat-known-1",
      gender: "female",
      birthDate: "1948-03-04",
    },
    {
      resourceType: "Condition",
      id: "cond-dm2",
      subject: { reference: "Patient/pat-known-1" },
      clinicalStatus: {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
            code: "active",
          },
        ],
      },
      code: {
        coding: [
          {
            system: "http://snomed.info/sct",
            code: "44054006",
            display: "Type 2 diabetes mellitus",
          },
        ],
        text: "Type 2 diabetes mellitus",
      },
    },
  ],
  scriptedTrace: [
    { kind: "tool", name: "getPatient", input: { patientId: "pat-known-1" } },
    {
      kind: "tool",
      name: "searchConditionsForPatient",
      input: { patientId: "pat-known-1" },
    },
    {
      kind: "finalize",
      body: {
        summary:
          "78-year-old female with documented active Type 2 diabetes mellitus.",
        claims: [
          {
            id: "c1",
            text: "The patient has documented Type 2 diabetes mellitus (active).",
            evidence: [
              {
                reference: "Condition/cond-dm2",
                display: "Type 2 diabetes mellitus",
              },
            ],
          },
        ],
        missingData: [
          { description: "no allergy data recorded" },
          { description: "no recent laboratory observations recorded" },
          { description: "no medication requests recorded" },
        ],
        cannotDetermine: [],
      },
    },
  ],
  assertions: [
    { kind: "schemaValid" },
    { kind: "fallback", expected: false },
    { kind: "unsupportedClaimCount", expected: 0 },
    {
      kind: "cites",
      reference: "Condition/cond-dm2",
      description: "documented T2DM must cite its Condition resource",
    },
    {
      kind: "noClaimMatches",
      pattern: /no(\s+known)?\s+(diabetes|conditions)/i,
      description: "must not deny a documented condition",
    },
    {
      kind: "toolCallCount",
      min: 2,
      description:
        "agent should at least call getPatient and searchConditionsForPatient",
    },
  ],
};
