import { useSearch } from "@fhir-place/react-fhir";
import type { Patient } from "fhir/r4";
import { useState } from "react";
import { Link } from "react-router-dom";

const formatName = (p: Patient): string => {
  const n = p.name?.[0];
  if (!n) return "(no name)";
  if (n.text) return n.text;
  return [n.given?.join(" "), n.family].filter(Boolean).join(" ");
};

export function PatientListPage() {
  const [query, setQuery] = useState("");
  const { data, isLoading, isError, error } = useSearch<Patient>("Patient", {
    _count: 20,
    ...(query ? { name: query } : {}),
  });

  const patients =
    data?.entry?.flatMap((e) => (e.resource ? [e.resource] : [])) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Patients</h1>
        <span className="text-sm text-slate-500">
          {data ? `${data.total ?? patients.length} total` : "…"}
        </span>
      </div>
      <input
        data-testid="patient-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name…"
        className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
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
