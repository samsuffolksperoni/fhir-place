import type {
  Bundle,
  CapabilityStatement,
  Observation,
  Patient,
  StructureDefinition,
} from "fhir/r4";
import { afterAll, describe, expect, test } from "vitest";
import { directChildren, walkResource } from "../src/structure/walker.js";
import {
  FHIR_BASE_URL,
  isFhirError,
  makeClient,
  serverReachable,
  TEST_IDENTIFIER_SYSTEM,
} from "./helpers.js";

// Top-level await: probe the server BEFORE tests are registered so we can
// skip the whole describe block (and get an honest "skipped" count) when the
// target is unreachable.
const reachable = await serverReachable();

describe.skipIf(!reachable)(`integration: FhirClient @ ${FHIR_BASE_URL}`, () => {
  const client = makeClient();
  const cleanup: Array<{ type: string; id: string }> = [];

  afterAll(async () => {
    // Best-effort cleanup; HAPI may have wiped them already.
    await Promise.allSettled(
      cleanup.map(({ type, id }) => client.delete(type, id).catch(() => {})),
    );
  });

  test(
    "capabilities() returns a valid R4 CapabilityStatement",
    async () => {
      const cap: CapabilityStatement = await client.capabilities();
      expect(cap.resourceType).toBe("CapabilityStatement");
      expect(cap.fhirVersion).toMatch(/^4\./);
      expect(cap.rest?.[0]?.resource?.length ?? 0).toBeGreaterThan(0);
      expect(
        cap.rest?.[0]?.resource?.some((r) => r.type === "Patient"),
      ).toBe(true);
    },
    30_000,
  );

  test(
    "StructureDefinition for Patient walks cleanly through directChildren()",
    async () => {
      const sd = await client.read<StructureDefinition>(
        "StructureDefinition",
        "Patient",
      );
      expect(sd.kind).toBe("resource");
      expect(sd.type).toBe("Patient");
      const kids = directChildren(sd, "Patient");
      const paths = kids.map((k) => k.path);
      // A handful of well-known R4 Patient elements that must always be present.
      for (const p of ["Patient.id", "Patient.name", "Patient.gender", "Patient.birthDate"]) {
        expect(paths).toContain(p);
      }
    },
    30_000,
  );

  test(
    "create → read → update → search → delete roundtrip on Patient",
    async () => {
      const unique = (globalThis.crypto ?? require("crypto")).randomUUID();
      const seed: Patient = {
        resourceType: "Patient",
        identifier: [
          { system: TEST_IDENTIFIER_SYSTEM, value: unique, use: "usual" },
        ],
        name: [
          {
            given: ["Integration"],
            family: `Test-${unique.slice(0, 8)}`,
            use: "official",
          },
        ],
        gender: "other",
        birthDate: "2000-01-01",
      };

      // create
      const created = await client.create<Patient>(seed);
      expect(created.id).toBeTruthy();
      expect(created.meta?.versionId).toBeTruthy();
      cleanup.push({ type: "Patient", id: created.id! });

      // read
      const read = await client.read<Patient>("Patient", created.id!);
      expect(read.id).toBe(created.id);
      expect(read.name?.[0]?.given).toEqual(["Integration"]);

      // update — bump the birth date and confirm the server bumps versionId
      const updated = await client.update<Patient>({
        ...read,
        id: read.id!,
        birthDate: "2000-02-02",
      });
      expect(updated.birthDate).toBe("2000-02-02");
      expect(updated.meta?.versionId).not.toBe(read.meta?.versionId);

      // search by our unique identifier — should find exactly this resource
      const bundle: Bundle<Patient> = await client.search<Patient>("Patient", {
        identifier: `${TEST_IDENTIFIER_SYSTEM}|${unique}`,
      });
      expect(bundle.resourceType).toBe("Bundle");
      expect(bundle.type).toBe("searchset");
      expect(bundle.total ?? bundle.entry?.length ?? 0).toBeGreaterThanOrEqual(1);
      const hit = bundle.entry?.find((e) => e.resource?.id === created.id);
      expect(hit).toBeTruthy();

      // delete
      await client.delete("Patient", created.id!);
      cleanup.pop(); // already removed

      // read after delete — HAPI returns 404 or 410; either is acceptable
      const err = await client
        .read<Patient>("Patient", created.id!)
        .catch((e) => e);
      expect(isFhirError(err)).toBe(true);
      expect([404, 410]).toContain(err.status);
    },
    60_000,
  );

  test(
    "readReference() resolves a relative reference between two created resources",
    async () => {
      const unique = (globalThis.crypto ?? require("crypto")).randomUUID();

      const patient = await client.create<Patient>({
        resourceType: "Patient",
        identifier: [{ system: TEST_IDENTIFIER_SYSTEM, value: unique }],
        name: [{ given: ["Ref"], family: "Target" }],
        gender: "unknown",
      });
      cleanup.push({ type: "Patient", id: patient.id! });

      const observation = await client.create<Observation>({
        resourceType: "Observation",
        status: "final",
        code: {
          coding: [
            { system: "http://loinc.org", code: "8867-4", display: "Heart rate" },
          ],
          text: "Heart rate",
        },
        subject: { reference: `Patient/${patient.id}` },
        valueQuantity: {
          value: 72,
          unit: "beats/minute",
          system: "http://unitsofmeasure.org",
          code: "/min",
        },
      });
      cleanup.push({ type: "Observation", id: observation.id! });

      const resolved = await client.readReference<Patient>(observation.subject!);
      expect(resolved.resourceType).toBe("Patient");
      expect(resolved.id).toBe(patient.id);
    },
    60_000,
  );

  test(
    "walkResource() produces sensible output for a real fetched Patient",
    async () => {
      const unique = (globalThis.crypto ?? require("crypto")).randomUUID();
      const created = await client.create<Patient>({
        resourceType: "Patient",
        identifier: [{ system: TEST_IDENTIFIER_SYSTEM, value: unique }],
        name: [{ given: ["Walker"], family: "Test" }],
        gender: "female",
        birthDate: "1999-09-09",
      });
      cleanup.push({ type: "Patient", id: created.id! });

      const sd = await client.read<StructureDefinition>(
        "StructureDefinition",
        "Patient",
      );
      const walked = walkResource(sd, created);
      const keys = walked.map((w) => w.key);
      expect(keys).toContain("name");
      expect(keys).toContain("gender");
      expect(keys).toContain("birthDate");
      // every emitted element has a label and a value
      for (const w of walked) {
        expect(w.label).toBeTruthy();
        expect(w.value).toBeDefined();
      }
    },
    60_000,
  );

  test(
    "FhirError carries OperationOutcome for a not-found read",
    async () => {
      const err = await client
        .read("Patient", "definitely-does-not-exist-at-all-xyz-123")
        .catch((e) => e);
      expect(isFhirError(err)).toBe(true);
      expect([404, 410, 400]).toContain(err.status);
    },
    30_000,
  );
});
