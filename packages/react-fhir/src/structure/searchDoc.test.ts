import { describe, expect, it } from "vitest";
import { clipSearchParamDoc } from "./searchDoc.js";

describe("clipSearchParamDoc", () => {
  it("returns undefined for empty input", () => {
    expect(clipSearchParamDoc(undefined, "Patient")).toBeUndefined();
    expect(clipSearchParamDoc("", "Patient")).toBeUndefined();
  });

  it("extracts the bullet for the matching resource type from a Multiple Resources dump", () => {
    const doc =
      "Multiple Resources:   * [AllergyIntolerance](allergyintolerance.html): External ids for this item * [MedicationRequest](medicationrequest.html): Return prescriptions with this external identifier * [Observation](observation.html): The unique id for a particular observation";
    expect(clipSearchParamDoc(doc, "MedicationRequest")).toBe(
      "Return prescriptions with this external identifier",
    );
    expect(clipSearchParamDoc(doc, "AllergyIntolerance")).toBe(
      "External ids for this item",
    );
  });

  it("falls back to the first sentence when the resource isn't in the bullet list", () => {
    const doc =
      "Multiple Resources:   * [AllergyIntolerance](allergyintolerance.html): External ids for this item * [CarePlan](careplan.html): External Ids for this plan";
    // ServiceRequest isn't in the bullet list → first sentence of the whole doc
    const result = clipSearchParamDoc(doc, "ServiceRequest");
    expect(result).toContain("Multiple Resources");
    expect(result!.length).toBeLessThanOrEqual(140);
  });

  it("truncates a long single-sentence doc with an ellipsis", () => {
    const doc = "x".repeat(300);
    const result = clipSearchParamDoc(doc, "Patient")!;
    expect(result.length).toBeLessThanOrEqual(141);
    expect(result.endsWith("…")).toBe(true);
  });

  it("returns short per-resource docs unchanged", () => {
    expect(clipSearchParamDoc("Who the condition is about", "Condition")).toBe(
      "Who the condition is about",
    );
  });

  it("case-insensitively matches the Multiple Resources header", () => {
    const doc =
      "multiple resources: * [Condition](condition.html): A unique identifier of the condition record";
    expect(clipSearchParamDoc(doc, "Condition")).toBe(
      "A unique identifier of the condition record",
    );
  });

  it("escapes regex metacharacters in the resource type", () => {
    // Not a real FHIR type, but shouldn't throw or misbehave
    expect(() => clipSearchParamDoc("something", "Foo.Bar")).not.toThrow();
  });
});
