import { useResource, useSearch } from "@fhir-place/react-fhir";
import type { Goal, Patient } from "fhir/r4";
import { Link } from "react-router-dom";
import { DEMO_PATIENT_ID } from "../config.js";
import { patientLabel, statusPillClass } from "../helpers.js";

export function PatientOverviewPage() {
  const { data: patient, isLoading } = useResource<Patient>("Patient", DEMO_PATIENT_ID);
  const { data: goalBundle } = useSearch<Goal>("Goal", {
    patient: DEMO_PATIENT_ID,
  });

  const goals =
    goalBundle?.entry?.flatMap((e) => (e.resource ? [e.resource] : [])) ?? [];

  return (
    <div className="space-y-6">
      <section className="rounded border border-slate-200 bg-white p-4 shadow-sm">
        {isLoading && <p className="text-sm text-slate-500">Loading patient…</p>}
        {patient && (
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                {patientLabel(patient)}
              </h1>
              <p className="text-sm text-slate-500">
                {patient.gender ?? "—"} · born {patient.birthDate ?? "—"}
              </p>
            </div>
            <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
              {patient.id}
            </code>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Goals</h2>
            <p className="text-sm text-slate-500">
              {goalBundle
                ? `${goalBundle.total ?? goals.length} total`
                : "Loading…"}
            </p>
          </div>
          <Link
            to="/Goal/new"
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
            data-testid="new-goal"
          >
            + New goal
          </Link>
        </div>

        <ul className="divide-y divide-slate-200 rounded border border-slate-200 bg-white">
          {goals.map((g) => (
            <li key={g.id} data-testid="goal-row">
              <Link
                to={`/Goal/${g.id}`}
                className="flex flex-col gap-1 px-4 py-3 hover:bg-slate-50 sm:flex-row sm:items-baseline sm:justify-between"
              >
                <span className="font-medium text-slate-900">
                  {g.description?.text ?? "(no description)"}
                </span>
                <span className={statusPillClass(g.lifecycleStatus)}>
                  {g.lifecycleStatus}
                </span>
              </Link>
            </li>
          ))}
          {goals.length === 0 && goalBundle && (
            <li className="px-4 py-6 text-center text-sm text-slate-500">
              No goals yet — <Link to="/Goal/new" className="underline">create one</Link>.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
