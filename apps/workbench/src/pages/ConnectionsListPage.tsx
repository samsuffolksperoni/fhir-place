import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  deleteConnection,
  listConnections,
  testConnection,
} from "../api/connections.js";
import { ConnectionStatusBadge } from "../components/ConnectionStatusBadge.js";

export function ConnectionsListPage() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["connections"],
    queryFn: listConnections,
  });

  const test = useMutation({
    mutationFn: (id: string) => testConnection(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connections"] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteConnection(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connections"] }),
  });

  return (
    <section className="space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">FHIR connections</h1>
          <p className="mt-1 text-sm text-slate-600">
            Configured FHIR servers the workbench can read from. Synthetic data only.
          </p>
        </div>
        <Link
          to="/connections/new"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          data-testid="new-connection"
        >
          New connection
        </Link>
      </header>

      {list.isLoading && <p className="text-sm text-slate-500">Loading…</p>}
      {list.isError && (
        <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          Could not load connections: {(list.error as Error).message}
        </p>
      )}

      {list.data && list.data.length === 0 && (
        <div className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
          No connections yet.{" "}
          <Link to="/connections/new" className="font-medium text-slate-900 underline">
            Add one
          </Link>{" "}
          to point the workbench at a synthetic FHIR server.
        </div>
      )}

      {list.data && list.data.length > 0 && (
        <ul className="space-y-2">
          {list.data.map((conn) => (
            <li
              key={conn.id}
              data-testid="connection-row"
              className="rounded-md border border-slate-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/connections/${conn.id}`}
                      className="text-base font-semibold text-slate-900 hover:underline"
                    >
                      {conn.name}
                    </Link>
                    <ConnectionStatusBadge connection={conn} />
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {conn.kind} · {conn.authType}
                    {conn.hasAuthToken ? " (token)" : ""} · {conn.baseUrl}
                  </p>
                  {conn.lastCapabilityStatus === "ok" && (
                    <p className="mt-1 text-xs text-slate-500">
                      FHIR {conn.lastCapabilityFhirVersion ?? "?"} ·{" "}
                      {conn.lastCapabilitySoftware ?? "unknown server"}
                    </p>
                  )}
                  {conn.lastCapabilityStatus === "error" && (
                    <p className="mt-1 text-xs text-rose-700">
                      last error: {conn.lastCapabilityError}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => test.mutate(conn.id)}
                    disabled={test.isPending}
                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {test.isPending && test.variables === conn.id ? "Testing…" : "Test"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Delete "${conn.name}"?`)) remove.mutate(conn.id);
                    }}
                    className="rounded-md border border-rose-200 bg-white px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
