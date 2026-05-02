import { describe, it, expect } from "vitest";
import type { Observation, Patient } from "fhir/r4";
import {
  asUSCoreLaboratoryResultObservationProfile,
  asUSCorePatientProfile,
  type USCoreLaboratoryResultObservationProfile,
  type USCorePatientProfile,
} from "./us-core-7.js";

/**
 * Type-level test for the profile-aware codegen spike (issue #123).
 *
 * The assertions are compile-time. Each `// @ts-expect-error` line FAILS the
 * build if the assignment it guards becomes valid, which is exactly the
 * "did the brand actually narrow?" signal the spike needs.
 *
 * NB: per FHIR semantics, `mustSupport` is *not* the same as `min: 1`. A field
 * can be must-support but still legitimately omitted from a profile-conformant
 * resource. The spike therefore only promotes `min >= 1` elements to required
 * keys; must-support-without-cardinality fields stay optional and are recorded
 * in the JSDoc on the generated artifact.
 */
describe("US Core 7 spike — type-level narrowing", () => {
  it("rejects an unprofiled Patient missing min=1 fields", () => {
    const unprofiled: Patient = { resourceType: "Patient" };

    // @ts-expect-error - missing identifier/name/gender (min=1) and the
    // USCorePatientProfileBrand symbol.
    const profiled: USCorePatientProfile = unprofiled;

    expect(profiled).toBe(unprofiled);
  });

  it("rejects a Patient missing only `name` (a min=1 + MS field)", () => {
    const almost = {
      resourceType: "Patient",
      identifier: [{ system: "urn:test", value: "abc" }],
      // name omitted on purpose — should still error
      gender: "female",
    } satisfies Patient;

    // @ts-expect-error - missing `name` (min=1 + must-support per US Core)
    const profiled = asUSCorePatientProfile(almost);

    expect(profiled).toBeDefined();
  });

  it("accepts a Patient that omits MS-but-not-min=1 fields (telecom/address/etc.)", () => {
    // FHIR-correct semantics: must-support without min=1 means "if you store
    // it you must read+write it," NOT "you must include it." A profile-valid
    // Patient with no telecom/birthDate/address must type-check.
    const profiled = asUSCorePatientProfile({
      resourceType: "Patient",
      identifier: [{ system: "urn:test", value: "abc" }],
      name: [{ family: "Smith", given: ["Jane"] }],
      gender: "female",
      // telecom, birthDate, address, communication, extension all omitted
    });

    expect(profiled.gender).toBe("female");
  });

  it("accepts a fully-populated Patient via the as*() helper", () => {
    const profiled = asUSCorePatientProfile({
      resourceType: "Patient",
      identifier: [{ system: "urn:test", value: "abc" }],
      name: [{ family: "Smith", given: ["Jane"] }],
      telecom: [{ system: "phone", value: "555-0100" }],
      gender: "female",
      birthDate: "1990-01-01",
      address: [{ city: "Boston", state: "MA" }],
      communication: [{ language: { text: "en" } }],
      extension: [],
    });

    expect(profiled.resourceType).toBe("Patient");
    expect(profiled.name[0]?.family).toBe("Smith");
  });

  it("rejects a Lab Observation missing the required choice `effective[x]`", () => {
    const almost = {
      resourceType: "Observation",
      status: "final",
      category: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/observation-category",
              code: "laboratory",
            },
          ],
        },
      ],
      code: { coding: [{ system: "http://loinc.org", code: "789-8" }] },
      subject: { reference: "Patient/123" },
      // effective[x] omitted — min=1 in US Core
    } satisfies Observation;

    // @ts-expect-error - effective[x] is min=1 but no variant is supplied
    const profiled = asUSCoreLaboratoryResultObservationProfile(almost);

    expect(profiled).toBeDefined();
  });

  it("accepts a Lab Observation with `effectiveDateTime` (one variant of the choice)", () => {
    const profiled = asUSCoreLaboratoryResultObservationProfile({
      resourceType: "Observation",
      status: "final",
      category: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/observation-category",
              code: "laboratory",
            },
          ],
        },
      ],
      code: { coding: [{ system: "http://loinc.org", code: "789-8" }] },
      subject: { reference: "Patient/123" },
      effectiveDateTime: "2026-04-01T10:00:00Z",
    });

    type _Profiled = USCoreLaboratoryResultObservationProfile;
    expect(profiled.status).toBe("final");
  });

  it("accepts a Lab Observation with `effectivePeriod` (the other variant)", () => {
    const profiled = asUSCoreLaboratoryResultObservationProfile({
      resourceType: "Observation",
      status: "final",
      category: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/observation-category",
              code: "laboratory",
            },
          ],
        },
      ],
      code: { coding: [{ system: "http://loinc.org", code: "789-8" }] },
      subject: { reference: "Patient/123" },
      effectivePeriod: { start: "2026-04-01", end: "2026-04-02" },
    });

    expect(profiled.status).toBe("final");
  });
});
