# Acceptance — `add-workbench-app`

This change is accepted when **all** of the following are true:

- [ ] `pnpm install` succeeds at the repo root from a clean checkout.
- [ ] `pnpm --filter @fhir-place/workbench dev` starts a Vite server on
      `http://127.0.0.1:5174` and the page renders the synthetic-only banner
      and the "FHIR Agent Workbench" home page.
- [ ] `pnpm --filter @fhir-place/workbench db:setup` creates a SQLite file
      at the configured path and applies the `0000_initial.sql` migration.
- [ ] `pnpm -r typecheck` exits 0 with the new package included.
- [ ] `pnpm -r test:run` exits 0 with the new package's tests included,
      including:
      - the synthetic-only banner test, and
      - the Drizzle round-trip test.
- [ ] `pnpm --filter @fhir-place/workbench build` produces a Vite bundle.
- [ ] The CI workflow (`.github/workflows/ci.yml`) exercises the workbench
      build.
- [ ] `apps/workbench/README.md` opens with the synthetic-only / not-for-
      clinical-use disclaimer.
- [ ] `AGENTS.md` exists at the repo root and lists the Phase A icebox.
- [ ] `docs/architecture.md`, `docs/safety.md`, and `docs/limitations.md`
      exist as placeholders linked from the workbench README.
- [ ] None of the Phase A icebox items are introduced by this change.
