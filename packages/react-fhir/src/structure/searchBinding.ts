import type {
  CapabilityStatementRestResourceSearchParam,
  SearchParameter,
} from "fhir/r4";

/**
 * kebab-to-camel: "address-city" → "addressCity", "clinical-status" → "clinicalStatus".
 * Leaves single-word params untouched ("name" → "name") and preserves leading
 * underscores used by FHIR search-result-parameters ("_id" → "_id").
 */
export function kebabToCamel(name: string): string {
  if (!name) return name;
  if (name.startsWith("_")) return name; // _id, _count, etc.
  return name.replace(/-([a-z])/g, (_, c) => (c as string).toUpperCase());
}

/**
 * Best-effort resolution of a SearchParameter to the FHIR element path it
 * targets. When a `SearchParameter` resource is supplied (`spec`), prefers its
 * `expression` (the spec's source of truth — handles custom params and the
 * occasional core param whose expression diverges from its name). Falls back
 * to the kebab→camel naming convention otherwise; ~80% of R4 core params map
 * cleanly that way without needing the full SearchParameter resource.
 *
 * Returns `undefined` for params that can't be mapped — e.g. composite or
 * chained expressions, or `_id` / `_lastUpdated`. Callers should fall back to
 * a free-text input for these.
 */
export function elementPathForSearchParam(
  param: Pick<CapabilityStatementRestResourceSearchParam, "name">,
  base: string,
  spec?: SearchParameter | undefined,
): string | undefined {
  if (spec?.expression) {
    const path = elementPathFromExpression(spec.expression, base);
    if (path) return path;
    // expression present but unrenderable (composite / chained) — fall back
    // to convention so the field is still searchable, even if the path is
    // imperfect for binding lookups.
  }
  const name = param.name;
  if (!name) return undefined;
  if (name.startsWith("_")) return undefined;
  if (name.includes(".") || name.includes(":")) return undefined; // chained / modified
  return `${base}.${kebabToCamel(name)}`;
}

/**
 * Pulls a renderable `Resource.element[.subelement]` path out of a
 * SearchParameter `expression`. Handles:
 *
 *   "Patient.name"                      → "Patient.name"
 *   "Patient.name | Patient.given"      → "Patient.name"          (first union arm)
 *   "Observation.value.as(Quantity)"    → undefined                (cast)
 *   "Encounter.subject.where(...)"      → undefined                (predicate)
 *   "(Patient | Group).id"              → undefined                (composite root)
 *
 * Only returns a path that starts with `base.`; otherwise undefined so the
 * caller can fall back to convention.
 */
export function elementPathFromExpression(
  expression: string,
  base: string,
): string | undefined {
  // FHIRPath unions split on ` | ` — pick the first arm whose root matches `base`.
  const arms = expression.split(/\s*\|\s*/);
  for (const arm of arms) {
    const trimmed = arm.trim();
    // Reject anything containing FHIRPath function syntax we can't render:
    //   .where(...), .resolve(), .as(...), .ofType(...), .extension(...), etc.
    if (/[()]/.test(trimmed)) continue;
    if (!trimmed.startsWith(`${base}.`)) continue;
    if (!/^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z][A-Za-z0-9]*)+$/.test(trimmed)) continue;
    return trimmed;
  }
  return undefined;
}
