---
"@fhir-place/react-fhir": patch
---

Split `src/components/inputs.tsx` (629 lines) into a per-datatype module
under `src/components/inputs/`. Behaviour is unchanged — the public
exports `defaultTypeInputs`, `JsonFallbackInput`, and the type aliases
`FhirTypeInput` / `FhirInputProps` / `InputContext` / `TypeInputs` keep
the same identity, so consumers using `import { x } from "@fhir-place/react-fhir"`
or `@fhir-place/react-fhir/components` see no diff.

New layout:

  components/inputs/
    index.ts           — assembles `defaultTypeInputs`; re-exports types
    types.ts           — shared types + form-field CSS classes
    primitives.tsx     — Text, Markdown, Boolean, Number, Date, DateTime,
                         Time, Uri, Code (binding-aware)
    HumanName.tsx
    Address.tsx
    ContactPoint.tsx
    Identifier.tsx
    Reference.tsx      — delegates to ReferencePicker / fallback
    Period.tsx
    Quantity.tsx
    Coding.tsx
    CodeableConcept.tsx
    JsonFallback.tsx
