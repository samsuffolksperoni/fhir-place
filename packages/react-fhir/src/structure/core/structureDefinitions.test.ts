import { describe, expect, it } from "vitest";
import { bundledCoreTypes, coreStructureDefinition } from "./index.js";

describe("bundled core StructureDefinitions", () => {
  it("exposes all declared types via coreStructureDefinition", async () => {
    for (const type of bundledCoreTypes) {
      const sd = await coreStructureDefinition(type);
      expect(sd, `${type} should be bundled`).toBeDefined();
      expect(sd!.type).toBe(type);
      expect(sd!.kind).toBe("resource");
      expect(sd!.snapshot?.element?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it("returns undefined for unknown types", async () => {
    expect(await coreStructureDefinition("MadeUpThing")).toBeUndefined();
  });

  it("includes status for the 6 compartment types so token status fields render correctly", async () => {
    const compartmentTypes = [
      "Condition",
      "MedicationRequest",
      "AllergyIntolerance",
      "Procedure",
      "Encounter",
      "Immunization",
    ];
    for (const type of compartmentTypes) {
      const sd = await coreStructureDefinition(type);
      const statusEl = sd!.snapshot!.element!.find(
        (e) =>
          e.path === `${type}.status` || e.path === `${type}.clinicalStatus`,
      );
      expect(
        statusEl,
        `${type} should include status or clinicalStatus`,
      ).toBeDefined();
    }
  });
});
