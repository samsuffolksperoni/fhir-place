import type { ValueSet } from "fhir/r4";
import { describe, expect, it } from "vitest";
import { bindingFor, codesFromValueSet } from "./binding.js";

describe("bindingFor", () => {
  it("returns empty fields when element has no binding", () => {
    expect(bindingFor({ path: "Foo.bar" })).toEqual({
      strength: undefined,
      valueSet: undefined,
      description: undefined,
    });
  });

  it("returns undefined when element is undefined", () => {
    expect(bindingFor(undefined)).toEqual({
      strength: undefined,
      valueSet: undefined,
      description: undefined,
    });
  });

  it("extracts strength + valueSet when present", () => {
    expect(
      bindingFor({
        path: "Patient.gender",
        binding: {
          strength: "required",
          valueSet: "http://hl7.org/fhir/ValueSet/administrative-gender",
          description: "The gender of a person used for administrative purposes.",
        },
      }),
    ).toEqual({
      strength: "required",
      valueSet: "http://hl7.org/fhir/ValueSet/administrative-gender",
      description: "The gender of a person used for administrative purposes.",
    });
  });
});

describe("codesFromValueSet", () => {
  it("returns [] for undefined input", () => {
    expect(codesFromValueSet(undefined)).toEqual([]);
  });

  it("reads the expanded expansion.contains list when present", () => {
    const vs: ValueSet = {
      resourceType: "ValueSet",
      status: "active",
      url: "http://hl7.org/fhir/ValueSet/administrative-gender",
      expansion: {
        identifier: "x",
        timestamp: "2024-01-01T00:00:00Z",
        contains: [
          { system: "http://hl7.org/fhir/administrative-gender", code: "male", display: "Male" },
          { system: "http://hl7.org/fhir/administrative-gender", code: "female", display: "Female" },
          { system: "http://hl7.org/fhir/administrative-gender", code: "other", display: "Other" },
          { system: "http://hl7.org/fhir/administrative-gender", code: "unknown", display: "Unknown" },
        ],
      },
    };
    const codes = codesFromValueSet(vs);
    expect(codes.map((c) => c.code)).toEqual(["male", "female", "other", "unknown"]);
    expect(codes.every((c) => c.system === "http://hl7.org/fhir/administrative-gender")).toBe(true);
  });

  it("flattens nested expansion.contains (hierarchical ValueSets)", () => {
    const vs: ValueSet = {
      resourceType: "ValueSet",
      status: "active",
      expansion: {
        identifier: "x",
        timestamp: "2024-01-01T00:00:00Z",
        contains: [
          {
            system: "s",
            code: "group-A",
            display: "Group A",
            contains: [
              { system: "s", code: "a1" },
              { system: "s", code: "a2" },
            ],
          },
          { system: "s", code: "b1" },
        ],
      },
    };
    const codes = codesFromValueSet(vs);
    expect(codes.map((c) => c.code)).toEqual(["group-A", "b1", "a1", "a2"]);
  });

  it("falls back to compose.include[].concept[] when there is no expansion", () => {
    const vs: ValueSet = {
      resourceType: "ValueSet",
      status: "active",
      compose: {
        include: [
          {
            system: "http://hl7.org/fhir/task-status",
            concept: [
              { code: "draft", display: "Draft" },
              { code: "requested", display: "Requested" },
              { code: "in-progress", display: "In Progress" },
            ],
          },
        ],
      },
    };
    const codes = codesFromValueSet(vs);
    expect(codes).toHaveLength(3);
    expect(codes[0]).toEqual({
      system: "http://hl7.org/fhir/task-status",
      code: "draft",
      display: "Draft",
    });
  });

  it("prefers expansion over compose when both are present", () => {
    const vs: ValueSet = {
      resourceType: "ValueSet",
      status: "active",
      expansion: {
        identifier: "x",
        timestamp: "2024-01-01T00:00:00Z",
        contains: [{ system: "s", code: "from-expansion" }],
      },
      compose: {
        include: [{ system: "s", concept: [{ code: "from-compose" }] }],
      },
    };
    expect(codesFromValueSet(vs).map((c) => c.code)).toEqual(["from-expansion"]);
  });

  it("ignores compose.include entries that only reference other ValueSets", () => {
    const vs: ValueSet = {
      resourceType: "ValueSet",
      status: "active",
      compose: {
        include: [
          {
            system: "http://hl7.org/fhir/task-status",
            concept: [{ code: "draft" }],
          },
          {
            valueSet: ["http://example.com/other"], // recursive includes not supported
          },
        ],
      },
    };
    expect(codesFromValueSet(vs).map((c) => c.code)).toEqual(["draft"]);
  });
});
