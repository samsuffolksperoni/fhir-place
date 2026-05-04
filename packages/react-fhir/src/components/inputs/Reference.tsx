import type { ElementDefinition, Reference } from "fhir/r4";
import { ReferencePicker } from "../ReferencePicker.js";
import { type FhirTypeInput } from "./types.js";

/**
 * Common FHIR resource types used as a fallback target list when the
 * ElementDefinition carries no `targetProfile` entries (e.g. bundled core
 * SDs that declare `Reference` without specifying allowed targets).
 */
export const DEFAULT_REFERENCE_TARGETS = [
  "Patient",
  "Practitioner",
  "Organization",
  "Encounter",
  "Location",
  "Device",
];

/**
 * Always renders the search-and-pick `<ReferencePicker>`. When the
 * ElementDefinition advertises `targetProfile`s those are used; otherwise
 * the picker uses `DEFAULT_REFERENCE_TARGETS` so users still get the search
 * UX even on resources whose bundled SDs omit targetProfile.
 */
export const ReferenceInput: FhirTypeInput<Reference> = ({
  value,
  onChange,
  context,
}) => {
  const explicit = targetTypesFromElement(context.element);
  const targets = explicit.length > 0 ? explicit : DEFAULT_REFERENCE_TARGETS;
  return <ReferencePicker targets={targets} value={value} onChange={onChange} />;
};

const targetTypesFromElement = (element: ElementDefinition): string[] => {
  const refType = element.type?.find((t) => t.code === "Reference");
  const profiles = refType?.targetProfile ?? [];
  return profiles
    .map((p) => p.split("/").pop() ?? "")
    .filter(Boolean)
    .filter((t) => t !== "Resource"); // Reference(Any) → treat as no explicit targets
};
