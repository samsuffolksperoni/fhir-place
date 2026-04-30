export function HomePage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">
          FHIR Agent Workbench
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          A research workbench for evidence-backed agent answers grounded in
          synthetic FHIR data.
        </p>
      </header>

      <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-700">
        <p>
          This is the Phase A skeleton. Patient search, the typed FHIR tool
          registry, and the patient-summary agent land in subsequent PRs.
        </p>
        <p className="mt-2">
          See{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
            TASKS.md
          </code>{" "}
          at the repo root for the Phase A backlog.
        </p>
      </div>

      <ul
        data-testid="phase-a-checklist"
        className="space-y-1 text-sm text-slate-600"
      >
        <li>· Read-only against a configured FHIR server</li>
        <li>· Synthetic data only</li>
        <li>· Typed, patient-scoped FHIR tools (deny-by-default)</li>
        <li>· Evidence-backed structured answers</li>
        <li>· Persisted tool calls and final answers</li>
      </ul>
    </section>
  );
}
