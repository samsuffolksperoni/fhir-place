import { describe, expect, it } from "vitest";
import { codesFromValueSet } from "../binding.js";
import { bundledValueSetUrls, coreValueSet, coreValueSets } from "./valuesets.js";

describe("bundled core ValueSets", () => {
  it("returns undefined for an unknown canonical URL", () => {
    expect(coreValueSet("http://example.org/unknown")).toBeUndefined();
    expect(coreValueSet(undefined)).toBeUndefined();
  });

  it("bundles administrative-gender with the four spec values", () => {
    const vs = coreValueSet("http://hl7.org/fhir/ValueSet/administrative-gender");
    expect(vs).toBeDefined();
    const codes = codesFromValueSet(vs);
    expect(codes.map((c) => c.code)).toEqual(["male", "female", "other", "unknown"]);
    expect(codes.every((c) => c.system === "http://hl7.org/fhir/administrative-gender")).toBe(true);
  });

  it("bundles observation-status with the 8 spec values", () => {
    const vs = coreValueSet("http://hl7.org/fhir/ValueSet/observation-status");
    expect(vs).toBeDefined();
    const codes = codesFromValueSet(vs).map((c) => c.code);
    expect(codes).toContain("registered");
    expect(codes).toContain("final");
    expect(codes).toContain("entered-in-error");
    expect(codes.length).toBe(8);
  });

  it("bundles task-status with 'in-progress' included", () => {
    const codes = codesFromValueSet(
      coreValueSet("http://hl7.org/fhir/ValueSet/task-status"),
    );
    expect(codes.map((c) => c.code)).toContain("in-progress");
  });

  it("exposes every bundled URL via bundledValueSetUrls", () => {
    expect(bundledValueSetUrls.length).toBeGreaterThanOrEqual(13);
    for (const url of bundledValueSetUrls) {
      expect(coreValueSet(url)).toBeDefined();
    }
    // Internal Map and the URL list agree.
    expect(new Set(bundledValueSetUrls)).toEqual(new Set(coreValueSets.keys()));
  });

  it("every bundled ValueSet produces at least one code", () => {
    for (const url of bundledValueSetUrls) {
      const codes = codesFromValueSet(coreValueSet(url));
      expect(codes.length).toBeGreaterThan(0);
    }
  });

  // Issue #44: token search params on these compartment resources should
  // resolve through the offline bundle, not fall back to free-text inputs.
  it.each([
    // [resource, search-param, bound canonical, expected representative code]
    ["MedicationRequest", "status", "http://hl7.org/fhir/ValueSet/medicationrequest-status", "active"],
    ["MedicationRequest", "intent", "http://hl7.org/fhir/ValueSet/medicationrequest-intent", "order"],
    ["MedicationRequest", "priority", "http://hl7.org/fhir/ValueSet/request-priority", "routine"],
    ["MedicationRequest", "category", "http://hl7.org/fhir/ValueSet/medicationrequest-category", "outpatient"],
    ["Procedure", "status", "http://hl7.org/fhir/ValueSet/event-status", "completed"],
    ["AllergyIntolerance", "verification-status", "http://hl7.org/fhir/ValueSet/allergyintolerance-verification", "confirmed"],
    ["AllergyIntolerance", "category", "http://hl7.org/fhir/ValueSet/allergy-intolerance-category", "medication"],
    ["AllergyIntolerance", "criticality", "http://hl7.org/fhir/ValueSet/allergy-intolerance-criticality", "high"],
    ["AllergyIntolerance", "type", "http://hl7.org/fhir/ValueSet/allergy-intolerance-type", "allergy"],
    ["Encounter", "status", "http://hl7.org/fhir/ValueSet/encounter-status", "in-progress"],
    ["Encounter", "class", "http://terminology.hl7.org/ValueSet/v3-ActEncounterCode", "AMB"],
    ["Immunization", "status", "http://hl7.org/fhir/ValueSet/immunization-status", "completed"],
  ])("ships ValueSet for %s.%s (%s)", (_resource, _param, canonical, expectedCode) => {
    const vs = coreValueSet(canonical);
    expect(vs).toBeDefined();
    const codes = codesFromValueSet(vs).map((c) => c.code);
    expect(codes).toContain(expectedCode);
  });
});
