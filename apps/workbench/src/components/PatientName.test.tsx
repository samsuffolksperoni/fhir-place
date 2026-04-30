import { describe, expect, it } from "vitest";
import { patientDisplayName, formatHumanName } from "./PatientName.js";

describe("patientDisplayName", () => {
  it("prefers official > usual > first name", () => {
    expect(
      patientDisplayName({
        resourceType: "Patient",
        name: [
          { use: "usual", text: "Grace" },
          { use: "official", family: "Hopper", given: ["Grace"] },
        ],
      }),
    ).toBe("Grace Hopper");
  });

  it("falls back to .text when given/family missing", () => {
    expect(
      patientDisplayName({
        resourceType: "Patient",
        name: [{ text: "Unknown" }],
      }),
    ).toBe("Unknown");
  });

  it("returns (no name) when name array is empty", () => {
    expect(patientDisplayName({ resourceType: "Patient", name: [] })).toBe(
      "(no name)",
    );
  });

  it("returns (unknown) when patient is undefined", () => {
    expect(patientDisplayName(undefined)).toBe("(unknown)");
  });
});

describe("formatHumanName", () => {
  it("joins given and family", () => {
    expect(formatHumanName({ given: ["Jane", "Q."], family: "Doe" })).toBe(
      "Jane Q. Doe",
    );
  });

  it("returns (no name) for an empty HumanName", () => {
    expect(formatHumanName({})).toBe("(no name)");
  });
});
