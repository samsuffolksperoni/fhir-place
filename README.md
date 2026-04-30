# fhir-place

A monorepo with two related projects.

## Projects

| Path | What it is |
| --- | --- |
| [`packages/react-fhir`](packages/react-fhir/README.md) | **`@fhir-place/react-fhir`** — spec-driven React component library for FHIR (R4). Published on npm. |
| [`apps/demo`](apps/demo) | Development/demo app for the library — ships with MSW in-browser mock FHIR so it runs offline. **Live:** <https://samsuffolksperoni.github.io/fhir-place/> |
| [`apps/workbench`](apps/workbench/README.md) | **`@fhir-place/workbench`** — research workbench for evidence-backed agent answers over **synthetic** FHIR data. Phase A only. Not for clinical use. |

## Where to find things

- **Library docs, install, API surface, roadmap** → [`packages/react-fhir/README.md`](packages/react-fhir/README.md)
- **Workbench docs and local setup** → [`apps/workbench/README.md`](apps/workbench/README.md)
- **Workbench Phase A board** → [`apps/workbench/TASKS.md`](apps/workbench/TASKS.md)
- **Coding-agent rules** → [`AGENTS.md`](AGENTS.md)
- **Contributing** → [`CONTRIBUTING.md`](CONTRIBUTING.md)

## Top-level scripts

```bash
pnpm install
pnpm dev          # library demo (apps/demo) — MSW mock, Vite on :5173
pnpm test         # unit tests across all packages
pnpm -r typecheck
pnpm -r build
```

The workbench has its own dev/server scripts — see [`apps/workbench/README.md`](apps/workbench/README.md).

## License

MIT — see [`LICENSE`](LICENSE).
