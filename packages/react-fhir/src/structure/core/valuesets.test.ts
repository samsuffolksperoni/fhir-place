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
});
