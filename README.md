# fhir-place

A React component library for building FHIR resource viewers and editors driven by the FHIR specification itself (StructureDefinition, SearchParameter, CapabilityStatement). Minimal resource-specific code — everything is derived from the spec's own metadata, so the library works natively against any FHIR REST API.

## Status
Early alpha. R4 first. MIT licensed.

## Packages
- `packages/react-fhir` — the component library (client, hooks, generic renderers)
- `apps/demo` — a development/demo app pointed at the public HAPI server

## Dev
```bash
pnpm install
pnpm dev                                          # runs the demo app (MSW mock FHIR in-browser)
pnpm test                                         # unit tests (jsdom + MSW)
pnpm --filter @fhir-place/demo e2e                # Playwright screenshot suite
pnpm --filter @fhir-place/react-fhir test:integration   # live-server integration (defaults to public HAPI R4)
```

Integration tests target `FHIR_BASE_URL` (defaults to `https://hapi.fhir.org/baseR4`) and are also run nightly in CI — see [`packages/react-fhir/integration/README.md`](packages/react-fhir/integration/README.md).

## Design principles
- **Spec-driven.** UI is generated from StructureDefinition / SearchParameter, not hand-written per resource type.
- **Server-agnostic.** Plain FHIR REST via a `FhirClient` interface. No SDK lock-in.
- **Safe by default.** All narrative (`Resource.text.div`) is sanitized with DOMPurify.
- **Tree-shakeable, typed.** Ships ESM + types.
