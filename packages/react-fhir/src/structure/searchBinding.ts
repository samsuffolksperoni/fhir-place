import type { CapabilityStatementRestResourceSearchParam } from "fhir/r4";

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
 * targets. Good enough for ~80% of R4 core search params without needing to
 * fetch the full `SearchParameter` resource. Returns `undefined` for params
 * that can't be mapped by convention (e.g. "_id", chained, or composite).
 */
export function elementPathForSearchParam(
  param: Pick<CapabilityStatementRestResourceSearchParam, "name">,
  base: string,
): string | undefined {
  const name = param.name;
  if (!name) return undefined;
  if (name.startsWith("_")) return undefined;
  if (name.includes(".") || name.includes(":")) return undefined; // chained / modified
  return `${base}.${kebabToCamel(name)}`;
}
