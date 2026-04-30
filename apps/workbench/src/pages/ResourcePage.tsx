import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  ALLOWED_RESOURCE_TYPES,
  readResource,
  type AllowedResourceType,
} from "../api/fhir.js";

export function ResourcePage() {
  const { cid, pid, resourceType, resourceId } = useParams<{
    cid: string;
    pid: string;
    resourceType: string;
    resourceId: string;
  }>();

  const isAllowed = ALLOWED_RESOURCE_TYPES.includes(
    resourceType as AllowedResourceType,
  );

  const resource = useQuery({
    queryKey: ["resource", cid, resourceType, resourceId],
    queryFn: () =>
      readResource(cid!, resourceType as AllowedResourceType, resourceId!),
    enabled: Boolean(cid && resourceId && isAllowed),
  });

  if (!cid || !resourceType || !resourceId) return null;

  return (
    <section className="space-y-4">
      <Link
        to={pid ? `/connections/${cid}/patients/${pid}` : `/connections/${cid}`}
        className="text-sm text-slate-600 hover:underline"
      >
        ← Back
      </Link>

      <header className="flex items-baseline gap-2">
        <h1 className="text-2xl font-semibold text-slate-900">{resourceType}</h1>
        <span className="font-mono text-sm text-slate-500">/{resourceId}</span>
      </header>

      {!isAllowed && (
        <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          Resource type not in Phase A allow-list: {resourceType}
        </p>
      )}

      {resource.isLoading && (
        <p className="text-sm text-slate-500">Loading…</p>
      )}
      {resource.isError && (
        <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {(resource.error as Error).message}
        </p>
      )}
      {resource.data && (
        <pre
          data-testid="resource-json"
          className="max-h-[70vh] overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800"
        >
          {JSON.stringify(resource.data, null, 2)}
        </pre>
      )}
    </section>
  );
}
