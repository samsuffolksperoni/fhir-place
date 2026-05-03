# fhir-place

This repo is two things:

- **[`@fhir-place/react-fhir`](packages/react-fhir/README.md)** — a spec-driven React library for FHIR, published on npm. Backend-agnostic; UI derives from `StructureDefinition`, `SearchParameter`, and `CapabilityStatement` so it works against any FHIR REST API.
- **[fhir-ui](apps/demo/README.md)** — a FHIR browser and editor built on react-fhir. Browse, search, create, edit, and delete FHIR resources across a tab-based shell with NLP search, CQL runner, dark mode, and a configurable server target.

**Live demo:** <https://samsuffolksperoni.github.io/fhir-place/> — hits the public HAPI R4 server. Patient data is shared and reset periodically.

## Packages

| Path | What it is |
| --- | --- |
| [`packages/react-fhir`](packages/react-fhir/README.md) | npm library — typed FHIR client, TanStack Query hooks, StructureDefinition walkers, spec-driven React components |
| [`apps/demo`](apps/demo/README.md) | fhir-ui — the full browser/editor app built on react-fhir |

## Status

Early alpha. R4 first. MIT licensed. Safe to depend on for prototypes and side projects; expect breaking changes before 1.0.

- **94 unit tests** (Vitest + MSW + jsdom)
- **Playwright e2e + screenshots** across patient list, detail, mobile, CRUD, search
- **Nightly live-HAPI integration suite** covers full CRUD, reference resolution, CapabilityStatement + StructureDefinition walks

CI: typecheck + unit tests + build on every PR. Pages deploy on push to `main`. Integration suite runs nightly.

## Running locally

```bash
pnpm install
pnpm dev          # fhir-ui with in-browser MSW mock FHIR (Vite on :5173)
pnpm test         # unit tests (Vitest)
pnpm -r typecheck
pnpm --filter @fhir-place/demo e2e                       # Playwright e2e + screenshots
pnpm --filter @fhir-place/react-fhir test:integration    # live-HAPI integration suite
```

The app defaults to an in-browser MSW mock so it runs offline. To point at a real server:

```bash
# public HAPI
VITE_USE_MOCK=false VITE_FHIR_BASE_URL=https://hapi.fhir.org/baseR4 pnpm dev

# local Docker HAPI (persistent, R4, port 8080)
docker compose up -d
VITE_USE_MOCK=false VITE_FHIR_BASE_URL=http://localhost:8080/fhir pnpm dev
```

## Documentation

| Doc | What it covers |
| --- | --- |
| [`packages/react-fhir/README.md`](packages/react-fhir/README.md) | Install, quick start, full API reference, design principles, comparison with other libraries, roadmap |
| [`apps/demo/README.md`](apps/demo/README.md) | fhir-ui features, app structure, how it uses react-fhir, how to run |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | PR workflow, testing, changesets, bump conventions |
| [`docs/decisions/`](docs/decisions/) | Architecture Decision Records |
| [Open issues](https://github.com/samsuffolksperoni/fhir-place/issues) | Tracked gaps and roadmap items |

## License

MIT — see [`LICENSE`](LICENSE).
