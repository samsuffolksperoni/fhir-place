---
"@fhir-place/react-fhir": minor
---

Add an optional `confirmOnSave` prop to `<ResourceEditor>`. It runs against the
`prune()`-d draft on Save and, when it returns a warning string, surfaces that
string inline (`data-testid="resource-editor-warning"`) and requires an explicit
`window.confirm` before the save proceeds. Returning `null` saves without
prompting. The prop is generic — resource-specific rules stay in the caller, not
the editor — so consumers can guard against obviously-broken submits (e.g. an
anonymous Patient with no name or identifier) without giving up the spec-driven
"every field is optional" surface.

Closes #588.
