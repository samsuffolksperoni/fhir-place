---
"@fhir-place/react-fhir": patch
---

Fix integration test `sd.kind` assertion to accept all valid StructureDefinition kinds.

The live FHIR server at r4.smarthealthit.org started returning `kind: 'logical'` for `StructureDefinition/Patient`. The assertion `expect(sd.kind).toBe('resource')` was too strict — the actual contract being tested is that `directChildren()` produces the expected Patient paths, which is still verified by the path assertions that follow. The fix accepts any valid FHIR R4 `kind` value.
