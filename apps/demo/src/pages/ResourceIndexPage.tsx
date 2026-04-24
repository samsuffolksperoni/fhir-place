import {
  ResourceSearch,
  ResourceTable,
  useInfiniteSearch,
} from "@fhir-place/react-fhir";
import type { Resource } from "fhir/r4";
import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { SearchParams } from "@fhir-place/react-fhir";
import { PATIENT_COMPARTMENT } from "../compartment.js";

/**
 * Generic index page for a resource type (non-Patient). Reads `?patient=<id>`
 * from the URL to scope searches; otherwise lists every resource of the type.
 *
 * Shows: <ResourceSearch> (driven by CapabilityStatement) → <ResourceTable>
 * with sensible default columns → Load more via useInfiniteSearch. Rows link
 * through to the generic detail page at /:resourceType/:id.
 */
export function ResourceIndexPage() {
  const { resourceType = "" } = useParams();
  const [query] = useSearchParams();
  const navigate = useNavigate();
  const patientId = query.get("patient") ?? undefined;

  const [params, setParams] = useState<SearchParams>({
    _count: 20,
    ...(patientId ? { patient: patientId } : {}),
  });

  const {
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteSearch<Resource>(resourceType, params);

  const resources =
    data?.pages.flatMap(
      (b) => b.entry?.flatMap((e) => (e.resource ? [e.resource] : [])) ?? [],
    ) ?? [];
  const totalAdvertised = data?.pages[0]?.total;

  const columnConfig = PATIENT_COMPARTMENT.find(
    (c) => c.resourceType === resourceType,
  );
  const columns = columnConfig?.columns ?? ["status", "code.text"];
  const columnLabels = columnConfig?.columnLabels;

  return (
    <div className="space-y-4">
      <nav className="flex items-center justify-between gap-2 text-sm">
        {patientId ? (
          <Link to={`/Patient/${patientId}`} className="text-slate-500 underline">
            ← Back to patient
          </Link>
        ) : (
          <Link to="/Patient" className="text-slate-500 underline">
            ← All patients
          </Link>
        )}
      </nav>

      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">{resourceType}</h1>
          <p className="text-sm text-slate-500">
            {data
              ? totalAdvertised !== undefined
                ? `${resources.length} of ${totalAdvertised}`
                : `${resources.length} loaded`
              : "…"}
            {patientId && (
              <>
                {" "}· scoped to <code className="rounded bg-slate-100 px-1">Patient/{patientId}</code>
              </>
            )}
          </p>
        </div>
      </div>

      <ResourceSearch
        resourceType={resourceType}
        initialVisible={6}
        onSubmit={(p) =>
          setParams({ _count: 20, ...(patientId ? { patient: patientId } : {}), ...p })
        }
      />

      {isError && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {(error as Error)?.message ?? "Search failed"}
        </p>
      )}
      {isLoading && <p className="text-sm text-slate-500">Loading…</p>}

      {resources.length > 0 ? (
        <ResourceTable
          resources={resources}
          columns={columns}
          columnLabels={columnLabels}
          onRowClick={(r) => r.id && navigate(`/${r.resourceType}/${r.id}`)}
        />
      ) : (
        !isLoading && (
          <p className="rounded border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            No {resourceType.toLowerCase()} records match.
          </p>
        )
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
