import type { SearchParameter } from "fhir/r4";
import { describe, expect, it } from "vitest";
import {
  elementPathForSearchParam,
  elementPathFromExpression,
  kebabToCamel,
} from "./searchBinding.js";

describe("kebabToCamel", () => {
  it("converts kebab-case to camelCase", () => {
    expect(kebabToCamel("address-city")).toBe("addressCity");
    expect(kebabToCamel("clinical-status")).toBe("clinicalStatus");
    expect(kebabToCamel("a-b-c")).toBe("aBC");
  });

  it("leaves single-word names untouched", () => {
    expect(kebabToCamel("name")).toBe("name");
    expect(kebabToCamel("status")).toBe("status");
  });

  it("preserves leading underscores on FHIR result-params", () => {
    expect(kebabToCamel("_id")).toBe("_id");
    expect(kebabToCamel("_count")).toBe("_count");
  });
});

describe("elementPathForSearchParam — convention fallback", () => {
  it("maps single-word params onto {base}.{name}", () => {
    expect(elementPathForSearchParam({ name: "status" }, "Observation")).toBe(
      "Observation.status",
    );
    expect(elementPathForSearchParam({ name: "gender" }, "Patient")).toBe(
      "Patient.gender",
    );
  });

  it("converts kebab to camel when building the path", () => {
    expect(
      elementPathForSearchParam({ name: "clinical-status" }, "Condition"),
    ).toBe("Condition.clinicalStatus");
    expect(
      elementPathForSearchParam({ name: "address-city" }, "Patient"),
    ).toBe("Patient.addressCity");
  });

  it("returns undefined for FHIR meta params that don't map to an element", () => {
    expect(elementPathForSearchParam({ name: "_id" }, "Patient")).toBeUndefined();
    expect(elementPathForSearchParam({ name: "_lastUpdated" }, "Patient")).toBeUndefined();
  });

  it("returns undefined for chained or modified params", () => {
    expect(
      elementPathForSearchParam({ name: "patient.name" }, "Observation"),
    ).toBeUndefined();
    expect(
      elementPathForSearchParam({ name: "identifier:contains" }, "Patient"),
    ).toBeUndefined();
  });

  it("returns undefined for empty / missing name", () => {
    expect(elementPathForSearchParam({ name: "" }, "Patient")).toBeUndefined();
    expect(
      elementPathForSearchParam({ name: undefined as unknown as string }, "Patient"),
    ).toBeUndefined();
  });
});

describe("elementPathFromExpression", () => {
  it("returns simple {base}.{element} expressions verbatim", () => {
    expect(elementPathFromExpression("Patient.name", "Patient")).toBe("Patient.name");
    expect(
      elementPathFromExpression("Observation.subject", "Observation"),
    ).toBe("Observation.subject");
  });

  it("supports nested element paths", () => {
    expect(
      elementPathFromExpression("Patient.address.city", "Patient"),
    ).toBe("Patient.address.city");
  });

  it("picks the first union arm whose root matches `base`", () => {
    // The classic shape: a search param expression that unions multiple paths.
    expect(
      elementPathFromExpression("Patient.name | Patient.alias", "Patient"),
    ).toBe("Patient.name");
  });

  it("rejects FHIRPath expressions with function syntax", () => {
    expect(
      elementPathFromExpression("Encounter.subject.where(resolve() is Patient)", "Encounter"),
    ).toBeUndefined();
    expect(
      elementPathFromExpression("Observation.value.as(Quantity)", "Observation"),
    ).toBeUndefined();
    expect(
      elementPathFromExpression("(Patient | Group).id", "Patient"),
    ).toBeUndefined();
  });

  it("rejects expressions whose root does not match the resource type", () => {
    expect(
      elementPathFromExpression("Encounter.subject", "Patient"),
    ).toBeUndefined();
  });
});

describe("elementPathForSearchParam — spec-aware (with SearchParameter)", () => {
  it("prefers SearchParameter.expression over the kebab→camel convention", () => {
    const spec: SearchParameter = {
      resourceType: "SearchParameter",
      url: "http://example/sp/Patient-given",
      name: "given",
      status: "active",
      description: "Given names",
      code: "given",
      base: ["Patient"],
      type: "string",
      expression: "Patient.name.given",
    };
    expect(
      elementPathForSearchParam({ name: "given" }, "Patient", spec),
    ).toBe("Patient.name.given");
  });

  it("falls back to the convention when the expression is non-renderable", () => {
    const spec: SearchParameter = {
      resourceType: "SearchParameter",
      url: "http://example/sp/Encounter-subject",
      name: "subject",
      status: "active",
      description: "The subject of the encounter",
      code: "subject",
      base: ["Encounter"],
      type: "reference",
      expression: "Encounter.subject.where(resolve() is Patient)",
    };
    // Spec expression has FHIRPath function syntax we can't render; convention fallback applies.
    expect(
      elementPathForSearchParam({ name: "subject" }, "Encounter", spec),
    ).toBe("Encounter.subject");
  });

  it("falls back to the convention when the spec is undefined", () => {
    expect(
      elementPathForSearchParam({ name: "gender" }, "Patient", undefined),
    ).toBe("Patient.gender");
  });

  it("returns undefined for composite params even with a spec, so callers fall back to text", () => {
    const spec: SearchParameter = {
      resourceType: "SearchParameter",
      url: "http://example/sp/Observation-code-value-quantity",
      name: "code-value-quantity",
      status: "active",
      description: "Composite code+value",
      code: "code-value-quantity",
      base: ["Observation"],
      type: "composite",
      expression: "Observation",
    };
    // composite expression doesn't drill to a single element; convention also
    // can't help (kebab "code-value-quantity" is not a real path).
    expect(
      elementPathForSearchParam(
        { name: "code-value-quantity" },
        "Observation",
        spec,
      ),
    ).toBe("Observation.codeValueQuantity"); // best-effort convention; binding lookup will simply miss
  });
});
