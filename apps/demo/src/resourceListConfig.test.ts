import { describe, expect, it } from "vitest";
import type {
  AllergyIntolerance,
  Immunization,
  Observation,
  Patient,
  Task,
} from "fhir/r4";
import { getPatientReference } from "./resourceListConfig.js";

describe("getPatientReference", () => {
  it("reads subject.reference for resources that use subject", () => {
    const obs: Observation = {
      resourceType: "Observation",
      status: "final",
      code: { text: "BP" },
      subject: { reference: "Patient/abc" },
    };
    expect(getPatientReference(obs)).toBe("Patient/abc");
  });

  it("reads patient.reference for AllergyIntolerance", () => {
    const allergy: AllergyIntolerance = {
      resourceType: "AllergyIntolerance",
      patient: { reference: "Patient/xyz" },
    };
    expect(getPatientReference(allergy)).toBe("Patient/xyz");
  });

  it("reads patient.reference for Immunization", () => {
    const imm: Immunization = {
      resourceType: "Immunization",
      status: "completed",
      vaccineCode: { text: "Flu" },
      patient: { reference: "Patient/imm-1" },
      occurrenceDateTime: "2024-01-01",
    };
    expect(getPatientReference(imm)).toBe("Patient/imm-1");
  });

  it("reads for.reference for Task", () => {
    const task: Task = {
      resourceType: "Task",
      status: "requested",
      intent: "order",
      for: { reference: "Patient/task-pat" },
    };
    expect(getPatientReference(task)).toBe("Patient/task-pat");
  });

  it("returns undefined when no patient/subject reference is present", () => {
    const patient: Patient = { resourceType: "Patient", id: "self" };
    expect(getPatientReference(patient)).toBeUndefined();
  });
});
