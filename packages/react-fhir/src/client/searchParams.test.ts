import { describe, expect, it } from "vitest";
import { buildSearchParams } from "./searchParams.js";

describe("buildSearchParams", () => {
  it("returns an empty URLSearchParams when given undefined", () => {
    expect(buildSearchParams(undefined).toString()).toBe("");
  });

  it("formats strings, numbers, booleans", () => {
    const qs = buildSearchParams({ name: "smith", _count: 20, active: true });
    expect(qs.get("name")).toBe("smith");
    expect(qs.get("_count")).toBe("20");
    expect(qs.get("active")).toBe("true");
  });

  it("emits arrays as repeated keys (AND semantics)", () => {
    const qs = buildSearchParams({ identifier: ["a", "b"] });
    expect(qs.getAll("identifier")).toEqual(["a", "b"]);
  });

  it("preserves comma-joined strings for OR semantics", () => {
    const qs = buildSearchParams({ code: "a,b" });
    expect(qs.getAll("code")).toEqual(["a,b"]);
  });

  it("skips undefined and null values", () => {
    const qs = buildSearchParams({ name: undefined, gender: "female" });
    expect(qs.has("name")).toBe(false);
    expect(qs.get("gender")).toBe("female");
  });

  it("serialises Date values to ISO strings", () => {
    const qs = buildSearchParams({ date: new Date("2024-01-02T03:04:05.000Z") });
    expect(qs.get("date")).toBe("2024-01-02T03:04:05.000Z");
  });

  it("supports FHIR prefix operators on date", () => {
    const qs = buildSearchParams({ date: "ge2024-01-01" });
    expect(qs.get("date")).toBe("ge2024-01-01");
  });
});
