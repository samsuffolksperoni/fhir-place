import type { Patient } from "fhir/r4";
import { describe, expect, it } from "vitest";
import { PatientStructureDefinition } from "../../test/fixtures/StructureDefinition-Patient.js";
import {
  directChildren,
  findElement,
  isPrimitive,
  walkObject,
  walkResource,
} from "./walker.js";

const patient: Patient = {
  resourceType: "Patient",
  id: "abc",
  active: true,
  name: [{ given: ["Ada"], family: "Lovelace" }],
  gender: "female",
  birthDate: "1815-12-10",
  deceasedDateTime: "1852-11-27",
  address: [{ line: ["1 Workhouse Lane"], city: "London" }],
};

describe("directChildren", () => {
  it("returns only direct children of a path, not grandchildren", () => {
    const children = directChildren(PatientStructureDefinition, "Patient");
    const paths = children.map((e) => e.path);
    expect(paths).toContain("Patient.name");
    expect(paths).toContain("Patient.contact");
    expect(paths).not.toContain("Patient.contact.name");
  });

  it("returns children of a nested path", () => {
    const children = directChildren(PatientStructureDefinition, "Patient.contact");
    const paths = children.map((e) => e.path);
    expect(paths).toEqual([
      "Patient.contact.relationship",
      "Patient.contact.name",
    ]);
  });
});

describe("findElement", () => {
  it("locates an element by exact path", () => {
    const el = findElement(PatientStructureDefinition, "Patient.gender");
    expect(el?.type?.[0]?.code).toBe("code");
  });

  it("returns undefined for unknown paths", () => {
    expect(findElement(PatientStructureDefinition, "Patient.wat")).toBeUndefined();
  });
});

describe("walkResource", () => {
  it("emits only elements present in the resource, in SD order", () => {
    const walked = walkResource(PatientStructureDefinition, patient);
    const keys = walked.map((w) => w.key);
    expect(keys).toEqual([
      "id",
      "active",
      "name",
      "gender",
      "birthDate",
      "deceasedDateTime",
      "address",
    ]);
  });

  it("marks array elements correctly", () => {
    const walked = walkResource(PatientStructureDefinition, patient);
    expect(walked.find((w) => w.key === "name")?.isArray).toBe(true);
    expect(walked.find((w) => w.key === "gender")?.isArray).toBe(false);
  });

  it("resolves choice elements to the concrete variant", () => {
    const walked = walkResource(PatientStructureDefinition, patient);
    const deceased = walked.find((w) => w.path === "Patient.deceased[x]");
    expect(deceased?.isChoice).toBe(true);
    expect(deceased?.key).toBe("deceasedDateTime");
    expect(deceased?.typeCode).toBe("dateTime");
    expect(deceased?.value).toBe("1852-11-27");
  });

  it("skips empty arrays", () => {
    const walked = walkResource(PatientStructureDefinition, {
      ...patient,
      identifier: [],
    } as Patient);
    expect(walked.find((w) => w.key === "identifier")).toBeUndefined();
  });

  it("skips null and undefined values", () => {
    const walked = walkResource(PatientStructureDefinition, {
      resourceType: "Patient",
      id: "x",
      active: undefined,
      name: null,
    } as unknown as Patient);
    const keys = walked.map((w) => w.key);
    expect(keys).toEqual(["id"]);
  });

  it("uses the element.short as label when it fits", () => {
    const walked = walkResource(PatientStructureDefinition, patient);
    const gender = walked.find((w) => w.key === "gender");
    expect(gender?.label).toBe("male | female | other | unknown");
  });
});

describe("walkObject", () => {
  it("walks a backbone element at a nested path", () => {
    const contact = {
      name: { given: ["Jane"], family: "Doe" },
    };
    const walked = walkObject(PatientStructureDefinition, "Patient.contact", contact);
    expect(walked.map((w) => w.key)).toEqual(["name"]);
    expect(walked[0]?.typeCode).toBe("HumanName");
  });
});

describe("isPrimitive", () => {
  it("recognises FHIR primitives", () => {
    expect(isPrimitive("string")).toBe(true);
    expect(isPrimitive("boolean")).toBe(true);
    expect(isPrimitive("dateTime")).toBe(true);
  });

  it("rejects complex types and undefined", () => {
    expect(isPrimitive("HumanName")).toBe(false);
    expect(isPrimitive("BackboneElement")).toBe(false);
    expect(isPrimitive(undefined)).toBe(false);
  });
});
