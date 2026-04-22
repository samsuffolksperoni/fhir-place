import { ResourceSearch, useSearch } from "@fhir-place/react-fhir";
import type { Patient } from "fhir/r4";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { SearchParams } from "@fhir-place/react-fhir";

const formatName = (p: Patient): string => {
  const n = p.name?.[0];
  if (!n) return "(no name)";
  if (n.text) return n.text;
  return [n.given?.join(" "), n.family].filter(Boolean).join(" ");
};

export function PatientListPage() {
  const [params, setParams] = useState<SearchParams>({ _count: 20 });
  const { data, isLoading, isError, error } = useSearch<Patient>("Patient", params);

  const patients =
    data?.entry?.flatMap((e) => (e.resource ? [e.resource] : [])) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Patients</h1>
          <p className="text-sm text-slate-500">
            {data ? `${data.total ?? patients.length} total` : "…"}
          </p>
        </div>
        <Link
          to="/Patient/new"
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          data-testid="create-patient"
        >
          + New patient
        </Link>
      </div>

      <ResourceSearch
        resourceType="Patient"
        initialVisible={6}
        priorityParams={["name", "family", "given", "gender", "birthdate", "address-city"]}
        onSubmit={(p) => setParams({ _count: 20, ...p })}
      />

      {isError && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {(error as Error)?.message ?? "Search failed"}
        </p>
      )}

      {isLoading && <p className="text-sm text-slate-500">Loading…</p>}

      <ul className="divide-y divide-slate-200 rounded border border-slate-200 bg-white">
        {patients.map((p) => (
          <li key={p.id} data-testid="patient-row">
            <Link
              to={`/Patient/${p.id}`}
              className="flex items-baseline justify-between gap-4 px-4 py-3 hover:bg-slate-50"
            >
              <span className="font-medium text-slate-900">{formatName(p)}</span>
              <span className="text-xs text-slate-500">
                {p.gender ?? "—"} · {p.birthDate ?? "—"} ·{" "}
                <code className="rounded bg-slate-100 px-1 py-0.5">{p.id}</code>
              </span>
            </Link>
          </li>
        ))}
        {!isLoading && patients.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-slate-500">
            No patients match.
          </li>
        )}
      </ul>
    </div>
  );
}
