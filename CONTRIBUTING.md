# Contributing

Thanks for your interest in `fhir-place`. This is a small project; the contribution bar is "ship something that's tested and honest about what it does."

## Local setup

```bash
pnpm install
pnpm dev                                               # demo app (MSW mock by default)
pnpm test                                              # unit + integration tests
pnpm -r typecheck
pnpm --filter @fhir-place/demo e2e                     # Playwright screenshots
pnpm --filter @fhir-place/react-fhir test:integration  # live-server HAPI integration
```

The demo defaults to an in-browser MSW mock. To point at a real server:

```bash
VITE_USE_MOCK=false VITE_FHIR_BASE_URL=https://hapi.fhir.org/baseR4 pnpm dev
```

Docker compose for a local HAPI:

```bash
docker compose up -d
VITE_USE_MOCK=false VITE_FHIR_BASE_URL=http://localhost:8080/fhir pnpm dev
```

## Shipping a PR

1. Branch off `main`.
2. Write the code + tests. Match the existing style (`tsc --strict`, Vitest, MSW for HTTP mocking). Every library-level change should have unit-test coverage; behaviour that touches real servers should also have an integration test in `packages/react-fhir/integration/`.
3. **Add a changeset** if your PR changes `@fhir-place/react-fhir`:
   ```bash
   pnpm changeset
   ```
   Pick the bump (`patch` / `minor` / `major`) and describe the change in human terms. Commit the generated `.changeset/*.md` alongside your code.
4. Open the PR. CI runs typecheck + tests + build. The release workflow automatically opens / updates a "Version Packages" PR that bumps versions + CHANGELOG when your PR lands; merging that second PR triggers a fresh npm publish.

## Bump conventions

- **patch** — bug fixes, docs, internal refactors, dependency tightening
- **minor** — new hooks, new components, new optional props on existing APIs, new overrides
- **major** — breaking API changes, removed props, renamed exports, or semantic shifts in existing behaviour

The demo and example apps (`apps/**`) are not published; they don't need changesets.

## Design principles

Keep these in mind when making changes:

- **Spec-driven.** If you find yourself writing resource-specific logic in the library (e.g. a Patient-only helper), push it to the consumer app — or make it a generic primitive. The selling point is "works for every FHIR resource."
- **Server-agnostic.** Every feature flows through the `FhirClient` interface. No direct `fetch` calls outside `FetchFhirClient`.
- **Safe by default.** Only `<Narrative>` gets to render HTML. Every other component uses React's default escaping.
- **Escape hatches.** If something's hard-coded, provide a prop to override it. `renderers` / `inputs` / `cellRenderers` exist for a reason.

## Writing tests

- Unit tests live next to their code as `*.test.ts(x)`. Vitest + MSW + Testing Library.
- Integration tests target a real FHIR server and live in `packages/react-fhir/integration/`. Default target is public HAPI; override with `FHIR_BASE_URL`.
- Playwright e2e lives in `apps/demo/e2e/`. Screenshots go in `screenshots/` and get committed.

## Questions?

Open an issue. We're pre-1.0, so preferences and defaults are still moving.
