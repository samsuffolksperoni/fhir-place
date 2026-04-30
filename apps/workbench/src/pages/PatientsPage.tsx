import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  bundleEntries,
  searchPatients,
  type PatientSearchParams,
} from "../api/fhir.js";
import { getConnection } from "../api/connections.js";
import { patientDisplayName } from "../components/PatientName.js";
import type { Patient } from "fhir/r4";

export function PatientsPage() {
  const { cid } = useParams<{ cid: string }>();
  const [params, setParams] = useSearchParams();

  const initial: PatientSearchParams = {
    name: params.get("name") ?? "",
    identifier: params.get("identifier") ?? "",
    birthdate: params.get("birthdate") ?? "",
    gender: params.get("gender") ?? "",
  };

  const [draft, setDraft] = useState<PatientSearchParams>(initial);

  const conn = useQuery({
    queryKey: ["connections", cid],
    queryFn: () => getConnection(cid!),
    enabled: Boolean(cid),
  });

  const search = useQuery({
    queryKey: ["patients", cid, params.toString()],
    queryFn: () => searchPatients(cid!, initial),
    enabled: Boolean(cid),
  });

  if (!cid) return null;
  const patients = bundleEntries<Patient>(search.data);

  return (
    <section className="space-y-4">
      <Link
        to={`/connections/${cid}`}
        className="text-sm text-slate-600 hover:underline"
      >
        ← Back to connection
      </Link>

      <header>
        <h1 className="text-2xl font-semibold text-slate-900">
          Patients{conn.data ? ` · ${conn.data.name}` : ""}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Synthetic data only. Search the configured FHIR server for a patient
          to inspect.
        </p>
      </header>

      <form
        className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          const next = new URLSearchParams();
          if (draft.name) next.set("name", draft.name);
          if (draft.identifier) next.set("identifier", draft.identifier);
          if (draft.birthdate) next.set("birthdate", draft.birthdate);
          if (draft.gender) next.set("gender", draft.gender);
          setParams(next, { replace: true });
        }}
      >
        <Field label="Name" htmlFor="name">
          <input
            id="name"
            value={draft.name ?? ""}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Hopper"
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </Field>
        <Field label="Identifier" htmlFor="identifier">
          <input
            id="identifier"
            value={draft.identifier ?? ""}
            onChange={(e) => setDraft({ ...draft, identifier: e.target.value })}
            placeholder="MRN-123 or system|value"
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </Field>
        <Field label="Birthdate" htmlFor="birthdate">
          <input
            id="birthdate"
            type="date"
            value={draft.birthdate ?? ""}
            onChange={(e) => setDraft({ ...draft, birthdate: e.target.value })}
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          />
        </Field>
        <Field label="Gender" htmlFor="gender">
          <select
            id="gender"
            value={draft.gender ?? ""}
            onChange={(e) => setDraft({ ...draft, gender: e.target.value })}
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option value="">any</option>
            <option value="male">male</option>
            <option value="female">female</option>
            <option value="other">other</option>
            <option value="unknown">unknown</option>
          </select>
        </Field>
        <div className="sm:col-span-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setDraft({ name: "", identifier: "", birthdate: "", gender: "" });
              setParams(new URLSearchParams(), { replace: true });
            }}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Clear
          </button>
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            Search
          </button>
        </div>
      </form>

      {search.isLoading && <p className="text-sm text-slate-500">Searching…</p>}
      {search.isError && (
        <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {(search.error as Error).message}
        </p>
      )}

      {search.data && patients.length === 0 && (
        <p className="rounded-md border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
          No patients matched.
        </p>
      )}

      {patients.length > 0 && (
        <ul className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
          {patients.map((p) => (
            <li key={p.id} data-testid="patient-row">
              <Link
                to={`/connections/${cid}/patients/${p.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">
                    {patientDisplayName(p)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {p.gender ?? "—"} · born {p.birthDate ?? "—"} · id {p.id}
                  </p>
                </div>
                <span className="text-xs text-slate-400">view →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}
