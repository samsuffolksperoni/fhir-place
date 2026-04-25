import type { ElementDefinition, Reference } from "fhir/r4";
import { ReferencePicker, ReferencePickerFallback } from "../ReferencePicker.js";
import type { FhirTypeInput } from "./types.js";

const targetTypesFromElement = (element: ElementDefinition): string[] => {
  const refType = element.type?.find((t) => t.code === "Reference");
  const profiles = refType?.targetProfile ?? [];
  return profiles
    .map((p) => p.split("/").pop() ?? "")
    .filter(Boolean)
    .filter((t) => t !== "Resource"); // Reference(Any) → empty, fall back to manual
};

/**
 * Prefers the search-and-pick ReferencePicker when the ElementDefinition
 * advertises allowed `targetProfile`s. Falls back to the raw Reference/display
 * text inputs when targets can't be derived (e.g. `Reference(Any)`).
 */
export const ReferenceInput: FhirTypeInput<Reference> = ({ value, onChange, context }) => {
  const targets = targetTypesFromElement(context.element);
  if (targets.length > 0) {
    return <ReferencePicker targets={targets} value={value} onChange={onChange} />;
  }
  return <ReferencePickerFallback value={value} onChange={onChange} />;
};
