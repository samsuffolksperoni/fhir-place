# goals-tasks (`apps/goals-tasks`)

A minimal sample app that demonstrates a Goal + Task workflow built on [`@fhir-place/react-fhir`](../../packages/react-fhir/README.md). It's intentionally narrow — no shell, no sidebar, no generic resource browser — just the pages you'd need to manage a patient's goals and their linked tasks.

Early / in progress. The generic fhir-ui (`apps/demo`) handles Goal and Task fine via its generic pages; this app shows what a purpose-built, domain-specific UI looks like when you use react-fhir as the foundation.

## What it does

- **Patient overview** — patient header + list of their goals with lifecycle status badges, plus a "+ New goal" button.
- **Goal detail** — renders the goal with `<ResourceView>`, lists linked tasks (`Task?focus=Goal/<id>`), and lets you create a new task pre-linked to this goal.
- **Goal create / edit** — `<ResourceEditor>` seeded with a minimal `Goal` skeleton (subject pre-filled from the demo patient).
- **Task detail** — renders the task with `<ResourceView>`, edit and delete actions.
- **Task create / edit** — `<ResourceEditor>` seeded with a minimal `Task` skeleton, pre-linking `focus` to the goal if launched from the goal detail page.

All CRUD flows through `useCreateResource`, `useUpdateResource`, and `useDeleteResource`. Mutations auto-invalidate the relevant queries via TanStack Query.

## How it uses react-fhir

| react-fhir export | Used for |
| --- | --- |
| `useResource` | Loading a single Goal, Task, or Patient |
| `useSearch` | Goal list for a patient; Task list for a goal |
| `useCreateResource`, `useUpdateResource`, `useDeleteResource` | All mutations |
| `<ResourceView>` | Goal and Task detail rendering (spec-driven, no custom field code) |
| `<ResourceEditor>` | Goal and Task create/edit forms (spec-driven, seeded with a skeleton) |
| `FetchFhirClient` / `FhirClientProvider` | Wired in `main.tsx`; switches between MSW mock and a real server via env var |

The app adds only what's domain-specific on top: route structure, status badge helpers (`helpers.ts`), and a hardcoded demo patient ID (stand-in for a SMART launch context).

## App structure

```
apps/goals-tasks/src/
├── App.tsx           # routes: /, /Goal/:id, /Goal/:id/edit, /Goal/new, /Task/:id, …
├── main.tsx          # React root, QueryClientProvider, FhirClientProvider
├── config.ts         # env var reading, demo patient ID, hash-router flag
├── helpers.ts        # patientLabel(), statusPillClass()
│
├── pages/
│   ├── PatientOverviewPage.tsx   # patient header + goal list
│   ├── GoalDetailPage.tsx        # ResourceView + linked task list
│   ├── GoalEditorPage.tsx        # ResourceEditor (create + edit)
│   ├── TaskDetailPage.tsx        # ResourceView + edit/delete
│   └── TaskEditorPage.tsx        # ResourceEditor (create + edit)
│
└── mocks/            # MSW handlers for offline dev
```

## Running locally

```bash
# from repo root
pnpm install
pnpm --filter @fhir-place/goals-tasks dev   # Vite dev server, MSW mock active by default
```

To point at a real FHIR server:

```bash
VITE_USE_MOCK=false VITE_FHIR_BASE_URL=https://hapi.fhir.org/baseR4 \
  pnpm --filter @fhir-place/goals-tasks dev
```

The demo patient is hardcoded as `demo-patient`. A real deployment would replace this with a patient ID from SMART launch context or a patient-picker flow.

```bash
pnpm --filter @fhir-place/goals-tasks e2e   # Playwright screenshots
```
