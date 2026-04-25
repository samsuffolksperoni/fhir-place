---
"@fhir-place/react-fhir": patch
---

Refactor: split the 600-line `inputs.tsx` into `components/inputs/*.tsx` (one file per FHIR datatype) and extract pure formatting helpers into `structure/format.ts`. Closes #31.

* `components/inputs/` — `primitives.tsx` (Text/Markdown/Boolean/Number/Date/DateTime/Time/Uri/Code), and per-datatype files for HumanName, Address, ContactPoint, Identifier, Reference, Period, Quantity, Coding, CodeableConcept, plus a `JsonFallback`. `index.ts` assembles `defaultTypeInputs`. Public `@fhir-place/react-fhir/components` exports unchanged; consumers see no API change.
* `structure/format.ts` — `formatHumanName`, `formatAddress`, `formatCoding`, `formatCodeableConcept`, `formatQuantity`, `formatPeriod`, `formatReferenceLabel`. `renderers.tsx` now imports these instead of redefining them, and `ReferencePicker` uses `formatReferenceLabel` (the previous local `referenceLabel` is removed) so the "human label for a resource" logic lives in exactly one place.

Pure refactor: zero behaviour change, all 246 unit tests still pass, bundle size unchanged.
