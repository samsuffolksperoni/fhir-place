import { describe, expect, it } from "vitest";
import { searchBuilder } from "@fhir-place/react-fhir";

/**
 * Smoke tests for the builder expression used on TypedSearchPage.
 *
 * The page renders a live useTypedSearch call; we can't render that in a
 * pure Node test environment (no DOM). These tests verify that:
 *   1. The builder compiles under the project's strict TypeScript config.
 *   2. The serialised query string matches what the page intends to send.
 */
describe("TypedSearchPage builder expression", () => {
  it("produces the expected query string for the page's live query", () => {
    const builder = searchBuilder("Patient")
      .where("name", "Smith")
      .include("Patient:general-practitioner");

    expect(builder.build()).toBe(
      "Patient?name=Smith&_include=Patient%3Ageneral-practitioner",
    );
  });

  it("builder.build() starts with the resource type", () => {
    const builder = searchBuilder("Patient").where("name", "Smith");
    expect(builder.build().startsWith("Patient?")).toBe(true);
  });

  it("toSearchParams() exposes name and _include keys", () => {
    const params = searchBuilder("Patient")
      .where("name", "Smith")
      .include("Patient:general-practitioner")
      .toSearchParams();

    expect(params.get("name")).toBe("Smith");
    expect(params.get("_include")).toBe("Patient:general-practitioner");
  });
});
