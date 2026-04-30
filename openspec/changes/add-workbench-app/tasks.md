# Tasks — `add-workbench-app`

- [x] Create `apps/workbench/` workspace package.
- [x] Add `package.json`, `tsconfig.json`, `tsconfig.node.json`,
      `vite.config.ts`, `vitest.config.ts`, `tailwind.config.js`,
      `postcss.config.js`, `index.html`.
- [x] Add UI shell: `src/main.tsx`, `src/App.tsx`, `src/index.css`,
      `src/config.ts`, `src/pages/HomePage.tsx`,
      `src/components/SyntheticOnlyBanner.tsx`.
- [x] Vitest test asserting the synthetic-only banner renders the required
      copy and `role="alert"`.
- [x] Add Drizzle config and SQLite scaffold: `drizzle.config.ts`,
      `db/schema.ts`, `db/client.ts`, `db/migrations/0000_initial.sql`,
      `scripts/db-setup.ts`.
- [x] Vitest test that opens the SQLite DB, applies migrations, and
      round-trips a row through Drizzle.
- [x] Add `apps/workbench/README.md` with synthetic-only positioning, local
      setup, scripts table, and Phase A non-goals.
- [x] Add `AGENTS.md` at the repo root.
- [x] Add `docs/architecture.md`, `docs/safety.md`, `docs/limitations.md`
      placeholders.
- [x] Add `openspec/changes/add-workbench-app/{proposal,requirements,tasks,acceptance}.md`.
- [x] Update `.github/workflows/ci.yml` to also build the workbench.
- [x] Verify `pnpm -r typecheck`, `pnpm -r test:run`, and
      `pnpm --filter @fhir-place/workbench build` succeed locally.
