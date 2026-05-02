#!/usr/bin/env node
/**
 * Profile-aware codegen spike (issue #123).
 *
 * Reads a *cached* copy of the US Core 7.0 IG package from
 * `scripts/cache/us-core-7/package/`, walks `StructureDefinition.differential`
 * for the two profiles in scope (Patient + Laboratory Result Observation),
 * and emits a TS file with branded narrowed types at
 * `src/structure/__experimental__/us-core-7.ts`.
 *
 * This is **not** a stable API. The goal is to learn the shape of the codegen
 * pipeline before committing to it. See `docs/spikes/profile-codegen.md` for
 * what worked, what didn't, and what would need to change to expand to a full
 * IG.
 *
 * Usage (from repo root):
 *   node --experimental-strip-types packages/react-fhir/scripts/codegen-spike.ts
 *
 * Node 22+ is required for the `--experimental-strip-types` flag. The script
 * only uses node:fs, node:path, and node:url, so no npm deps are needed.
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type ElementDefinition = {
  id?: string;
  path: string;
  sliceName?: string;
  min?: number;
  max?: string;
  mustSupport?: boolean;
  type?: { code: string; profile?: string[]; targetProfile?: string[] }[];
  fixedUri?: string;
  fixedCode?: string;
  binding?: { strength: string; valueSet?: string };
  slicing?: unknown;
};

type StructureDefinition = {
  resourceType: "StructureDefinition";
  id: string;
  url: string;
  version?: string;
  name: string;
  type: string;
  baseDefinition?: string;
  derivation?: "specialization" | "constraint";
  differential?: { element: ElementDefinition[] };
};

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_DIR = join(HERE, "cache", "us-core-7", "package");
const OUTPUT_FILE = join(
  HERE,
  "..",
  "src",
  "structure",
  "__experimental__",
  "us-core-7.ts",
);

/** Profiles the spike commits to narrowing. Anything else in the cache is ignored. */
const TARGET_PROFILE_URLS = new Set([
  "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient",
  "http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab",
]);

function loadIgPackage(): StructureDefinition[] {
  // Sort for reproducible output: `readdirSync()` order is filesystem-defined,
  // so an unsorted walk would emit profiles in different orders across OSes
  // and produce noisy diffs for byte-identical inputs.
  const files = readdirSync(PACKAGE_DIR)
    .filter(
      (f) => f.startsWith("StructureDefinition-") && f.endsWith(".json"),
    )
    .sort();
  const sds: StructureDefinition[] = [];
  for (const f of files) {
    const sd = JSON.parse(
      readFileSync(join(PACKAGE_DIR, f), "utf8"),
    ) as StructureDefinition;
    if (sd.resourceType !== "StructureDefinition") continue;
    if (!TARGET_PROFILE_URLS.has(sd.url)) continue;
    sds.push(sd);
  }
  return sds;
}

/**
 * Walk a profile's differential and collect:
 *   - top-level paths that gain `min >= 1` or `mustSupport`
 *   - choice-type narrowings (`value[x]` -> the explicit `type[]` codes)
 *   - slice names per top-level path
 *   - bound ValueSet URLs
 *
 * The spike deliberately stops at depth 1 below the resource root for member
 * narrowing; deeper paths (e.g. `Patient.name.family`) are recorded as
 * "annotated must-support fields" in the emitted comment but don't change the
 * emitted TS shape. Promoting that to real per-element narrowing is one of
 * the open questions called out in the spike doc.
 */
type NarrowedField = {
  path: string;
  required: boolean;
  mustSupport: boolean;
  choiceTypes?: string[];
  binding?: { strength: string; valueSet: string };
  slices?: string[];
};

type NarrowedProfile = {
  url: string;
  version: string;
  name: string;
  baseType: string;
  topLevelFields: NarrowedField[];
  deepMustSupportPaths: string[];
};

function narrow(sd: StructureDefinition): NarrowedProfile {
  const elements = sd.differential?.element ?? [];
  const fieldsByPath = new Map<string, NarrowedField>();
  const slicesByPath = new Map<string, Set<string>>();
  const deepMustSupport: string[] = [];

  const rootPrefix = `${sd.type}.`;

  for (const el of elements) {
    if (!el.path.startsWith(rootPrefix)) continue;
    const tail = el.path.slice(rootPrefix.length);
    const segments = tail.split(".");
    const topLevel = segments[0];
    if (!topLevel) continue;

    if (el.sliceName) {
      const set = slicesByPath.get(topLevel) ?? new Set();
      set.add(el.sliceName);
      slicesByPath.set(topLevel, set);
    }

    if (segments.length > 1) {
      if (el.mustSupport) deepMustSupport.push(el.path);
      continue;
    }

    const existing = fieldsByPath.get(topLevel) ?? {
      path: topLevel,
      required: false,
      mustSupport: false,
    };

    if (typeof el.min === "number" && el.min >= 1) existing.required = true;
    if (el.mustSupport) existing.mustSupport = true;

    if (topLevel.endsWith("[x]") && el.type && el.type.length > 0) {
      existing.choiceTypes = el.type.map((t) => t.code);
    }

    if (el.binding?.valueSet) {
      existing.binding = {
        strength: el.binding.strength,
        valueSet: el.binding.valueSet,
      };
    }

    fieldsByPath.set(topLevel, existing);
  }

  for (const [path, set] of slicesByPath) {
    const f = fieldsByPath.get(path);
    if (f) f.slices = [...set];
  }

  return {
    url: sd.url,
    version: sd.version ?? "unknown",
    name: sd.name,
    baseType: sd.type,
    topLevelFields: [...fieldsByPath.values()].filter(
      (f) => f.mustSupport || f.required || f.choiceTypes || f.slices,
    ),
    deepMustSupportPaths: deepMustSupport,
  };
}

/**
 * FHIR primitive `code` -> TS type. Anything not in this map is treated as a
 * complex type name that must be imported alongside the base resource type.
 */
const FHIR_PRIMITIVE_TO_TS: Record<string, string> = {
  boolean: "boolean",
  integer: "number",
  decimal: "number",
  positiveInt: "number",
  unsignedInt: "number",
  string: "string",
  code: "string",
  id: "string",
  uri: "string",
  url: "string",
  canonical: "string",
  oid: "string",
  uuid: "string",
  markdown: "string",
  base64Binary: "string",
  date: "string",
  dateTime: "string",
  instant: "string",
  time: "string",
};

/** Returns the TS type for a FHIR code and whether the type is complex. */
function tsTypeForFhirCode(code: string): { ts: string; complex: boolean } {
  const prim = FHIR_PRIMITIVE_TO_TS[code];
  if (prim) return { ts: prim, complex: false };
  return { ts: code, complex: true };
}

/** `effective[x]` + `dateTime` -> `effectiveDateTime`. */
function choicePropName(stem: string, code: string): string {
  return stem + code.charAt(0).toUpperCase() + code.slice(1);
}

type ChoiceConstraint = {
  /** e.g. `effectiveDateTime`, `effectivePeriod` — the per-variant property names. */
  variantProps: string[];
  /** Emitted union: `({ effectiveDateTime: string } | { effectivePeriod: Period })`. */
  unionExpr: string;
  /** Complex type names (`Period`, `Quantity`, …) that need importing. */
  complexImports: string[];
};

function buildChoiceConstraint(
  basePath: string,
  choiceTypes: string[],
): ChoiceConstraint {
  const stem = basePath.replace(/\[x\]$/, "");
  const variantProps: string[] = [];
  const complexImports: string[] = [];
  const variants: string[] = [];
  for (const code of choiceTypes) {
    const propName = choicePropName(stem, code);
    const { ts, complex } = tsTypeForFhirCode(code);
    if (complex) complexImports.push(ts);
    variantProps.push(propName);
    variants.push(`{ ${propName}: ${ts} }`);
  }
  return {
    variantProps,
    unionExpr: `(${variants.join(" | ")})`,
    complexImports,
  };
}

function emitProfile(profile: NarrowedProfile): {
  body: string;
  extraImports: string[];
} {
  const brand = profile.name;
  const requiredKeys: string[] = [];
  const choiceConstraints: { stem: string; constraint: ChoiceConstraint }[] = [];
  const extraImports = new Set<string>();

  for (const f of profile.topLevelFields) {
    if (f.path.endsWith("[x]")) {
      // Choice types: only emit a constraint when the spec says min >= 1.
      // For min=0 choices we still leave the per-variant optional properties
      // from `@types/fhir` alone — that's an under-narrowing called out in
      // the spike doc, not silently dropping a min=1 signal.
      if (f.required && f.choiceTypes && f.choiceTypes.length > 0) {
        const stem = f.path.replace(/\[x\]$/, "");
        const constraint = buildChoiceConstraint(f.path, f.choiceTypes);
        for (const c of constraint.complexImports) extraImports.add(c);
        choiceConstraints.push({ stem, constraint });
      }
      continue;
    }
    // FHIR `mustSupport` is NOT cardinality — it means "if you support this
    // element, you must read AND write it." Promoting MS to required is a
    // category error: `Patient.telecom` is MS but `min=0`, and a profile-
    // valid Patient may legitimately omit it. Only `min >= 1` becomes
    // required at the type level.
    if (f.required) requiredKeys.push(f.path);
  }

  const requiredKeyUnion =
    requiredKeys.length === 0
      ? "never"
      : requiredKeys.map((k) => `"${k}"`).join(" | ");

  const fieldDocs = profile.topLevelFields
    .map((f) => {
      const flags = [
        f.required ? "min=1" : null,
        f.mustSupport ? "MS" : null,
        f.binding ? `binding=${f.binding.strength}` : null,
        f.slices ? `slices=[${f.slices.join(",")}]` : null,
        f.choiceTypes ? `choice=[${f.choiceTypes.join("|")}]` : null,
      ]
        .filter(Boolean)
        .join(" ");
      return ` *   - ${f.path} (${flags})`;
    })
    .join("\n");

  const choiceIntersection =
    choiceConstraints.length === 0
      ? ""
      : "\n  & " +
        choiceConstraints.map((c) => c.constraint.unionExpr).join("\n  & ");

  const choiceDocs =
    choiceConstraints.length === 0
      ? ""
      : choiceConstraints
          .map(
            (c) =>
              ` *   - ${c.stem}[x] required (${c.constraint.variantProps.join(" | ")})`,
          )
          .join("\n");

  const lines: (string | null)[] = [
    `// ===== ${profile.name} (${profile.url} v${profile.version}) =====`,
    "",
    `/**`,
    ` * Branded marker for ${profile.name}. Generated by`,
    ` * \`scripts/codegen-spike.ts\` from a cached US Core 7.0 IG. Experimental.`,
    ` *`,
    ` * Profiled fields walked from \`differential\`:`,
    fieldDocs || " *   (no top-level constraints)",
    choiceDocs ? ` *\n * Required choice-type constraints:\n${choiceDocs}` : null,
    ` *`,
    ` * Deep must-support paths recorded but not narrowed in the spike:`,
    profile.deepMustSupportPaths.length === 0
      ? " *   (none)"
      : profile.deepMustSupportPaths.map((p) => ` *   - ${p}`).join("\n"),
    ` */`,
    `declare const ${brand}Brand: unique symbol;`,
    "",
    `export type ${profile.name}Required = ${requiredKeyUnion};`,
    "",
    requiredKeys.length === 0
      ? `type ${profile.name}Base = ${profile.baseType};`
      : `type ${profile.name}Base = Omit<${profile.baseType}, ${profile.name}Required> & {\n  readonly [K in ${profile.name}Required]-?: NonNullable<${profile.baseType}[K]>;\n};`,
    "",
    `export type ${profile.name} = ${profile.name}Base${choiceIntersection} & {`,
    `  readonly [${brand}Brand]: "${profile.url}";`,
    `};`,
    "",
    `/**`,
    ` * Brand an unbranded ${profile.baseType} as ${profile.name}.`,
    ` *`,
    ` * The spike does **not** validate at runtime — this is a type-only escape`,
    ` * hatch. A real codegen pipeline would either (a) emit a Zod parser per`,
    ` * profile, or (b) use \`fhirpath\` invariants from the SD to drive runtime`,
    ` * narrowing.`,
    ` */`,
    `export function as${profile.name}(`,
    `  resource: ${profile.name}Base${choiceIntersection},`,
    `): ${profile.name} {`,
    `  return resource as ${profile.name};`,
    `}`,
    "",
  ];
  const body = lines.filter((l): l is string => l !== null).join("\n");

  return { body, extraImports: [...extraImports] };
}

function emit(profiles: NarrowedProfile[]): string {
  const baseTypes = new Set(profiles.map((p) => p.baseType));
  const bodies: string[] = [];
  for (const p of profiles) {
    const { body, extraImports } = emitProfile(p);
    for (const i of extraImports) baseTypes.add(i);
    bodies.push(body);
  }
  const header = [
    "/* eslint-disable */",
    "// @generated by packages/react-fhir/scripts/codegen-spike.ts",
    "// DO NOT EDIT BY HAND. Re-run the script to regenerate.",
    "//",
    "// Source: cached US Core 7.0.0 IG (scripts/cache/us-core-7/).",
    "// Status: __experimental__ spike output for issue #123. NOT exported from",
    "// the package barrel (`src/structure/index.ts`). See",
    "// `docs/spikes/profile-codegen.md` for caveats and known limitations.",
    "",
    `import type { ${[...baseTypes].sort().join(", ")} } from "fhir/r4";`,
    "",
  ].join("\n");

  return `${header}\n${bodies.join("\n")}`;
}

function main() {
  const sds = loadIgPackage();
  if (sds.length === 0) {
    throw new Error(
      `No StructureDefinitions matched the spike's profile allow-list under ${PACKAGE_DIR}.`,
    );
  }
  const narrowed = sds.map(narrow);
  const out = emit(narrowed);
  mkdirSync(dirname(OUTPUT_FILE), { recursive: true });
  writeFileSync(OUTPUT_FILE, out);
  console.error(
    `[codegen-spike] wrote ${narrowed.length} profile(s) to ${OUTPUT_FILE}`,
  );
  for (const p of narrowed) {
    console.error(
      `  - ${p.name} (${p.topLevelFields.length} top-level fields, ${p.deepMustSupportPaths.length} deep MS paths)`,
    );
  }
}

main();
