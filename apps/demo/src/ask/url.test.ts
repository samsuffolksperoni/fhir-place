import { describe, expect, it } from "vitest";
import { buildSearchUrl, parseSearchUrl } from "./url.js";

describe("buildSearchUrl", () => {
  it("appends params to resource type", () => {
    expect(
      buildSearchUrl("https://hapi.fhir.org/baseR4", {
        resourceType: "Patient",
        params: {
          "_has:Condition:patient:code": "44054006",
          birthdate: "lt1961-01-01",
        },
      }),
    ).toBe(
      "https://hapi.fhir.org/baseR4/Patient?_has%3ACondition%3Apatient%3Acode=44054006&birthdate=lt1961-01-01",
    );
  });

  it("trims a trailing slash from baseUrl", () => {
    expect(
      buildSearchUrl("https://x.example/fhir/", {
        resourceType: "Observation",
        params: {},
      }),
    ).toBe("https://x.example/fhir/Observation");
  });

  it("skips empty values", () => {
    expect(
      buildSearchUrl("https://x/fhir", {
        resourceType: "Patient",
        params: { name: "ada", gender: "" },
      }),
    ).toBe("https://x/fhir/Patient?name=ada");
  });
});

describe("parseSearchUrl", () => {
  it("splits resource type, base, and params", () => {
    const parsed = parseSearchUrl(
      "https://hapi.fhir.org/baseR4/Patient?name=ada&_count=20",
    );
    expect(parsed.resourceType).toBe("Patient");
    expect(parsed.baseUrl).toBe("https://hapi.fhir.org/baseR4");
    expect(parsed.params).toEqual({ name: "ada", _count: "20" });
  });

  it("decodes encoded params", () => {
    const parsed = parseSearchUrl(
      "https://x/fhir/Patient?_has%3ACondition%3Apatient%3Acode=44054006",
    );
    expect(parsed.params).toEqual({
      "_has:Condition:patient:code": "44054006",
    });
  });
});
