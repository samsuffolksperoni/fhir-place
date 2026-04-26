import {
  ColumnPicker,
  ResourceSearch,
  ResourceTable,
  useInfiniteSearch,
} from "@fhir-place/react-fhir";
import type { Patient } from "fhir/r4";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { SearchParams } from "@fhir-place/react-fhir";
import { PatientRowCounts } from "../components/PatientRowCounts.js";

const formatName = (p: Patient): string => {
  const n = p.name?.[0];
  if (!n) return "(no name)";
  if (n.text) return n.text;
  return [n.given?.join(" "), n.family].filter(Boolean).join(" ");
};

type Layout = "list" | "table";
const LAYOUT_KEY = "fhir-place-demo-patient-layout";
const COLUMN_KEY = "fhir-place-demo-patient-columns";

const TABLE_COLUMNS: Array<{ path: string; label: string }> = [
  { path: "name", label: "Name" },
  { path: "gender", label: "Gender" },
  { path: "birthDate", label: "Birth date" },
  { path: "address.city", label: "City" },
  { path: "id", label: "ID" },
];

const readLayout = (): Layout => {
  if (typeof window === "undefined") return "list";
  const v = window.localStorage.getItem(LAYOUT_KEY);
  return v === "table" ? "table" : "list";
};

export function PatientListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  // Initial params come from the URL so reload / share keeps the active
  // filter. `_count` is a non-user pagination knob and stays out of the URL.
  const initialFilters = useMemo(
    () => Object.fromEntries(searchParams),
    // Read once on mount; subsequent changes flow through the form, not the
    // URL. Re-deriving on every URL change would clobber in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [params, setParams] = useState<SearchParams>({
    _count: 20,
    ...initialFilters,
  });
  const [layout, setLayout] = useState<Layout>(readLayout);
  const [columns, setColumns] = useState<string[]>(() =>
    TABLE_COLUMNS.map((c) => c.path),
  );
  const navigate = useNavigate();

  const onSearchSubmit = (next: SearchParams) => {
    setParams({ _count: 20, ...next });
    const stringified: Record<string, string> = {};
    for (const [k, v] of Object.entries(next)) {
      if (v !== undefined && v !== null && v !== "") stringified[k] = String(v);
    }
    setSearchParams(stringified, { replace: true });
  };
  const {
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteSearch<Patient>("Patient", params);

  const patients =
    data?.pages.flatMap(
      (b) => b.entry?.flatMap((e) => (e.resource ? [e.resource] : [])) ?? [],
    ) ?? [];
  const totalAdvertised = data?.pages[0]?.total;

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LAYOUT_KEY, layout);
  }, [layout]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Patients</h1>
          <p className="text-sm text-slate-500">
            {data
              ? totalAdvertised !== undefined
                ? `${patients.length} of ${totalAdvertised}`
                : `${patients.length} loaded`
              : "…"}
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
        initialParams={initialFilters}
        onSubmit={onSearchSubmit}
      />

      <div className="flex items-center justify-between gap-2">
        <div
          role="group"
          aria-label="Layout"
          className="inline-flex rounded border border-slate-300 bg-white text-sm shadow-sm"
        >
          <button
            type="button"
            onClick={() => setLayout("list")}
            aria-pressed={layout === "list"}
            data-testid="layout-list"
            className={`rounded-l px-3 py-1 ${layout === "list" ? "bg-slate-100 font-medium text-slate-900" : "text-slate-600 hover:bg-slate-50"}`}
          >
            List view
          </button>
          <button
            type="button"
            onClick={() => setLayout("table")}
            aria-pressed={layout === "table"}
            data-testid="layout-table"
            className={`rounded-r border-l border-slate-300 px-3 py-1 ${layout === "table" ? "bg-slate-100 font-medium text-slate-900" : "text-slate-600 hover:bg-slate-50"}`}
          >
            Table view
          </button>
        </div>
        {layout === "table" && (
          <ColumnPicker
            options={TABLE_COLUMNS}
            onChange={setColumns}
            storageKey={COLUMN_KEY}
          />
        )}
      </div>

      {isError && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {(error as Error)?.message ?? "Search failed"}
        </p>
      )}

      {isLoading && <p className="text-sm text-slate-500">Loading…</p>}

      {layout === "list" ? (
        <ul className="divide-y divide-slate-200 rounded border border-slate-200 bg-white">
          {patients.map((p) => (
            <li key={p.id} data-testid="patient-row">
              <Link
                to={`/Patient/${p.id}`}
                className="flex flex-col gap-1 px-4 py-3 hover:bg-slate-50"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-medium text-slate-900">{formatName(p)}</span>
                  <span className="text-xs text-slate-500">
                    {p.gender ?? "—"} · {p.birthDate ?? "—"} ·{" "}
                    <code className="rounded bg-slate-100 px-1 py-0.5">{p.id}</code>
                  </span>
                </div>
                {p.id && <PatientRowCounts patientId={p.id} />}
              </Link>
            </li>
          ))}
          {!isLoading && patients.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-slate-500">
              No patients match.
            </li>
          )}
        </ul>
      ) : (
        <ResourceTable<Patient>
          resources={patients}
          columns={TABLE_COLUMNS.map((c) => c.path).filter((p) => columns.includes(p))}
          columnLabels={Object.fromEntries(TABLE_COLUMNS.map((c) => [c.path, c.label]))}
          onRowClick={(p) => navigate(`/Patient/${p.id}`)}
          emptyState={
            <p className="px-4 py-6 text-center text-sm text-slate-500">
              No patients match.
            </p>
          }
        />
      )}

      {hasNextPage && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            data-testid="load-more"
            className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
