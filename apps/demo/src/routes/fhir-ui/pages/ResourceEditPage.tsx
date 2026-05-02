import {
  ResourceEditor,
  useResource,
  useUpdateResource,
} from "@fhir-place/react-fhir";
import type { Resource } from "fhir/r4";
import { Link, useNavigate, useParams } from "react-router-dom";

export function ResourceEditPage() {
  const { resourceType = "", id = "" } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useResource<Resource>(resourceType, id);
  const update = useUpdateResource<Resource>();

  return (
    <div className="space-y-4">
      <nav className="text-sm text-slate-500">
        <Link to={`/${resourceType}/${id}`} className="underline">
          ← Back to {resourceType}/{id}
        </Link>
      </nav>
      {isLoading && <p className="text-sm text-slate-500">Loading…</p>}
      {data && (
        <ResourceEditor
          resource={data}
          saveLabel="Save changes"
          saving={update.isPending}
          onCancel={() => navigate(`/${resourceType}/${id}`)}
          onSave={async (draft) => {
            await update.mutateAsync(draft as Resource & { id: string });
            navigate(`/${resourceType}/${id}`);
          }}
          className="space-y-4 rounded border border-slate-200 bg-white p-4 shadow-sm"
        />
      )}
      {update.isError && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {(update.error as Error)?.message}
        </p>
      )}
    </div>
  );
}
