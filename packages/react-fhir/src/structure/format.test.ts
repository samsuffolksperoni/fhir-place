import type {
  Address,
  CodeableConcept,
  Coding,
  HumanName,
  Patient,
  Period,
  Quantity,
} from "fhir/r4";
import { describe, expect, it } from "vitest";
import {
  formatAddress,
  formatCodeableConcept,
  formatCoding,
  formatHumanName,
  formatPeriod,
  formatQuantity,
  formatReferenceLabel,
} from "./format.js";

describe("formatHumanName", () => {
  it("prefers .text when present", () => {
    expect(formatHumanName({ text: "Dr. Ada Lovelace" })).toBe("Dr. Ada Lovelace");
  });

  it("joins prefix / given / family / suffix in order", () => {
    expect(
      formatHumanName({
        prefix: ["Dr."],
        given: ["Ada", "Augusta"],
        family: "Lovelace",
        suffix: ["PhD"],
      }),
    ).toBe("Dr. Ada Augusta Lovelace PhD");
  });

  it("returns '' for an empty HumanName", () => {
    expect(formatHumanName({} as HumanName)).toBe("");
  });

  it("returns '' for undefined", () => {
    expect(formatHumanName(undefined)).toBe("");
  });
});

describe("formatAddress", () => {
  it("prefers .text", () => {
    expect(formatAddress({ text: "1 Workhouse Lane, London" })).toBe(
      "1 Workhouse Lane, London",
    );
  });

  it("joins line / city / state / postalCode / country", () => {
    expect(
      formatAddress({
        line: ["1 Workhouse Lane", "Apt 2"],
        city: "London",
        state: "Greater London",
        postalCode: "EC1",
        country: "UK",
      }),
    ).toBe("1 Workhouse Lane, Apt 2, London, Greater London, EC1, UK");
  });

  it("returns '' for an empty / undefined address", () => {
    expect(formatAddress({} as Address)).toBe("");
    expect(formatAddress(undefined)).toBe("");
  });
});

describe("formatCoding", () => {
  it("returns display when present", () => {
    expect(
      formatCoding({ system: "http://snomed.info/sct", code: "73211009", display: "Diabetes" }),
    ).toBe("Diabetes");
  });

  it("falls back to system#code when display is missing", () => {
    expect(formatCoding({ system: "http://snomed.info/sct", code: "73211009" })).toBe(
      "http://snomed.info/sct#73211009",
    );
  });

  it("falls back to bare code when system is missing", () => {
    expect(formatCoding({ code: "x" } as Coding)).toBe("x");
  });

  it("returns '' for undefined", () => {
    expect(formatCoding(undefined)).toBe("");
  });
});

describe("formatCodeableConcept", () => {
  it("prefers .text", () => {
    expect(formatCodeableConcept({ text: "Diabetes mellitus" })).toBe(
      "Diabetes mellitus",
    );
  });

  it("falls back to the first coding's display", () => {
    expect(
      formatCodeableConcept({
        coding: [{ display: "First" }, { display: "Second" }],
      } as CodeableConcept),
    ).toBe("First");
  });

  it("falls back to the first coding's code when no display", () => {
    expect(
      formatCodeableConcept({ coding: [{ code: "abc" }] } as CodeableConcept),
    ).toBe("abc");
  });

  it("returns '' when there is nothing to render", () => {
    expect(formatCodeableConcept({} as CodeableConcept)).toBe("");
    expect(formatCodeableConcept(undefined)).toBe("");
  });
});

describe("formatQuantity", () => {
  it("renders value + unit", () => {
    expect(formatQuantity({ value: 70, unit: "kg" })).toBe("70 kg");
  });

  it("uses code when unit is missing", () => {
    expect(formatQuantity({ value: 5, code: "mg" } as Quantity)).toBe("5 mg");
  });

  it("includes the comparator when present", () => {
    expect(formatQuantity({ comparator: ">=", value: 90, unit: "mmHg" })).toBe(
      ">=90 mmHg",
    );
  });

  it("trims to just the value when unit and code are missing", () => {
    expect(formatQuantity({ value: 42 } as Quantity)).toBe("42");
  });

  it("returns '' for undefined / empty", () => {
    expect(formatQuantity(undefined)).toBe("");
    expect(formatQuantity({} as Quantity)).toBe("");
  });
});

describe("formatPeriod", () => {
  it("renders start and end with an arrow", () => {
    expect(formatPeriod({ start: "2024-01-01", end: "2024-06-30" })).toBe(
      "2024-01-01 → 2024-06-30",
    );
  });

  it("uses … for missing endpoints", () => {
    expect(formatPeriod({ start: "2024-01-01" } as Period)).toBe(
      "2024-01-01 → …",
    );
    expect(formatPeriod({ end: "2024-06-30" } as Period)).toBe("… → 2024-06-30");
  });

  it("returns '' for undefined", () => {
    expect(formatPeriod(undefined)).toBe("");
  });
});

describe("formatReferenceLabel", () => {
  it("formats Patient via HumanName", () => {
    const p: Patient = {
      resourceType: "Patient",
      id: "ada",
      name: [{ given: ["Ada"], family: "Lovelace" }],
    };
    expect(formatReferenceLabel(p)).toBe("Ada Lovelace");
  });

  it("uses HumanName.text when set", () => {
    const p: Patient = {
      resourceType: "Patient",
      id: "x",
      name: [{ text: "Dr. Ada Lovelace, PhD" }],
    };
    expect(formatReferenceLabel(p)).toBe("Dr. Ada Lovelace, PhD");
  });

  it("falls back to {Type}/{id} when the HumanName is empty", () => {
    const p: Patient = {
      resourceType: "Patient",
      id: "p1",
      name: [{}], // no fields populated
    };
    expect(formatReferenceLabel(p)).toBe("Patient/p1");
  });

  it("uses Organization.name (string)", () => {
    expect(
      formatReferenceLabel({
        resourceType: "Organization",
        id: "acme",
        name: "Acme Health",
      } as unknown as Patient),
    ).toBe("Acme Health");
  });

  it("uses CodeableConcept-bearing resources via .code.text", () => {
    expect(
      formatReferenceLabel({
        resourceType: "Observation",
        id: "obs",
        code: { text: "Systolic BP" },
      } as unknown as Patient),
    ).toBe("Systolic BP");
  });

  it("uses CodeableConcept coding[0].display when code.text is missing", () => {
    expect(
      formatReferenceLabel({
        resourceType: "Observation",
        id: "obs2",
        code: { coding: [{ display: "Heart rate" }] },
      } as unknown as Patient),
    ).toBe("Heart rate");
  });

  it("falls back to title (e.g. Composition)", () => {
    expect(
      formatReferenceLabel({
        resourceType: "Composition",
        id: "c1",
        title: "Discharge summary",
      } as unknown as Patient),
    ).toBe("Discharge summary");
  });

  it("uses {Type}/{id} as the absolute fallback", () => {
    expect(
      formatReferenceLabel({
        resourceType: "Device",
        id: "d1",
      } as unknown as Patient),
    ).toBe("Device/d1");
  });

  it("trims trailing slash when the resource has no id", () => {
    expect(
      formatReferenceLabel({
        resourceType: "Device",
      } as unknown as Patient),
    ).toBe("Device");
  });
});
