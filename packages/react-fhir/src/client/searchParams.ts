import type { SearchParamValue, SearchParams } from "./types.js";

const formatValue = (value: SearchParamValue): string => {
  if (value instanceof Date) return value.toISOString();
  return String(value);
};

/**
 * Serialises FHIR search parameters into a URLSearchParams instance.
 *
 * FHIR allows both repeated keys (AND semantics) and comma-joined values (OR semantics).
 * Arrays are emitted as repeated keys; callers who want OR semantics should pass
 * a pre-joined string (e.g. "code": "a,b").
 */
export function buildSearchParams(params: SearchParams | undefined): URLSearchParams {
  const search = new URLSearchParams();
  if (!params) return search;

  for (const [key, raw] of Object.entries(params)) {
    if (raw === undefined || raw === null) continue;
    if (Array.isArray(raw)) {
      for (const v of raw) {
        if (v === undefined || v === null) continue;
        search.append(key, formatValue(v));
      }
    } else {
      search.append(key, formatValue(raw));
    }
  }

  return search;
}
