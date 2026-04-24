/**
 * Copy canonical R4 StructureDefinitions from the official HL7 npm package
 * `@hl7/hl7.fhir.r4.core` into `src/structure/core/<Type>.ts`.
 *
 * The source package is a devDependency — its 52MB of definitions never ships
 * in our published tarball. Only the ~1MB of hand-picked resource SDs committed
 * under `src/structure/core/` do, and only the specific types a consumer
 * actually renders land in their bundle (each SD is dynamically imported).
 *
 * We emit `.ts` files rather than `.json` so the result works in Node ESM
 * (which requires import attributes for JSON) as well as in every bundler,
 * without any TS config gymnastics.
 *
 * Run via `pnpm fetch:core-sds`. Rerun whenever you bump the
 * `@hl7/hl7.fhir.r4.core` version or want to add resource types to the bundle.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const sourceDir = join(here, "../node_modules/@hl7/hl7.fhir.r4.core");
const targetDir = join(here, "../src/structure/core");

/** Resource types to bundle. Extend this list as the library grows. */
const TYPES = [
  "Patient",
  "Observation",
  "Condition",
  "MedicationRequest",
  "AllergyIntolerance",
  "Procedure",
  "Encounter",
  "Immunization",
  "Goal",
  "Task",
] as const;

const header = (type: string): string => `/**
 * Canonical R4 ${type} StructureDefinition, copied verbatim from the official
 * @hl7/hl7.fhir.r4.core npm package by scripts/fetch-core-sds.ts.
 *
 * Do not edit by hand — run \`pnpm fetch:core-sds\` to regenerate.
 */
import type { StructureDefinition } from "fhir/r4";

`;

for (const type of TYPES) {
  const src = join(sourceDir, `StructureDefinition-${type}.json`);
  const dst = join(targetDir, `${type}.ts`);
  const sd = JSON.parse(readFileSync(src, "utf8")) as {
    snapshot?: { element?: unknown[] };
  };
  const body = `${header(type)}export const ${type}StructureDefinition: StructureDefinition = ${JSON.stringify(sd, null, 2)};\n`;
  writeFileSync(dst, body);
  const snapshot = sd.snapshot?.element?.length ?? 0;
  console.log(`  ${type}: ${snapshot} snapshot elements`);
}

console.log(`\nWrote ${TYPES.length} StructureDefinitions to ${targetDir}`);
