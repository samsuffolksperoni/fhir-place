import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { getConnection, testConnection } from "../api/connections.js";
import { ConnectionStatusBadge } from "../components/ConnectionStatusBadge.js";

export function ConnectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const conn = useQuery({
    queryKey: ["connections", id],
    queryFn: () => getConnection(id!),
    enabled: Boolean(id),
  });

  const test = useMutation({
    mutationFn: () => testConnection(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connections"] });
      qc.invalidateQueries({ queryKey: ["connections", id] });
    },
  });

  if (!id) return null;

  return (
    <section className="space-y-4">
      <Link
        to="/connections"
        className="text-sm text-slate-600 hover:underline"
      >
        ← All connections
      </Link>

      {conn.isLoading && <p className="text-sm text-slate-500">Loading…</p>}
      {conn.isError && (
        <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {(conn.error as Error).message}
        </p>
      )}

      {conn.data && (
        <>
          <header className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold text-slate-900">
                  {conn.data.name}
                </h1>
                <ConnectionStatusBadge connection={conn.data} />
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {conn.data.kind} · {conn.data.authType}
                {conn.data.hasAuthToken ? " (token)" : ""}
              </p>
              <p className="mt-1 break-all font-mono text-xs text-slate-500">
                {conn.data.baseUrl}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link
                to={`/connections/${id}/patients`}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                data-testid="browse-patients"
              >
                Browse patients
              </Link>
              <button
                type="button"
                onClick={() => test.mutate()}
                disabled={test.isPending}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                data-testid="test-connection"
              >
                {test.isPending ? "Testing…" : "Test connection"}
              </button>
            </div>
          </header>

          <section className="rounded-md border border-slate-200 bg-white p-4 text-sm">
            <h2 className="mb-2 text-base font-semibold text-slate-900">
              CapabilityStatement
            </h2>
            {conn.data.lastCapabilityStatus === null && (
              <p className="text-slate-500">
                Not tested yet. Click <strong>Test connection</strong> to fetch{" "}
                <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
                  /metadata
                </code>
                .
              </p>
            )}
            {conn.data.lastCapabilityStatus === "ok" && (
              <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1">
                <dt className="text-slate-500">Fetched</dt>
                <dd>{conn.data.lastCapabilityAt}</dd>
                <dt className="text-slate-500">FHIR version</dt>
                <dd>{conn.data.lastCapabilityFhirVersion ?? "—"}</dd>
                <dt className="text-slate-500">Software</dt>
                <dd>{conn.data.lastCapabilitySoftware ?? "—"}</dd>
              </dl>
            )}
            {conn.data.lastCapabilityStatus === "error" && (
              <div className="space-y-1">
                <p className="text-rose-700">{conn.data.lastCapabilityError}</p>
                <p className="text-xs text-slate-500">
                  Last attempt: {conn.data.lastCapabilityAt}
                </p>
              </div>
            )}
          </section>

          {conn.data.lastCapabilityJson && (
            <details className="rounded-md border border-slate-200 bg-white p-3 text-sm">
              <summary className="cursor-pointer text-slate-700">
                Raw CapabilityStatement
              </summary>
              <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-all rounded bg-slate-50 p-2 text-xs text-slate-700">
                {pretty(conn.data.lastCapabilityJson)}
              </pre>
            </details>
          )}
        </>
      )}
    </section>
  );
}

function pretty(json: string): string {
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
}
