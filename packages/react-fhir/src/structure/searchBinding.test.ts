import { describe, expect, it } from "vitest";
import { elementPathForSearchParam, kebabToCamel } from "./searchBinding.js";

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

describe("elementPathForSearchParam", () => {
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
