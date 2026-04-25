import type {
  Address,
  CodeableConcept,
  Coding,
  HumanName,
  Period,
  Quantity,
  Resource,
} from "fhir/r4";

/**
 * Pure formatting helpers shared between read-only renderers (`renderers.tsx`)
 * and label-producing widgets like `<ReferencePicker>`. Keeping these in one
 * place stops the "two slightly different name formatters" drift the codebase
 * had after #5.
 */

/**
 * Best-effort human label for a `HumanName`:
 *   - prefers `.text` when present (FHIR's "this is the display form" hint)
 *   - otherwise joins prefix / given / family / suffix in order
 *   - returns "" when none are populated
 */
export function formatHumanName(n: HumanName | undefined): string {
  if (!n) return "";
  if (n.text) return n.text;
  const parts = [
    n.prefix?.join(" "),
    n.given?.join(" "),
    n.family,
    n.suffix?.join(" "),
  ].filter(Boolean);
  return parts.join(" ").trim();
}

/**
 * Single-line address — prefers `.text`, otherwise joins line / city / state /
 * postal / country with commas. Returns "" when the address is empty.
 */
export function formatAddress(a: Address | undefined): string {
  if (!a) return "";
  if (a.text) return a.text;
  return [a.line?.join(", "), a.city, a.state, a.postalCode, a.country]
    .filter(Boolean)
    .join(", ");
}

/**
 * Best-effort label for a `Coding`: `display` if present, else `system#code`,
 * else just `code`, else "".
 */
export function formatCoding(c: Coding | undefined): string {
  if (!c) return "";
  if (c.display) return c.display;
  if (c.system && c.code) return `${c.system}#${c.code}`;
  return c.code ?? "";
}

/**
 * Best-effort label for a `CodeableConcept`: `.text`, falling back to the
 * first coding's `display`, then its `code`. Empty string if nothing renders.
 */
export function formatCodeableConcept(cc: CodeableConcept | undefined): string {
  if (!cc) return "";
  if (cc.text) return cc.text;
  const first = cc.coding?.[0];
  return first ? formatCoding(first) : "";
}

/**
 * Single-string Quantity label: `<comparator><value> <unit|code>`. Trims
 * whitespace when fields are missing so callers don't render dangling spaces.
 */
export function formatQuantity(q: Quantity | undefined): string {
  if (!q) return "";
  const comparator = q.comparator ?? "";
  const value = q.value ?? "";
  const unit = q.unit ?? q.code ?? "";
  return `${comparator}${value}${unit ? ` ${unit}` : ""}`.trim();
}

/**
 * Period as "start → end" — preserves the raw FHIR strings so timezone /
 * partial-precision dates round-trip. Open-ended periods show "…" for the
 * missing side.
 */
export function formatPeriod(p: Period | undefined): string {
  if (!p) return "";
  const start = p.start ?? "…";
  const end = p.end ?? "…";
  return `${start} → ${end}`;
}

/**
 * Human label for a Resource, used by widgets that need to surface a
 * resource as picker chip / autocomplete row / reference.display value.
 *
 * Walks the common name-bearing fields in priority order:
 *   1. HumanName-bearing resources (Patient, Practitioner, RelatedPerson, …)
 *   2. Resources with a single string `name` (Organization, Location, Device, …)
 *   3. CodeableConcept-bearing resources (Observation.code, Condition.code, …)
 *   4. `title` fallback (e.g. Composition)
 *   5. Final fallback: `{ResourceType}/{id}`
 */
export function formatReferenceLabel(resource: Resource): string {
  const r = resource as unknown as Record<string, unknown>;

  const names = r.name as Array<HumanName> | string | undefined;
  if (Array.isArray(names) && names[0]) {
    const formatted = formatHumanName(names[0]);
    if (formatted) return formatted;
  }
  if (typeof names === "string") return names;

  const code = r.code as CodeableConcept | undefined;
  const codeLabel = formatCodeableConcept(code);
  if (codeLabel) return codeLabel;

  if (typeof r.title === "string") return r.title;

  return `${resource.resourceType}/${resource.id ?? ""}`.replace(/\/$/, "");
}
