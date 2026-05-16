---
"@fhir-place/react-fhir": patch
---

`resolveStructureDefinition` now takes the zero-network bundled-core shortcut
whenever the requested canonical is the base type's — including when a
`meta.profile` value just echoes the base canonical
(`http://hl7.org/fhir/StructureDefinition/<Type>`), which some servers stamp
on resources. Previously any truthy `profile` skipped the shortcut and the
detail view hard-failed against servers that don't store core SDs at the REST
layer (public HAPI, the SMART sandboxes).

Also adds a last-resort fallback: when an unresolvable profile / non-standard
canonical was requested and every server lookup fails, the bundled base-type
R4 SD is returned (with a `console.warn`) rather than throwing — a renderer
degrading to base structure beats a blank screen. Still gated by
`useBundledFallback`.
