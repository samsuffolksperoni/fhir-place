import type { Patient } from "fhir/r4";
import { describe, expect, it } from "vitest";
import { PatientStructureDefinition } from "../../test/fixtures/StructureDefinition-Patient.js";
import type { StructureDefinition } from "fhir/r4";
import {
  directChildren,
  findChoiceVariant,
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

  it("falls back to the path for enum-shaped short descriptions", () => {
    const walked = walkResource(PatientStructureDefinition, patient);
    const gender = walked.find((w) => w.key === "gender");
    expect(gender?.label).toBe("Gender");
  });

  it("uses a short description when it looks like a label", () => {
    const walked = walkResource(PatientStructureDefinition, patient);
    const birth = walked.find((w) => w.key === "birthDate");
    expect(birth?.label).toBe("The date of birth for the individual");
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

describe("findChoiceVariant", () => {
  // Minimal Observation SD with a value[x] element exposing the most common
  // R4 variants. Mirrors the shape of the real R4 SD without pulling in the
  // full snapshot.
  const observationSd: StructureDefinition = {
    resourceType: "StructureDefinition",
    id: "Observation",
    url: "http://hl7.org/fhir/StructureDefinition/Observation",
    name: "Observation",
    status: "active",
    kind: "resource",
    abstract: false,
    type: "Observation",
    snapshot: {
      element: [
        { id: "Observation", path: "Observation", min: 0, max: "*" },
        {
          id: "Observation.status",
          path: "Observation.status",
          min: 1,
          max: "1",
          type: [{ code: "code" }],
        },
        {
          id: "Observation.value[x]",
          path: "Observation.value[x]",
          min: 0,
          max: "1",
          type: [
            { code: "Quantity" },
            { code: "CodeableConcept" },
            { code: "string" },
            { code: "boolean" },
            { code: "dateTime" },
            { code: "Period" },
          ],
        },
        {
          id: "Observation.effective[x]",
          path: "Observation.effective[x]",
          min: 0,
          max: "1",
          type: [{ code: "dateTime" }, { code: "Period" }],
        },
      ],
    },
  };

  it("resolves Quantity variant on Observation.value[x]", () => {
    const v = findChoiceVariant(observationSd, "Observation.valueQuantity");
    expect(v?.typeCode).toBe("Quantity");
    expect(v?.element.path).toBe("Observation.value[x]");
  });

  it("resolves CodeableConcept variant", () => {
    expect(
      findChoiceVariant(observationSd, "Observation.valueCodeableConcept")?.typeCode,
    ).toBe("CodeableConcept");
  });

  it("resolves primitive variants (string, boolean, dateTime)", () => {
    expect(findChoiceVariant(observationSd, "Observation.valueString")?.typeCode).toBe("string");
    expect(findChoiceVariant(observationSd, "Observation.valueBoolean")?.typeCode).toBe("boolean");
    expect(findChoiceVariant(observationSd, "Observation.valueDateTime")?.typeCode).toBe("dateTime");
  });

  it("resolves variants on a different choice element on the same SD", () => {
    expect(
      findChoiceVariant(observationSd, "Observation.effectivePeriod")?.typeCode,
    ).toBe("Period");
  });

  it("returns undefined for non-choice paths", () => {
    expect(findChoiceVariant(observationSd, "Observation.status")).toBeUndefined();
  });

  it("returns undefined when the variant doesn't match any [x] type", () => {
    // valueAttachment isn't in our minimal type list above.
    expect(
      findChoiceVariant(observationSd, "Observation.valueAttachment"),
    ).toBeUndefined();
  });

  it("returns undefined when the leaf has no recognisable suffix", () => {
    expect(findChoiceVariant(observationSd, "Observation.foo")).toBeUndefined();
    expect(findChoiceVariant(observationSd, "Observation")).toBeUndefined();
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
